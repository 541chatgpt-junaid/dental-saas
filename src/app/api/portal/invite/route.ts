import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";
import { createFormLink } from "@/lib/forms/engine";
import { appOrigin } from "@/lib/payments/engine";

// Staff invite a patient to the portal: a one-time link where the patient picks their own password.

export async function POST(request: Request) {
  const s = await staffContext();
  if (!s || !s.patients) return NextResponse.json({ error: "You need access to Patients to invite a patient." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const r = await createFormLink(s.db, { clinicId: s.clinicId, patientId: Number(body?.patientId), kind: "portal", userId: s.userId });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ success: true, id: r.form.id, url: `${appOrigin(request)}/portal/join/${r.form.token}`, expiresAt: r.form.expires_at });
}
