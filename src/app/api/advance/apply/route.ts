import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";
import { invoiceDue } from "@/lib/payments/engine";
import { ADVANCE_NOTE, syncInvoice } from "@/lib/ledger";

// Apply a paid advance booking fee to a patient's treatment invoice. The money
// is not copied: the existing payment rows move to the treatment invoice and
// the advance invoice is cancelled, so the ledger counts that money once.

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const s = await staffContext();
  if (!s || !s.billing) return fail("You need the Billing permission to apply an advance fee.", 403);
  const body = await request.json().catch(() => null);
  const targetId = typeof body?.invoiceId === "string" ? body.invoiceId : "";
  const advanceId = typeof body?.advanceInvoiceId === "string" ? body.advanceInvoiceId : "";
  if (!targetId || !advanceId || targetId === advanceId) return fail("Invalid request.");

  const [target, adv] = await Promise.all([invoiceDue(s.db, targetId), invoiceDue(s.db, advanceId)]);
  if (!target || !adv || target.invoice.clinic_id !== s.clinicId || adv.invoice.clinic_id !== s.clinicId) return fail("Invoice not found.", 404);
  if (!adv.advance || String(adv.invoice.status || "").toLowerCase() === "cancelled" || adv.paid <= 0) return fail("That advance fee has already been applied or was never paid.");
  if (target.advance || !target.payable) return fail("The advance fee can only be applied to a normal, open invoice.");
  if (!target.invoice.patient_id || target.invoice.patient_id !== adv.invoice.patient_id) return fail("The advance fee belongs to a different patient.");
  if (adv.paid > target.due + 0.005) return fail("The advance fee is more than this invoice still owes.");

  const { error: moveErr } = await s.db.from("payments").update({ invoice_id: targetId, notes: `Advance booking fee (from ${adv.invoice.invoice_number ?? "advance invoice"})` }).eq("invoice_id", advanceId);
  if (moveErr) return fail("Could not apply the advance fee. Please try again.", 500);
  await s.db.from("invoices").update({ status: "cancelled", notes: `${ADVANCE_NOTE} Applied to ${target.invoice.invoice_number ?? targetId}` }).eq("id", advanceId);
  await Promise.all([syncInvoice(s.db, targetId), syncInvoice(s.db, advanceId)]);
  return NextResponse.json({ success: true, applied: adv.paid });
}
