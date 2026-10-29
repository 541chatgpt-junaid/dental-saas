import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";

// Owner view of who has two-factor sign-in on, and the way back in for a member of staff who lost their phone.
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET() {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can see this.", 403);
  const { data: staff } = await o.db.from("staff").select("id, name, email, user_id").eq("clinic_id", o.clinicId).order("name");
  const out = [];
  for (const s of staff || []) {
    let on = false;
    if (s.user_id) { const { data } = await o.db.auth.admin.mfa.listFactors({ userId: s.user_id }); on = (data?.factors || []).some(f => f.status === "verified"); }
    out.push({ id: s.id, name: s.name, email: s.email, twoFactor: on });
  }
  return NextResponse.json({ staff: out });
}

export async function DELETE(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can reset two-factor sign-in.", 403);
  const staffId = Number(new URL(request.url).searchParams.get("staffId"));
  const { data: s } = await o.db.from("staff").select("user_id").eq("id", staffId).eq("clinic_id", o.clinicId).maybeSingle();
  if (!s?.user_id) return fail("Staff member not found.", 404);
  const { data } = await o.db.auth.admin.mfa.listFactors({ userId: s.user_id });
  for (const f of data?.factors || []) await o.db.auth.admin.mfa.deleteFactor({ id: f.id, userId: s.user_id });
  return NextResponse.json({ success: true });
}
