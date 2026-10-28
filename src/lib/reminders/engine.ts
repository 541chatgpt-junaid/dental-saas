import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, REVIEW_COOLDOWN_MS, TOO_LATE_MS, addDays, localDate, plan, slotOf, zonedInstant, type Kind, type Settings } from "./schedule";
import { messageBody, templateName, templateParams, type Ctx } from "./messages";
import { loadConnection, sendWhatsApp } from "./whatsapp";

// The scheduler. Each run is safe to repeat and safe to run twice at once:
//  1. plan: write one outbox row per (appointment, kind, booked time);
//  2. send: for rows now due, re-check everything (consent, status, link), then
//     send through the clinic's WhatsApp API, or leave "ready" for a one-tap send.
// Nothing is sent to a patient without contact consent on record.

const MAX_ATTEMPTS = 3;
const SLICE = 100;

export interface RunReport { clinics: number; planned: number; sent: number; ready: number; skipped: number; failed: number }
const empty = (): RunReport => ({ clinics: 0, planned: 0, sent: 0, ready: 0, skipped: 0, failed: 0 });

interface ApptRow { id: number; patient_id: number | null; patient_name: string; doctor_name: string | null; date: string; time: string; status: string; phone: string | null }
interface PatientRow { id: number; name: string; phone: string | null; contact_consent: boolean }

export async function loadSettings(db: SupabaseClient, clinicId: string): Promise<Settings> {
  const { data } = await db.from("reminder_settings").select("*").eq("clinic_id", clinicId).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data || {}) } as Settings;
}

export async function runAll(db: SupabaseClient, origin: string, now = Date.now()): Promise<RunReport> {
  const total = empty();
  const { data: rows } = await db.from("reminder_settings").select("clinic_id").eq("enabled", true);
  for (const r of rows || []) {
    try {
      const rep = await runClinic(db, r.clinic_id, origin, now);
      for (const k of Object.keys(total) as (keyof RunReport)[]) total[k] += rep[k];
      total.clinics += 1;
    } catch (e) { console.error("Reminder run failed for a clinic:", e instanceof Error ? e.message : e); }
  }
  return total;
}

