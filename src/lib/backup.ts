import { gunzipSync, gzipSync } from "node:zlib";
import type { SupabaseClient } from "@supabase/supabase-js";

// Scheduled snapshots of a clinic's data, a restore for records deleted by mistake,
// and the full-data export. Server only (service-role client).
//
// A snapshot is a gzip'd JSON file in the PRIVATE "clinic-backups" storage bucket,
// one folder per clinic. Credentials (payment provider keys, WhatsApp token) and
// secret links are never included. Files uploaded to patient records live in their
// own storage and are not copied (the records that point to them are).
// This is a second layer: the database provider's own backups (daily on paid
// plans, point-in-time with the add-on) are what recover a whole lost database.

export const BUCKET = "clinic-backups";
const PAGE = 1000;
const KEEP = 30;

/** Every clinic table that is backed up and exported, parents before children */
export const BACKUP_TABLES = [
  "branches", "doctors", "patients", "appointments", "visits", "prescriptions", "medical_history", "patient_files",
  "recalls", "queue_tokens", "treatment_plans", "treatment_plan_items", "invoices", "invoice_items", "payments",
  "consent_templates", "consent_records", "patient_form_submissions", "expenses", "purchases", "materials", "labs",
  "doctor_payouts", "treatment_presets", "prescription_presets", "booking_settings", "reminder_settings", "settings",
  "staff", "staff_branches", "patient_portal_users", "message_outbox", "payment_attempts", "audit_log", "ai_settings", "ai_drafts",
] as const;

/** Clinic tables deliberately left out: they hold credentials or secret links */
export const NEVER_BACKED_UP = ["clinic_payment_providers", "clinic_whatsapp", "payment_links", "patient_forms", "invoice_counters", "api_rate_limits", "clinic_backups"] as const;

/** What "restore" brings back: records that were deleted. Settings, staff, logins and the audit log are never rewritten. */
export const RESTORE_TABLES = [
  "branches", "doctors", "patients", "appointments", "visits", "prescriptions", "medical_history", "patient_files",
  "recalls", "queue_tokens", "treatment_plans", "treatment_plan_items", "invoices", "invoice_items", "payments",
  "consent_templates", "consent_records", "patient_form_submissions", "expenses", "purchases", "materials", "labs",
  "doctor_payouts", "treatment_presets", "prescription_presets",
] as const;

const ORDER_BY: Record<string, string> = { booking_settings: "clinic_id", reminder_settings: "clinic_id", staff_branches: "staff_id", patient_portal_users: "user_id", ai_settings: "clinic_id" };
const CONFLICT: Record<string, string> = { staff_branches: "staff_id,branch_id" };
/** Columns the database computes itself; they cannot be written back */
const GENERATED: Record<string, string[]> = { invoices: ["balance"], invoice_items: ["total"] };

export interface Snapshot { version: 1; clinic_id: string; taken_at: string; tables: Record<string, Record<string, unknown>[]>; skipped: string[] }

