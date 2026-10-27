import { createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cleanAnswers, mergeHistory, type HistoryRow } from "./history";
import { clean } from "@/lib/formInput";
import { formatDate } from "@/lib/dateFormat";

// Digital forms: secret links, the patient's history answers, and signed
// consents. Server only.

export type FormKind = "history" | "consent" | "portal";
export const serviceClient = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const HOURS: Record<FormKind, number> = { history: 24 * 14, consent: 24 * 14, portal: 24 * 7 };
const token = () => randomBytes(24).toString("base64url");
export const hashIp = (request: Request) => {
  const ip = (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
};

export interface FormRow { id: string; clinic_id: string; patient_id: number; kind: FormKind; template_id: string | null; token: string; expires_at: string; submitted_at: string | null; revoked: boolean }

/** Create a link for one patient (or reuse their live, unused one of the same kind) */
export async function createFormLink(db: SupabaseClient, p: { clinicId: string; patientId: number; kind: FormKind; templateId?: string | null; userId: string | null }): Promise<{ error: string } | { form: FormRow }> {
  const { data: patient } = await db.from("patients").select("id, clinic_id").eq("id", p.patientId).eq("clinic_id", p.clinicId).maybeSingle();
  if (!patient) return { error: "Patient not found." };
  let templateId: string | null = null;
  if (p.kind === "consent") {
    const { data: t } = await db.from("consent_templates").select("id, active").eq("id", p.templateId || "").eq("clinic_id", p.clinicId).maybeSingle();
    if (!t || !t.active) return { error: "Choose one of your consent forms." };
    templateId = t.id;
  }
  if (p.kind === "portal") {
    const { data: existing } = await db.from("patient_portal_users").select("user_id").eq("patient_id", p.patientId).maybeSingle();
    if (existing) return { error: "This patient already has portal access." };
  }
  const now = new Date().toISOString();
  let q = db.from("patient_forms").select("*").eq("patient_id", p.patientId).eq("clinic_id", p.clinicId).eq("kind", p.kind)
    .eq("revoked", false).is("submitted_at", null).gt("expires_at", now);
  q = templateId ? q.eq("template_id", templateId) : q.is("template_id", null);
  const { data: live } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (live) return { form: live as FormRow };
  const { data, error } = await db.from("patient_forms").insert([{
    clinic_id: p.clinicId, patient_id: p.patientId, kind: p.kind, template_id: templateId, token: token(), created_by: p.userId,
    expires_at: new Date(Date.now() + HOURS[p.kind] * 3600_000).toISOString(),
  }]).select("*").single();
  if (error || !data) return { error: "Could not create the link. Please try again." };
  return { form: data as FormRow };
}

/** A usable form: exists, not revoked, not expired. `used` says whether it was already submitted. */
export async function loadForm(db: SupabaseClient, tok: string) {
  const { data } = await db.from("patient_forms").select("*").eq("token", tok).maybeSingle();
  const f = data as FormRow | null;
  if (!f || f.revoked || new Date(f.expires_at).getTime() < Date.now()) return null;
  return f;
}

export async function formContext(db: SupabaseClient, f: FormRow) {
  const [{ data: clinic }, { data: logo }, { data: patient }, { data: template }] = await Promise.all([
    db.from("clinics").select("name").eq("id", f.clinic_id).maybeSingle(),
    db.from("clinics").select("logo_url").eq("id", f.clinic_id).maybeSingle(),
    db.from("patients").select("name").eq("id", f.patient_id).maybeSingle(),
    f.template_id ? db.from("consent_templates").select("title, body").eq("id", f.template_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    clinic: { name: clinic?.name ?? "", logo_url: (logo as { logo_url?: string | null } | null)?.logo_url ?? null },
    // Only the first name is shown on a public link
    firstName: String(patient?.name ?? "").trim().split(/\s+/)[0] || "",
    template: template as { title: string; body: string } | null,
  };
}

/** Claim a form exactly once: only the first caller turns "unused" into "submitted" */
async function claim(db: SupabaseClient, f: FormRow) {
  const { data } = await db.from("patient_forms").update({ submitted_at: new Date().toISOString() }).eq("id", f.id).is("submitted_at", null).select("id");
  return !!data?.length;
}

/** Store the answers and merge them into the patient's medical history (existing entries are kept) */
export async function submitHistory(db: SupabaseClient, f: FormRow, raw: unknown): Promise<{ error: string } | { flagged: { allergies: string[]; conditions: string[] } }> {
  const a = cleanAnswers(raw);
  if (!(await claim(db, f))) return { error: "This form has already been submitted." };
  const { data: patient } = await db.from("patients").select("id, name").eq("id", f.patient_id).maybeSingle();
  const { data: existing } = await db.from("medical_history").select("id, allergies, blood_group, medical_conditions, current_medications, previous_surgeries, notes").eq("patient_id", f.patient_id).limit(1).maybeSingle();
  const merged = mergeHistory(existing as HistoryRow | null, a, formatDate(new Date()));
  const { error } = existing
    ? await db.from("medical_history").update(merged.values).eq("id", (existing as { id: number }).id)
    : await db.from("medical_history").insert([{ ...merged.values, patient_id: f.patient_id, patient_name: patient?.name ?? "", clinic_id: f.clinic_id }]);
  if (error) {
    await db.from("patient_forms").update({ submitted_at: null }).eq("id", f.id);
    return { error: "Could not save your answers. Please try again." };
  }
  await db.from("patient_form_submissions").insert([{ clinic_id: f.clinic_id, patient_id: f.patient_id, form_id: f.id, kind: "history", answers: a, flagged: merged.flagged }]);
  return { flagged: merged.flagged };
}

const MAX_SIGNATURE_BYTES = 150_000;
const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A real PNG of sensible size, so an empty pad or a random string is refused */
export function validSignature(dataUrl: unknown): string | null {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) return null;
  const buf = Buffer.from(dataUrl.slice(22), "base64");
  if (buf.length < 400 || buf.length > MAX_SIGNATURE_BYTES || !buf.subarray(0, 8).equals(PNG_HEAD)) return null;
  return dataUrl;
}

/** Store a signed consent: the exact wording signed, the signer, the drawn signature, the time and a tamper-evident hash */
export async function submitConsent(db: SupabaseClient, f: FormRow, input: { signerName?: unknown; relation?: unknown; agree?: unknown; signature?: unknown }, ipHash: string): Promise<{ error: string } | { signedAt: string; id: string }> {
  const signer = clean(input.signerName, 100);
  const relation = clean(input.relation, 40) || "Myself";
  const signature = validSignature(input.signature);
  if (signer.length < 2) return { error: "Type your full name." };
  if (input.agree !== true) return { error: "Tick the box to confirm you agree." };
  if (!signature) return { error: "Please sign in the box." };
  const { data: t } = await db.from("consent_templates").select("id, title, body").eq("id", f.template_id || "").maybeSingle();
  if (!t) return { error: "This consent form is no longer available." };
  if (!(await claim(db, f))) return { error: "This form has already been signed." };

  const signedAt = new Date().toISOString();
  const integrity = createHash("sha256").update(JSON.stringify({
    clinic: f.clinic_id, patient: f.patient_id, title: t.title, body: t.body, signer, relation, signedAt,
    signature: createHash("sha256").update(signature).digest("hex"),
  })).digest("hex");
  const { data, error } = await db.from("consent_records").insert([{
    clinic_id: f.clinic_id, patient_id: f.patient_id, form_id: f.id, template_id: t.id, title: t.title, body: t.body,
    signer_name: signer, signer_relation: relation, signature_png: signature, signed_at: signedAt, integrity_hash: integrity, ip_hash: ipHash,
  }]).select("id").single();
  if (error || !data) {
    await db.from("patient_forms").update({ submitted_at: null }).eq("id", f.id);
    return { error: "Could not save your signature. Please try again." };
  }
  return { signedAt, id: data.id as string };
}
