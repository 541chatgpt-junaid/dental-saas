import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";

// Remove a patient's portal access: their login is deleted, so it stops working at once.

export async function DELETE(request: Request) {
  const s = await staffContext();
  if (!s || !s.patients) return NextResponse.json({ error: "You need access to Patients to change portal access." }, { status: 403 });
  const patientId = Number(new URL(request.url).searchParams.get("patientId"));
  const { data: row } = await s.db.from("patient_portal_users").select("user_id").eq("patient_id", patientId).eq("clinic_id", s.clinicId).maybeSingle();
  if (!row) return NextResponse.json({ success: true });
  await s.db.from("patient_portal_users").delete().eq("user_id", row.user_id);
  await s.db.auth.admin.deleteUser(row.user_id);
  return NextResponse.json({ success: true });
}
