import { NextResponse } from "next/server";
import { appOrigin, loadLink, serviceClient, startAttempt } from "@/lib/payments/engine";
import { isRateLimited, TOO_MANY } from "@/lib/rateLimit";
import { PROVIDER_IDS, type ProviderId } from "@/lib/payments/types";

// Public: the customer picked a provider on the payment page. The amount is
// always what the ledger says is still owed, never anything the browser sends.

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  const provider = body?.provider as ProviderId;
  if (!PROVIDER_IDS.includes(provider)) return NextResponse.json({ error: "Choose a payment method." }, { status: 400 });
  const db = serviceClient();
  if (await isRateLimited(db, request, "pay-start", { limit: 20, windowMs: 60 * 60 * 1000 })) return NextResponse.json(TOO_MANY, { status: 429 });
  const link = await loadLink(db, token);
  if (!link) return NextResponse.json({ error: "This payment link is not available." }, { status: 404 });
  const r = await startAttempt(db, { link, provider, origin: appOrigin(request) });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ checkout: r.checkout });
}
