"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/dateFormat";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft, Check, Copy, Link2, Printer, Wallet } from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { createClient } from "@/lib/supabase";
import { saveErrorMessage } from "@/lib/formSave";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";
import { applyLedger, recordPayment, type InvoiceStatus } from "@/lib/ledger";

interface Invoice {
  id: string;
  patient_id: number | null;
  invoice_number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  /** Payment status from getInvoiceStatus() (via applyLedger) */
  state: InvoiceStatus;
  notes: string | null;
  due_date: string | null;
  created_at: string;
  patients: { name: string; phone: string } | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
}

const statusColor = (s: string) => {
  if (s === "paid") return "bg-green-100 text-green-700";
  if (s === "partial") return "bg-blue-100 text-blue-700";
  if (s === "cancelled") return "bg-gray-100 text-gray-500";
  if (s === "draft") return "bg-purple-100 text-purple-700";
  if (s === "sent") return "bg-sky-100 text-sky-700";
  if (s === "overdue") return "bg-red-100 text-red-700";
  return "bg-orange-100 text-orange-700";
};

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);


export default function InvoiceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(searchParams.get("pay") === "1");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payNotes, setPayNotes] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [markingStatus, setMarkingStatus] = useState(false);
  const [payLink, setPayLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId, clinicName } = useClinic();

  /** Create (or fetch) the shareable payment link of this invoice */
  const createPayLink = async () => {
    setLinkBusy(true); setLinkError("");
    const res = await fetch("/api/payment-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: id }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !json.url) setLinkError(json.error || "Could not create the payment link. Please try again.");
    else setPayLink({ url: json.url, expiresAt: json.expiresAt });
    setLinkBusy(false);
  };
  const revokePayLink = async () => {
    if (!confirm("Stop this payment link from working?")) return;
    const res = await fetch(`/api/payment-links?invoiceId=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setPayLink(null); else setLinkError("Could not revoke the link. Please try again.");
  };
  const copyPayLink = async () => {
    if (!payLink) return;
    try { await navigator.clipboard.writeText(payLink.url); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); } catch { /* the box is selectable as a fallback */ }
  };

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    // clinic_id filter in code too, so a guessed invoice id can't load another clinic's invoice even if RLS were off
    const cid = clinicId || "";
    let invQ = supabase.from("invoices").select("*, patients(name, phone)").eq("id", id);
    let itemQ = supabase.from("invoice_items").select("*").eq("invoice_id", id);
    let payQ = supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date");
    if (cid) { invQ = invQ.eq("clinic_id", cid); itemQ = itemQ.eq("clinic_id", cid); payQ = payQ.eq("clinic_id", cid); }
    const [{ data: inv }, { data: invItems }, { data: pays }] = await Promise.all([
      invQ.maybeSingle(), itemQ, payQ,
    ]);
    // Total, paid, balance and status come from the line items and payments
    setInvoice(inv ? applyLedger([inv as Invoice], invItems || [], pays || [])[0] : null);
    setItems(invItems || []);
    setPayments(pays || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleMarkStatus = async (newStatus: "sent" | "cancelled" | "unpaid") => {
    setMarkingStatus(true);
    const { error } = await createClient().from("invoices").update({ status: newStatus }).eq("id", id);
    setMarkingStatus(false);
    if (error) alert(saveErrorMessage(error, "invoice"));
    fetchData();
  };

  const handleFinalizeDraft = async () => {
    setMarkingStatus(true);
    const { error } = await createClient().from("invoices").update({ status: "unpaid" }).eq("id", id);
    setMarkingStatus(false);
    if (error) alert(saveErrorMessage(error, "invoice"));
    fetchData();
  };

  const buildWhatsAppLink = () => {
    if (!invoice) return "#";
    let phone = (invoice.patients?.phone || "").replace(/\D/g, "");
    if (!phone) return "#";
    if (phone.startsWith("0092")) phone = phone.slice(2);
    else if (phone.startsWith("92") && phone.length >= 12) { }
    else if (phone.startsWith("0")) phone = "92" + phone.slice(1);
    else if (!phone.startsWith("92")) phone = "92" + phone;

    const sep = "━━━━━━━━━━━━━━━━━━━━";
    const treatmentLines = items.map(
      (it, i) => `  ${i + 1}. ${it.description}\n     ${it.quantity} × ${symbol} ${it.unit_price.toLocaleString()} = *${symbol} ${it.total.toLocaleString()}*`
    ).join("\n");

    const lines = [
      clinicName ? `🏥 *${clinicName.toUpperCase()}*` : null,
      sep,
      `📄 *INVOICE: ${invoice.invoice_number}*`,
      `📅 Date: ${formatDate(invoice.created_at)}`,
      invoice.due_date ? `⏰ Due: ${formatDate(invoice.due_date)}` : null,
      ``,
      `👤 *Patient:* ${invoice.patients?.name || ""}`,
      invoice.patients?.phone ? `📞 *Phone:* ${invoice.patients.phone}` : null,
      ``,
      sep,
      `*TREATMENTS:*`,
      treatmentLines,
      sep,
      `Subtotal:  ${symbol} ${invoice.subtotal.toLocaleString()}`,
      invoice.discount > 0 ? `Discount:  - ${symbol} ${invoice.discount.toLocaleString()}` : null,
      `*Total:    ${symbol} ${invoice.total.toLocaleString()}*`,
      invoice.amount_paid > 0 ? `Paid:      ${symbol} ${invoice.amount_paid.toLocaleString()}` : null,
      sep,
      invoice.balance > 0
        ? `💰 *Balance Due: ${symbol} ${Math.max(0, invoice.balance).toLocaleString()}*`
        : `✅ *Fully Paid*`,
      ``,
      clinicName ? `Thank you for choosing *${clinicName}*! 🙏` : `Thank you! 🙏`,
    ].filter(v => v !== null).join("\n");

    return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
  };

  const handleRecordPayment = async () => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { setPayError("Enter a valid amount."); return; }
    if (!invoice) return;

    setPayLoading(true);
    setPayError("");
    const supabase = createClient();

    const pErr = await recordPayment(supabase, {
      clinicId, invoiceId: id, patientId: invoice.patient_id ?? null,
      amount: amt, method: payMethod, note: payNotes || null,
    });
    if (pErr) { setPayError(pErr); setPayLoading(false); return; }

    setShowPayModal(false);
    setPayAmount("");
    setPayNotes("");
    setPayMethod("Cash");
    setPayLoading(false);
    fetchData();
  };

  if (loading) return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm mt-14 md:mt-0">Loading invoice…</div>
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm mt-14 md:mt-0">Invoice not found.</div>
    </div>
  );

  // Status comes only from the shared ledger helper
  const effStatus = invoice.state.toLowerCase();
  const isFullyPaid = invoice.state === "Paid";

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print-hide { display: none !important; }
          .print-invoice { box-shadow: none !important; border: none !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">

        {/* Screen-only action bar */}
        <div className="print-hide flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => router.push("/dashboard/billing")} className="text-brand-500 hover:text-brand-700 text-sm"><ArrowLeft className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Back</button>
            <h2 className="text-xl font-semibold text-brand-800">{invoice.invoice_number}</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(effStatus)}`}>{statusLabel(effStatus)}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {invoice.state === "Draft" && (
              <button onClick={handleFinalizeDraft} disabled={markingStatus}
                className="border border-purple-200 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-50">
                Finalize Invoice
              </button>
            )}
            {invoice.state !== "Draft" && invoice.state !== "Paid" && invoice.state !== "Cancelled" && invoice.status !== "sent" && (
              <button onClick={() => handleMarkStatus("sent")} disabled={markingStatus}
                className="border border-sky-200 text-sky-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-50">
                Mark as Sent
              </button>
            )}
            {invoice.patients?.phone && (
              <a href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer"
                className="border border-green-200 text-green-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-50 flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            )}
            <button onClick={() => window.print()}
              className="border border-brand-200 text-brand-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-50">
              <Printer className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Print
            </button>
            {invoice.state !== "Paid" && invoice.state !== "Cancelled" && invoice.state !== "Draft" && (
              <button onClick={createPayLink} disabled={linkBusy}
                className="border border-brand-200 text-brand-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-50 disabled:opacity-60">
                <Link2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{linkBusy ? "Creating…" : "Payment link"}
              </button>
            )}
            {invoice.state !== "Paid" && invoice.state !== "Cancelled" && (
              <button onClick={() => { setShowPayModal(true); setPayError(""); }}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                Record Payment
              </button>
            )}
          </div>
        </div>

        {(payLink || linkError) && (
          <div className="print-hide mb-6 max-w-3xl rounded-xl border border-brand-200 bg-white p-4">
            {linkError && <p role="alert" className="text-sm text-red-600">{linkError}</p>}
            {payLink && (
              <>
                <p className="mb-2 text-xs font-medium text-brand-600">Share this link. The patient pays the balance online; the payment appears on this invoice automatically.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input readOnly value={payLink.url} onFocus={e => e.target.select()} aria-label="Payment link" className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs" />
                  <button onClick={copyPayLink} className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-medium text-brand-700 hover:border-gold">
                    <Copy className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{linkCopied ? "Copied" : "Copy"}
                  </button>
                  <a href={waLink(invoice.patients?.phone, `Assalam o Alaikum, you can pay invoice ${invoice.invoice_number} (${symbol} ${invoice.balance.toLocaleString()} due) securely online: ${payLink.url}`)} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-green-200 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50">Send on WhatsApp</a>
                  <button onClick={revokePayLink} className="px-2 py-2 text-xs font-medium text-red-500 hover:underline">Revoke</button>
                </div>
                <p className="mt-2 text-[11px] text-brand-400">Link valid until {formatDate(payLink.expiresAt)}.</p>
              </>
            )}
          </div>
        )}

        {/* ── INVOICE DOCUMENT ── */}
        <div className="print-invoice max-w-3xl bg-white rounded-2xl border border-brand-200 shadow-sm overflow-hidden mb-6">

          {/* Clinic Header */}
          <div className="bg-brand-600 px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-white text-2xl font-black tracking-wide uppercase">
                {clinicName || "Clinic"}
              </h1>
              <p className="text-brand-200 text-xs mt-0.5 tracking-wider uppercase">Dental Care</p>
            </div>
            <div className="text-right">
              <p className="text-brand-100 text-xs uppercase tracking-widest font-semibold">Invoice</p>
              <p className="text-white text-xl font-bold">{invoice.invoice_number}</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                effStatus === "paid" ? "bg-green-400 text-green-900" :
                effStatus === "partial" ? "bg-yellow-400 text-yellow-900" :
                effStatus === "overdue" ? "bg-red-400 text-white" :
                effStatus === "draft" ? "bg-purple-300 text-purple-900" :
                "bg-white text-brand-700"
              }`}>{statusLabel(effStatus)}</span>
            </div>
          </div>

          {/* Bill To / Invoice Info */}
          <div className="px-6 py-5 border-b border-brand-100 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-2">Bill To</p>
              <p className="font-bold text-brand-800 text-base">{invoice.patients?.name || "—"}</p>
              {invoice.patients?.phone && (
                <p className="text-sm text-gray-500 mt-0.5">{invoice.patients.phone}</p>
              )}
            </div>
            <div className="text-right space-y-1.5">
              <div className="flex justify-end gap-8">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Invoice Date</p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(invoice.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Due Date</p>
                  <p className={`text-sm font-medium ${invoice.state === "Overdue" ? "text-red-600 font-bold" : "text-gray-700"}`}>
                    {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-50 border-b border-brand-200">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest w-8">#</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Treatment / Description</th>
                  <th className="text-center px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Unit Price</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-brand-50/40"}`}>
                    <td className="px-6 py-3.5 text-gray-400 text-xs font-medium">{idx + 1}</td>
                    <td className="px-3 py-3.5 font-semibold text-brand-800">{item.description}</td>
                    <td className="px-3 py-3.5 text-center text-gray-500">{item.quantity}</td>
                    <td className="px-4 py-3.5 text-right text-gray-500">{symbol} {item.unit_price.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-brand-800">{symbol} {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 py-5 bg-brand-50 border-t border-brand-200">
            <div className="flex flex-col items-end gap-2">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{symbol} {invoice.subtotal.toLocaleString()}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>− {symbol} {invoice.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-brand-900 pt-2 border-t border-brand-200">
                  <span>Total</span>
                  <span>{symbol} {invoice.total.toLocaleString()}</span>
                </div>
                {invoice.amount_paid > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Amount Paid</span>
                    <span>− {symbol} {invoice.amount_paid.toLocaleString()}</span>
                  </div>
                )}
                {/* Balance Box */}
                <div className={`rounded-xl px-4 py-3.5 mt-1 border-2 ${
                  isFullyPaid ? "bg-green-50 border-green-300" :
                  invoice.state === "Partial" ? "bg-orange-50 border-orange-300" :
                  "bg-red-50 border-red-300"
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-bold ${
                      isFullyPaid ? "text-green-700" :
                      invoice.state === "Partial" ? "text-orange-700" : "text-red-700"
                    }`}>
                      {isFullyPaid ? <><Check className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Fully Paid</> : "Balance Due"}
                    </span>
                    <span className={`text-2xl font-black ${
                      isFullyPaid ? "text-green-700" :
                      invoice.state === "Partial" ? "text-orange-700" : "text-red-700"
                    }`}>
                      {symbol} {Math.max(0, invoice.balance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 py-4 border-t border-brand-100">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1.5">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 bg-brand-50 border-t border-brand-100 flex items-center justify-between">
            <p className="text-xs text-brand-600 font-medium">
              Thank you for choosing {clinicName || "our clinic"}!
            </p>
            <p className="text-xs text-brand-400">Generated by DentEase</p>
          </div>
        </div>

        {/* Payment History — screen only */}
        <div className="print-hide max-w-3xl bg-white rounded-2xl border border-brand-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-brand-100 bg-brand-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Payment History</h3>
            {payments.length > 0 && (
              <span className="text-xs font-semibold text-emerald-600">{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          {payments.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments yet" hint="Payments recorded against this invoice will show here." compact />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 border-b border-brand-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Date</th>
                  <th className="text-left px-5 py-3">Method</th>
                  <th className="text-right px-5 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(pay => (
                  <tr key={pay.id} className="border-t border-gray-50 hover:bg-brand-50">
                    <td className="px-6 py-3 text-gray-600 text-xs">{formatDate(pay.payment_date)}</td>
                    <td className="px-5 py-3">
                      <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">{pay.payment_method}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">+ {symbol} {pay.amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{pay.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Record Payment Modal */}
        {showPayModal && (
          <div className="fixed inset-0 modal-backdrop bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print-hide">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-base font-bold text-brand-800 mb-4">Record Payment</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-brand-600 mb-1 block font-medium">Amount *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder={`Balance: ${symbol} ${invoice.balance.toLocaleString()}`}
                    className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-brand-600 mb-1 block font-medium">Payment Method</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                    className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                    {["Cash", "Card", "Bank Transfer", "JazzCash", "EasyPaisa", "Benefit", "Other"].map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-brand-600 mb-1 block font-medium">Notes (optional)</label>
                  <input value={payNotes} onChange={e => setPayNotes(e.target.value)}
                    placeholder="Any notes…"
                    className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                  />
                </div>
                {payError && <p className="text-red-500 text-xs">{payError}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={handleRecordPayment} disabled={payLoading}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                    {payLoading ? "Recording…" : "Record Payment"}
                  </button>
                  <button onClick={() => setShowPayModal(false)}
                    className="flex-1 border border-brand-200 text-brand-700 py-2.5 rounded-xl text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
