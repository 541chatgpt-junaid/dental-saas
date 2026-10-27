import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";
import { clean } from "@/lib/formInput";

// The clinic writes its own consent wording. DentEase supplies no legal text.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can edit consent forms.", 403);
  const body = await request.json().catch(() => null);
  const title = clean(body?.title, 120);
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 10_000) : "";
  if (!title) return fail("Give the consent form a title.");
  if (text.length < 20) return fail("Write the consent wording patients will sign (at least a few sentences).");
  const id = typeof body?.id === "string" ? body.id : "";
  const row = { title, body: text, active: body?.active !== false, updated_at: new Date().toISOString() };
  const { error } = id
    ? await o.db.from("consent_templates").update(row).eq("id", id).eq("clinic_id", o.clinicId)
    : await o.db.from("consent_templates").insert([{ ...row, clinic_id: o.clinicId }]);
  if (error) return fail("Could not save. Please try again.", 500);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can edit consent forms.", 403);
  const id = new URL(request.url).searchParams.get("id") || "";
  // Signed records keep their own copy of the wording, so a template can be removed safely
  const { error } = await o.db.from("consent_templates").delete().eq("id", id).eq("clinic_id", o.clinicId);
  if (error) return fail("Could not delete. Please try again.", 500);
  return NextResponse.json({ success: true });
}
