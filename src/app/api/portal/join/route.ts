import { NextResponse } from "next/server";
import { loadForm, serviceClient } from "@/lib/forms/engine";
import { passwordError } from "@/lib/passwordRules";
import { isRateLimited, TOO_MANY } from "@/lib/rateLimit";

// A patient opens their invitation link and creates their login. The login is
// flagged as a portal account in app_metadata (which the user cannot edit) and
// linked to exactly one patient record.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const db = serviceClient();
  if (await isRateLimited(db, request, "portal-join", { limit: 10, windowMs: 60 * 60 * 1000 })) return NextResponse.json(TOO_MANY, { status: 429 });
  const f = body?.token ? await loadForm(db, String(body.token)) : null;
  if (!f || f.kind !== "portal") return NextResponse.json({ error: "This invitation link is not available." }, { status: 404 });
  if (f.submitted_at) return NextResponse.json({ error: "This invitation has already been used." }, { status: 409 });
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const pw = passwordError(body.password);
  if (pw) return NextResponse.json({ error: pw }, { status: 400 });

  // One use only: whoever flips unused -> used continues
  const { data: claimed } = await db.from("patient_forms").update({ submitted_at: new Date().toISOString() }).eq("id", f.id).is("submitted_at", null).select("id");
  if (!claimed?.length) return NextResponse.json({ error: "This invitation has already been used." }, { status: 409 });

  const release = () => db.from("patient_forms").update({ submitted_at: null }).eq("id", f.id);
  const { data: created, error } = await db.auth.admin.createUser({ email, password: body.password, email_confirm: true, app_metadata: { portal: true } });
  if (error || !created?.user) {
    await release();
    return NextResponse.json({ error: /already|registered|exists/i.test(error?.message || "") ? "An account with this email already exists." : "Could not create your account. Please try again." }, { status: 400 });
  }
  const { error: mapErr } = await db.from("patient_portal_users").insert([{ user_id: created.user.id, patient_id: f.patient_id, clinic_id: f.clinic_id }]);
  if (mapErr) {
    await db.auth.admin.deleteUser(created.user.id);
    await release();
    return NextResponse.json({ error: "Could not link your account. Please ask the clinic for a new invitation." }, { status: 400 });
  }
  await db.from("patients").update({ email }).eq("id", f.patient_id).or("email.is.null,email.eq.");
  return NextResponse.json({ success: true });
}
