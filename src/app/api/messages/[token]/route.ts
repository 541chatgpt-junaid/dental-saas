import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited } from "@/lib/rateLimit";

// The "stop these messages" link in every message. The long random token in the
// link is the patient's proof of who they are; it only ever turns messages OFF.
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function lookup(token: string) {
  const d = db();
  const { data: m } = await d.from("message_outbox").select("patient_id, clinic_id").eq("token", token).maybeSingle();
  if (!m) return null;
  const [{ data: c }, { data: p }] = await Promise.all([d.from("clinics").select("name").eq("id", m.clinic_id).maybeSingle(), d.from("patients").select("contact_consent").eq("id", m.patient_id).maybeSingle()]);
  return { d, patientId: m.patient_id as number, clinic: c?.name as string | undefined, subscribed: p?.contact_consent === true };
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const r = await lookup((await params).token);
  return r ? NextResponse.json({ clinic: r.clinic, subscribed: r.subscribed }) : NextResponse.json({ error: "This link is not valid." }, { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (await isRateLimited(db(), request, "message-optout", { limit: 30, windowMs: 3_600_000 })) return NextResponse.json({ error: "Too many tries. Please wait a little." }, { status: 429 });
  const r = await lookup((await params).token);
  if (!r) return NextResponse.json({ error: "This link is not valid." }, { status: 404 });
  await r.d.from("patients").update({ contact_consent: false, contact_consent_at: new Date().toISOString(), contact_consent_source: "patient_opt_out" }).eq("id", r.patientId);
  await r.d.from("message_outbox").update({ status: "skipped", reason: "opted_out" }).eq("patient_id", r.patientId).in("status", ["pending", "ready"]);
  return NextResponse.json({ success: true });
}
