import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";
import { secretBoxReady } from "@/lib/secretBox";
import { describeProviders, saveProvider } from "@/lib/payments/config";
import { PROVIDER_IDS, type ProviderId } from "@/lib/payments/types";
import { appOrigin } from "@/lib/payments/engine";

// The clinic owner connects the clinic's own JazzCash / Easypaisa / Stripe
// merchant accounts. Secrets go in encrypted and are never sent back.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can see payment settings.", 403);
  const origin = appOrigin(request);
  return NextResponse.json({
    ready: secretBoxReady(),
    providers: await describeProviders(o.db, o.clinicId),
    // Addresses the owner may need to paste into the provider's dashboard
    urls: { stripeWebhook: `${origin}/api/payments/webhook/stripe/${o.clinicId}` },
  });
}

export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can change payment settings.", 403);
  if (!secretBoxReady()) return fail("Online payments are not set up on this server yet (PAYMENT_SECRETS_KEY is missing).", 503);
  const body = await request.json().catch(() => null);
  const provider = body?.provider as ProviderId;
  if (!PROVIDER_IDS.includes(provider)) return fail("Choose a payment provider.");
  const env = body.environment === "live" ? "live" : "sandbox";
  const err = await saveProvider(o.db, o.clinicId, provider, { enabled: body.enabled === true, environment: env, values: typeof body.values === "object" && body.values ? body.values : {} });
  if (err) return fail(err);
  return NextResponse.json({ success: true, providers: await describeProviders(o.db, o.clinicId) });
}

export async function DELETE(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can change payment settings.", 403);
  const provider = new URL(request.url).searchParams.get("provider") as ProviderId;
  if (!PROVIDER_IDS.includes(provider)) return fail("Choose a payment provider.");
  const { error } = await o.db.from("clinic_payment_providers").delete().eq("clinic_id", o.clinicId).eq("provider", provider);
  if (error) return fail("Could not remove the payment settings. Please try again.", 500);
  return NextResponse.json({ success: true, providers: await describeProviders(o.db, o.clinicId) });
}
