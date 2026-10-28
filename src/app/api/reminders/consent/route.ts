import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";

// Records (or withdraws) a patient's agreement to be messaged by the clinic.
export async function POST(request: Request) {
  const s = await staffContext();
  if (!s || !s.patients) return NextResponse.json({ error: "You need access to Patients." }, { status: 403 });
  const b = await request.json().catch(() => null);
  const patientId = Number(b?.patientId);
  if (!Number.isInteger(patientId)) return NextResponse.json({ error: "Choose a patient." }, { status: 400 });
  const consent = b?.consent === true;
  const { data, error } = await s.db.from("patients").update({ contact_consent: consent, contact_consent_at: new Date().toISOString(), contact_consent_source: consent ? "staff" : "staff_withdrawn" })
    .eq("id", patientId).eq("clinic_id", s.clinicId).select("id");
  if (error || !data?.length) return NextResponse.json({ error: "Could not update the patient." }, { status: 400 });
  if (!consent) await s.db.from("message_outbox").update({ status: "skipped", reason: "opted_out" }).eq("patient_id", patientId).in("status", ["pending", "ready"]);
  return NextResponse.json({ success: true });
}