export async function runClinic(db: SupabaseClient, clinicId: string, origin: string, now = Date.now()): Promise<RunReport> {
  const rep = empty();
  const s = await loadSettings(db, clinicId);
  if (!s.enabled) return rep;

  // ── 1. PLAN ──────────────────────────────────────────────
  const today = localDate(now, s.timezone);
  const { data: appts } = await db.from("appointments").select("id, patient_id, patient_name, doctor_name, date, time, status, phone")
    .eq("clinic_id", clinicId).gte("date", addDays(today, -4)).lte("date", addDays(today, 3)).in("status", ["Scheduled", "Completed", "No-show"]).not("patient_id", "is", null);
  const planned: { kind: Kind; appt: ApptRow; due: number }[] = [];
  for (const a of (appts || []) as ApptRow[]) for (const p of plan(a, s, now)) planned.push({ kind: p.kind, appt: a, due: p.due });
  if (planned.length) {
    const { data: ins } = await db.from("message_outbox").upsert(planned.map(p => ({
      clinic_id: clinicId, patient_id: p.appt.patient_id, appointment_id: p.appt.id, kind: p.kind, slot: slotOf(p.appt),
      due_at: new Date(p.due).toISOString(), token: randomBytes(24).toString("base64url"),
    })), { onConflict: "appointment_id,kind,slot", ignoreDuplicates: true }).select("id");
    rep.planned = ins?.length ?? 0;
    // A change in Settings moves messages that are still waiting
    const { data: waiting } = await db.from("message_outbox").select("id, appointment_id, kind, slot, due_at").eq("clinic_id", clinicId).eq("status", "pending").in("appointment_id", [...new Set(planned.map(p => p.appt.id))]);
    for (const w of waiting || []) {
      const want = planned.find(p => p.appt.id === w.appointment_id && p.kind === w.kind && slotOf(p.appt) === w.slot);
      if (want && new Date(w.due_at).getTime() !== want.due) await db.from("message_outbox").update({ due_at: new Date(want.due).toISOString() }).eq("id", w.id).eq("status", "pending");
    }
  }

  // ── 2. SEND ──────────────────────────────────────────────
  const { data: due } = await db.from("message_outbox").select("*").eq("clinic_id", clinicId).eq("status", "pending").lte("due_at", new Date(now).toISOString()).order("due_at").limit(SLICE);
  if (!due?.length) return rep;
  const wa = await loadConnection(db, clinicId);
  const { data: clinic } = await db.from("clinics").select("name, phone").eq("id", clinicId).maybeSingle();
  const { data: booking } = await db.from("booking_settings").select("slug, enabled").eq("clinic_id", clinicId).maybeSingle();

  for (const row of due) {
    // Claim the row so a second run at the same moment cannot also send it
    const { data: claimed } = await db.from("message_outbox").update({ attempts: row.attempts + 1 }).eq("id", row.id).eq("status", "pending").eq("attempts", row.attempts).select("id");
    if (!claimed?.length) continue;
    const finish = async (patch: Record<string, unknown>) => { await db.from("message_outbox").update(patch).eq("id", row.id); };
    const skip = async (reason: string) => { await finish({ status: "skipped", reason }); rep.skipped++; };

    const [{ data: a }, { data: p }] = await Promise.all([
      db.from("appointments").select("id, patient_id, patient_name, doctor_name, date, time, status, phone").eq("id", row.appointment_id).maybeSingle(),
      db.from("patients").select("id, name, phone, contact_consent").eq("id", row.patient_id).maybeSingle(),
    ]);
    const appt = a as ApptRow | null, patient = p as PatientRow | null;
    if (!appt || !patient) { await skip("record_removed"); continue; }

    // Consent first: no consent on record, nothing goes out
    if (patient.contact_consent !== true) { await skip("no_consent"); continue; }
    const phone = (appt.phone || patient.phone || "").trim();
    if (phone.replace(/\D/g, "").length < 7) { await skip("no_phone"); continue; }

    const kind = row.kind as Kind;
    const start = zonedInstant(appt.date, appt.time, s.timezone) ?? 0;
    if (kind === "reminder_day_before" || kind === "reminder_same_day") {
      if (slotOf(appt) !== row.slot) { await skip("rescheduled"); continue; }
      if (appt.status !== "Scheduled") { await skip("not_scheduled"); continue; }
      if (start - now < TOO_LATE_MS) { await skip("too_late"); continue; }
      // The day-before message makes no sense once it is the day itself, or once the same-day one is due
      if (kind === "reminder_day_before" && (localDate(now, s.timezone) >= appt.date || (s.same_day_on && now >= start - s.same_day_hours * 3_600_000))) { await skip("superseded"); continue; }
    } else if (kind === "noshow_followup") {
      // Judged on the clinic's own clock, the same rule the app uses for the No-show badge
      if (slotOf(appt) !== row.slot || (appt.status !== "Scheduled" && appt.status !== "No-show") || start >= now) { await skip("not_a_no_show"); continue; }
    } else {
      // Review request: a completed visit only, never a no-show
      if (appt.status !== "Completed") { await skip("not_completed"); continue; }
      if (!s.google_review_url) { await skip("no_review_link"); continue; }
      const { count } = await db.from("message_outbox").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).eq("kind", "review_request").in("status", ["sent", "ready"]).gte("created_at", new Date(now - REVIEW_COOLDOWN_MS).toISOString());
      if (count) { await skip("asked_recently"); continue; }
    }

    const ctx: Ctx = {
      name: patient.name || appt.patient_name, clinic: clinic?.name || "our clinic", clinicPhone: clinic?.phone ?? null, date: appt.date, time: appt.time, doctor: appt.doctor_name || null,
      reviewUrl: s.google_review_url, rebookUrl: booking?.enabled && booking.slug ? `${origin}/book/${booking.slug}` : null, optOutUrl: `${origin}/m/${row.token}`,
    };
    const body = messageBody(kind, ctx);
    if (!wa?.enabled) { await finish({ status: "ready", body, to_phone: phone, reason: null }); rep.ready++; continue; }

    const tpl = templateName(kind, s);
    const r = await sendWhatsApp(wa, phone, tpl ? { template: tpl, lang: s.tpl_lang, params: templateParams(kind, ctx) } : { text: body });
    if (r.ok) { await finish({ status: "sent", sent_at: new Date().toISOString(), sent_via: "whatsapp_api", provider_ref: r.ref, body, to_phone: phone, reason: null }); rep.sent++; }
    else if (row.attempts + 1 >= MAX_ATTEMPTS) { await finish({ status: "failed", reason: r.error, body, to_phone: phone }); rep.failed++; }
    else await finish({ reason: r.error });
  }
  return rep;
}
