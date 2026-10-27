import { NextResponse } from "next/server";
import { serviceClient, settleAttempt } from "@/lib/payments/engine";
import { loadProvider } from "@/lib/payments/config";
import { stripeFromEvent, stripeVerifyWebhook } from "@/lib/payments/stripe";

// Stripe calls this for the clinic's own Stripe account. The signature is
// checked with that clinic's webhook secret; nothing else is trusted.

export async function POST(request: Request, { params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  const raw = await request.text();
  const db = serviceClient();
  const prov = await loadProvider(db, clinicId, "stripe");
  const event = prov ? stripeVerifyWebhook(prov.config, raw, request.headers.get("stripe-signature")) : null;
  if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = stripeFromEvent(event.data.object);
    if (s.paid && s.ref) {
      const r = await settleAttempt(db, s.ref, { provider: "stripe", providerRef: s.paymentIntent || s.sessionId, amount: s.amount, currency: s.currency, clinicId });
      // Ask Stripe to retry only when we could not write to the ledger
      if (!r.ok && r.reason === "ledger_error") return NextResponse.json({ error: "Could not record the payment." }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
