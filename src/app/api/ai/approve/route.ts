import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";
import { appOrigin } from "@/lib/payments/engine";
import { fail } from "@/lib/ai/guard";
import { slotOf } from "@/lib/reminders/schedule";

// Staff approval of an AI draft. This is the ONLY step that lets AI-drafted text leave the screen:
//  - recall / review request: the approved text is queued as a "ready" message (the same queue,
//    consent rule and stop link as the automatic messages); staff then send it with one tap
//  - review reply / visit note: the approved text is recorded and handed back to the screen
// A draft is approved once, by a member of staff, with the exact text they chose to use.

export async function POST(request: Request) {
  const s = await staffContext();
  if (!s) return fail("Not signed in.", 401);
  const b = await request.json().catch(() => null);
  const text = typeof b?.text === "string" ? b.text.trim().slice(0, 4000) : "";
  if (!text) return fail("There is nothing to approve.");
  const { data: d } = await s.db.from("ai_drafts").select("id, tool, ref, patient_id, status").eq("id", String(b?.draftId ?? "")).eq("clinic_id", s.clinicId).maybeSingle();
  if (!d) return fail("Draft not found.", 404);
  if (d.status !== "draft") return fail("That draft was already approved.", 409);
  const needs = d.tool === "recall" ? "Recalls" : d.tool === "review_request" ? "Appointments" : d.tool === "review_reply" ? "owner" : "Patients";
  if (needs === "owner" ? !s.owner : !s.can(needs)) return fail("You do not have access to approve this.", 403);

  let queued: { id: string; to: string; body: string } | null = null;
  if (d.tool === "recall" || d.tool === "review_request") {
    // consent is checked again at approval: it may have been withdrawn since the draft was made
    const { data: p } = await s.db.from("patients").select("id, phone, contact_consent").eq("id", d.patient_id).eq("clinic_id", s.clinicId).maybeSingle();
    if (!p || p.contact_consent !== true) return fail("This patient has no contact consent on record, so the message cannot be queued.", 409);
    const token = randomBytes(24).toString("base64url");
    const base = { clinic_id: s.clinicId, patient_id: p.id, status: "ready", token, ai_draft_id: d.id };
    if (d.tool === "recall") {
      const { data: r } = await s.db.from("recalls").select("id, phone, status").eq("id", d.ref).eq("clinic_id", s.clinicId).maybeSingle();
      if (!r) return fail("That recall no longer exists.", 404);
      const to = (r.phone || p.phone || "").trim();
      const body = `${text}\n\nTo stop these messages: ${appOrigin(request)}/m/${token}`;
      const { data: row, error } = await s.db.from("message_outbox").insert([{ ...base, kind: "recall_followup", recall_id: r.id, slot: `ai:${d.id}`, due_at: new Date().toISOString(), to_phone: to, body }]).select("id").single();
      if (error || !row) return fail("Could not queue the message. Please try again.", 500);
      queued = { id: row.id, to, body };
    } else {
      const { data: a } = await s.db.from("appointments").select("id, date, time, status, phone").eq("id", Number(d.ref)).eq("clinic_id", s.clinicId).maybeSingle();
      if (!a || a.status !== "Completed") return fail("A review can only be requested after a completed visit.", 409);
      const to = (a.phone || p.phone || "").trim();
      const body = `${text}\n\nTo stop these messages: ${appOrigin(request)}/m/${token}`;
      const slot = slotOf(a);
      const { data: ex } = await s.db.from("message_outbox").select("id, status").eq("appointment_id", a.id).eq("kind", "review_request").eq("slot", slot).maybeSingle();
      if (ex && ex.status !== "pending" && ex.status !== "skipped") return fail("A review request for this visit was already sent or is waiting to be sent.", 409);
      // an automatic request still waiting for its time is replaced by the approved one, so the patient is asked once
      const row = ex
        ? await s.db.from("message_outbox").update({ status: "ready", reason: null, to_phone: to, body, ai_draft_id: d.id, sent_at: null }).eq("id", ex.id).select("id").single()
        : await s.db.from("message_outbox").insert([{ ...base, kind: "review_request", appointment_id: a.id, slot, due_at: new Date().toISOString(), to_phone: to, body }]).select("id").single();
      if (row.error || !row.data) return fail("Could not queue the message. Please try again.", 500);
      queued = { id: row.data.id, to, body };
    }
  }
  const { error } = await s.db.from("ai_drafts").update({ status: "approved", final: { text }, approved_by: s.userId, approved_at: new Date().toISOString() }).eq("id", d.id).eq("status", "draft");
  if (error) return fail("Could not record the approval. Please try again.", 500);
  return NextResponse.json({ success: true, text, queued });
}
