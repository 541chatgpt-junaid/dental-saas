import { NextResponse } from "next/server";
import { formContext, hashIp, loadForm, serviceClient, submitConsent, submitHistory } from "@/lib/forms/engine";
import { isRateLimited, TOO_MANY } from "@/lib/rateLimit";

// Public: what a form link shows and accepts. The token is the only credential;
// nothing but the clinic name and the patient's first name is revealed.

const gone = () => NextResponse.json({ error: "This form link is not available." }, { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = serviceClient();
  const f = await loadForm(db, token);
  if (!f || f.kind === "portal") return gone();
  const ctx = await formContext(db, f);
  return NextResponse.json({ kind: f.kind, submitted: !!f.submitted_at, ...ctx }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = serviceClient();
  if (await isRateLimited(db, request, "forms-submit", { limit: 30, windowMs: 60 * 60 * 1000 })) return NextResponse.json(TOO_MANY, { status: 429 });
  const f = await loadForm(db, token);
  if (!f || f.kind === "portal") return gone();
  if (f.submitted_at) return NextResponse.json({ error: "This form has already been submitted." }, { status: 409 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (f.kind === "history") {
    const r = await submitHistory(db, f, body.answers);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 409 });
    return NextResponse.json({ success: true });
  }
  const r = await submitConsent(db, f, { signerName: body.signerName, relation: body.relation, agree: body.agree, signature: body.signature }, hashIp(request));
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ success: true, signedAt: r.signedAt });
}
