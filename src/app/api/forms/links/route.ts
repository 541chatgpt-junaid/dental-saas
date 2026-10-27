import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";
import { createFormLink, type FormKind } from "@/lib/forms/engine";
import { appOrigin } from "@/lib/payments/engine";

// Staff with access to Patients send a patient a history or consent form, and can revoke it.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const s = await staffContext();
  if (!s || !s.patients) return fail("You need access to Patients to send forms.", 403);
  const body = await request.json().catch(() => null);
  const kind = body?.kind as FormKind;
  if (kind !== "history" && kind !== "consent") return fail("Choose a form to send.");
  const r = await createFormLink(s.db, { clinicId: s.clinicId, patientId: Number(body?.patientId), kind, templateId: typeof body?.templateId === "string" ? body.templateId : null, userId: s.userId });
  if ("error" in r) return fail(r.error);
  return NextResponse.json({ success: true, id: r.form.id, url: `${appOrigin(request)}/forms/${r.form.token}`, expiresAt: r.form.expires_at });
}

export async function DELETE(request: Request) {
  const s = await staffContext();
  if (!s || !s.patients) return fail("You need access to Patients to change forms.", 403);
  const id = new URL(request.url).searchParams.get("id") || "";
  const { error } = await s.db.from("patient_forms").update({ revoked: true }).eq("id", id).eq("clinic_id", s.clinicId).is("submitted_at", null);
  if (error) return fail("Could not revoke the link. Please try again.", 500);
  return NextResponse.json({ success: true });
}
