import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";
import { appOrigin, clinicCurrency, invoiceDue, linkForInvoice } from "@/lib/payments/engine";
import { enabledProviders } from "@/lib/payments/config";

// Staff with the Billing permission create (or reuse) the shareable payment
// link of one invoice, and can revoke it.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const s = await staffContext();
  if (!s || !s.billing) return fail("You need the Billing permission to create payment links.", 403);
  const body = await request.json().catch(() => null);
  const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : "";
  const due = invoiceId ? await invoiceDue(s.db, invoiceId) : null;
  if (!due || due.invoice.clinic_id !== s.clinicId) return fail("Invoice not found.", 404);
  if (!due.payable) return fail("Draft and cancelled invoices cannot be paid online.");
  if (due.due <= 0) return fail("This invoice is already paid.");
  const currency = await clinicCurrency(s.db, s.clinicId);
  const providers = await enabledProviders(s.db, s.clinicId, currency);
  if (!providers.length) return fail("Switch on a payment provider in Settings > Online payments first.");
  const link = await linkForInvoice(s.db, { clinicId: s.clinicId, invoiceId, userId: s.userId });
  return NextResponse.json({ success: true, id: link.id, url: `${appOrigin(request)}/pay/${link.token}`, expiresAt: link.expires_at, providers });
}

export async function DELETE(request: Request) {
  const s = await staffContext();
  if (!s || !s.billing) return fail("You need the Billing permission to change payment links.", 403);
  const invoiceId = new URL(request.url).searchParams.get("invoiceId") || "";
  const { error } = await s.db.from("payment_links").update({ revoked: true }).eq("clinic_id", s.clinicId).eq("invoice_id", invoiceId).eq("revoked", false);
  if (error) return fail("Could not revoke the link. Please try again.", 500);
  return NextResponse.json({ success: true });
}
