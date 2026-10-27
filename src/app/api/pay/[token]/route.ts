import { NextResponse } from "next/server";
import { clinicCurrency, invoiceDue, loadLink, serviceClient, settleAttempt } from "@/lib/payments/engine";
import { enabledProviders, loadProvider } from "@/lib/payments/config";
import { stripeRetrieve } from "@/lib/payments/stripe";
import { PROVIDER_META } from "@/lib/payments/types";
import { symbolFor } from "@/lib/currency";

// Public: what a payment link shows. Nothing here names the patient. When the
// customer comes back from a provider (?ref=...), it also settles Stripe
// payments directly with Stripe, in case the webhook has not arrived yet.

const gone = () => NextResponse.json({ error: "This payment link is not available." }, { status: 404 });

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = serviceClient();
  const link = await loadLink(db, token);
  if (!link) return gone();
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  let attempt: { status: string; provider: string } | null = null;

  if (ref) {
    const { data: att } = await db.from("payment_attempts").select("id, ref, status, provider, provider_ref, invoice_id").eq("ref", ref).eq("link_id", link.id).maybeSingle();
    if (att) {
      const sessionId = url.searchParams.get("session_id");
      if (att.status === "pending" && att.provider === "stripe" && sessionId && sessionId === att.provider_ref) {
        const prov = await loadProvider(db, link.clinic_id, "stripe");
        const s = prov ? await stripeRetrieve(prov.config, sessionId).catch(() => null) : null;
        if (s?.paid && s.ref === att.ref) await settleAttempt(db, att.ref, { provider: "stripe", providerRef: s.paymentIntent || s.sessionId, amount: s.amount, currency: s.currency, clinicId: link.clinic_id });
      }
      const { data: fresh } = await db.from("payment_attempts").select("status, provider").eq("id", att.id).maybeSingle();
      attempt = fresh;
    }
  }

  const due = await invoiceDue(db, link.invoice_id);
  if (!due || !due.payable) return gone();
  const currency = await clinicCurrency(db, link.clinic_id);
  const [{ data: clinic }, providers] = await Promise.all([
    db.from("clinics").select("name").eq("id", link.clinic_id).maybeSingle(),
    enabledProviders(db, link.clinic_id, currency),
  ]);
  let logo: string | null = null;
  { const { data } = await db.from("clinics").select("logo_url").eq("id", link.clinic_id).maybeSingle(); logo = (data as { logo_url?: string | null } | null)?.logo_url ?? null; }
  return NextResponse.json({
    clinic: { name: clinic?.name ?? "", logo_url: logo },
    invoice: { number: due.invoice.invoice_number, total: due.total, paid: due.paid, due: due.due, currency, symbol: symbolFor(currency), advance: due.advance },
    providers: providers.map(id => ({ id, label: PROVIDER_META[id].label })),
    attempt,
  }, { headers: { "Cache-Control": "no-store" } });
}