async function readTable(db: SupabaseClient, table: string, clinicId: string): Promise<Record<string, unknown>[] | null> {
  const col = ORDER_BY[table] || "id";
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select("*").eq("clinic_id", clinicId).order(col).range(from, from + PAGE - 1);
    // Only a table this deployment does not have is skipped; any other error stops the backup rather than quietly leaving data out
    if (error) { if (/PGRST205|42P01|Could not find the table|relation .* does not exist/.test(`${error.code} ${error.message}`)) return null; throw new Error(`${table}: ${error.message}`); }
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

export async function snapshotClinic(db: SupabaseClient, clinicId: string): Promise<Snapshot> {
  const tables: Snapshot["tables"] = {}; const skipped: string[] = [];
  for (const t of BACKUP_TABLES) {
    const rows = await readTable(db, t, clinicId);
    if (rows === null) skipped.push(t); else tables[t] = rows;
  }
  return { version: 1, clinic_id: clinicId, taken_at: new Date().toISOString(), tables, skipped };
}

export const countsOf = (s: Snapshot) => Object.fromEntries(Object.entries(s.tables).map(([k, v]) => [k, v.length]));

export async function runBackup(db: SupabaseClient, clinicId: string, kind: "auto" | "manual", userId: string | null) {
  const snap = await snapshotClinic(db, clinicId);
  const body = gzipSync(Buffer.from(JSON.stringify(snap)));
  const path = `${clinicId}/${snap.taken_at.replace(/[:.]/g, "-")}.json.gz`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, body, { contentType: "application/gzip", upsert: false });
  if (upErr) throw new Error(`Could not store the backup: ${upErr.message}`);
  const { data: rec, error } = await db.from("clinic_backups").insert([{ clinic_id: clinicId, kind, path, size_bytes: body.length, row_counts: countsOf(snap), created_by: userId }]).select("id, created_at, kind, size_bytes, row_counts").single();
  if (error) { await db.storage.from(BUCKET).remove([path]); throw new Error("Could not record the backup."); }
  await prune(db, clinicId);
  return rec;
}

async function prune(db: SupabaseClient, clinicId: string) {
  const { data } = await db.from("clinic_backups").select("id, path").eq("clinic_id", clinicId).order("created_at", { ascending: false });
  const old = (data || []).slice(KEEP);
  if (!old.length) return;
  await db.storage.from(BUCKET).remove(old.map(o => o.path));
  await db.from("clinic_backups").delete().in("id", old.map(o => o.id));
}

export async function loadSnapshot(db: SupabaseClient, clinicId: string, backupId: string): Promise<Snapshot | null> {
  const { data: rec } = await db.from("clinic_backups").select("path").eq("id", backupId).eq("clinic_id", clinicId).maybeSingle();
  if (!rec) return null;
  const { data: blob, error } = await db.storage.from(BUCKET).download(rec.path);
  if (error || !blob) return null;
  const snap = JSON.parse(gunzipSync(Buffer.from(await blob.arrayBuffer())).toString("utf8")) as Snapshot;
  return snap.clinic_id === clinicId ? snap : null;
}

/**
 * Put back the records that are in the snapshot but no longer in the clinic.
 * Records that still exist are NEVER overwritten (edits made since the snapshot are kept).
 */
export async function restoreMissing(db: SupabaseClient, clinicId: string, snap: Snapshot) {
  const restored: Record<string, number> = {}; const problems: string[] = [];
  for (const t of RESTORE_TABLES) {
    const rows = (snap.tables[t] || []).filter(r => r.clinic_id === clinicId);
    if (!rows.length) continue;
    const drop = GENERATED[t] || [];
    let n = 0;
    for (let i = 0; i < rows.length; i += 300) {
      const chunk = rows.slice(i, i + 300).map(r => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k))));
      const { data, error } = await db.from(t).upsert(chunk, { onConflict: CONFLICT[t] || "id", ignoreDuplicates: true }).select();
      if (error) { problems.push(`${t}: ${error.message}`); break; }
      n += data?.length ?? 0;
    }
    if (n) restored[t] = n;
  }
  return { restored, total: Object.values(restored).reduce((a, b) => a + b, 0), problems };
}

/** Clinics whose newest automatic backup is older than `maxAgeMs` (or that have none), oldest first, at most `limit` */
export async function clinicsDueForBackup(db: SupabaseClient, limit = 10, maxAgeMs = 20 * 3600_000, now = Date.now()) {
  const [{ data: clinics }, { data: fresh }] = await Promise.all([
    db.from("clinics").select("id, created_at").eq("is_active", true).order("created_at"),
    db.from("clinic_backups").select("clinic_id").eq("kind", "auto").gte("created_at", new Date(now - maxAgeMs).toISOString()),
  ]);
  const done = new Set((fresh || []).map(f => f.clinic_id));
  return (clinics || []).filter(c => !done.has(c.id)).slice(0, limit).map(c => c.id as string);
}
