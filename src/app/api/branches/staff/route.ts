import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";

// Which branches a staff member may open. Owners and admins always open every branch;
// other staff open only what is assigned here (nothing assigned = the Main branch only).
export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return NextResponse.json({ error: "Only the clinic owner can assign branches." }, { status: 403 });
  const b = await request.json().catch(() => null);
  const staffId = Number(b?.staffId);
  const ids: string[] = Array.isArray(b?.branchIds) ? b.branchIds.filter((x: unknown) => typeof x === "string") : [];
  if (!Number.isInteger(staffId)) return NextResponse.json({ error: "Choose a staff member." }, { status: 400 });
  const [{ data: staff }, { data: valid }] = await Promise.all([
    o.db.from("staff").select("id").eq("id", staffId).eq("clinic_id", o.clinicId).maybeSingle(),
    ids.length ? o.db.from("branches").select("id").eq("clinic_id", o.clinicId).in("id", ids) : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  if (!staff) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  const keep = new Set((valid || []).map(v => v.id));
  await o.db.from("staff_branches").delete().eq("staff_id", staffId).eq("clinic_id", o.clinicId);
  if (keep.size) {
    const { error } = await o.db.from("staff_branches").insert([...keep].map(branch_id => ({ staff_id: staffId, branch_id, clinic_id: o.clinicId })));
    if (error) return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
