import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";
import { clean } from "@/lib/formInput";

// Branches are managed by the clinic owner. Every staff list below is the owner's
// view; what each staff member can OPEN is enforced by the database.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MAX_BRANCHES = 25;

export async function GET() {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can manage branches.", 403);
  const [{ data: branches }, { data: staff }, { data: links }] = await Promise.all([
    o.db.from("branches").select("id, name, address, phone, is_main, active").eq("clinic_id", o.clinicId).order("is_main", { ascending: false }).order("name"),
    o.db.from("staff").select("id, name, email, role").eq("clinic_id", o.clinicId).order("name"),
    o.db.from("staff_branches").select("staff_id, branch_id").eq("clinic_id", o.clinicId),
  ]);
  return NextResponse.json({ branches: branches || [], staff: staff || [], links: links || [] });
}

export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can manage branches.", 403);
  const b = await request.json().catch(() => null);
  const name = clean(b?.name, 80);
  if (name.length < 2) return fail("Give the branch a name.");
  const row = { name, address: clean(b?.address, 200) || null, phone: clean(b?.phone, 30) || null };
  const id = typeof b?.id === "string" ? b.id : "";
  if (id) {
    const { data: cur } = await o.db.from("branches").select("id, is_main").eq("id", id).eq("clinic_id", o.clinicId).maybeSingle();
    if (!cur) return fail("Branch not found.", 404);
    const active = cur.is_main ? true : b?.active !== false;   // the Main branch cannot be switched off
    const { error } = await o.db.from("branches").update({ ...row, active }).eq("id", id).eq("clinic_id", o.clinicId);
    if (error) return fail("Could not save. Please try again.", 500);
  } else {
    const { count } = await o.db.from("branches").select("id", { count: "exact", head: true }).eq("clinic_id", o.clinicId);
    if ((count ?? 0) >= MAX_BRANCHES) return fail(`A clinic can have up to ${MAX_BRANCHES} branches. Contact us if you need more.`);
    const { error } = await o.db.from("branches").insert([{ ...row, clinic_id: o.clinicId }]);
    if (error) return fail("Could not save. Please try again.", 500);
  }
  return NextResponse.json({ success: true });
}
