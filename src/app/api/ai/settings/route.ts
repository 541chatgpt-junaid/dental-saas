import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";

// The clinic owner switches AI drafting on or off for the clinic. It is off until they do.
export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return NextResponse.json({ error: "Only the clinic owner can change this." }, { status: 403 });
  const b = await request.json().catch(() => null);
  const { error } = await o.db.from("ai_settings").upsert({ clinic_id: o.clinicId, enabled: b?.enabled === true, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  return NextResponse.json({ success: true, enabled: b?.enabled === true });
}
