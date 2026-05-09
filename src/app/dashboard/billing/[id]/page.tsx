"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
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

const isOverdue = (inv: Invoice) =>
  !!inv.due_date && new Date(inv.due_date) < new Date() && inv.balance > 0 && inv.status !== "paid" && inv.status !== "cancelled";

const effectiveStatus = (inv: Invoice) => isOverdue(inv) ? "overdue" : inv.status;

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

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

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
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: inv }, { data: invItems }, { data: pays }] = await Promise.all([
      supabase.from("invoices").select("*, patients(name, phone)").eq("id", id).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", id),
      supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date"),
    ]);
    setInvoice(inv || null);
    setItems(invItems || []);
    setPayments(pays || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleMarkStatus = async (newStatus: "sent" | "cancelled" | "unpaid") => {
    setMarkingStatus(true);
    await createClient().from("invoices").update({ status: newStatus }).eq("id", id);
    setMarkingStatus(false);
    fetchData();
  };

  const handleFinalizeDraft = async () => {
    setMarkingStatus(true);
    await createClient().from("invoices").update({ status: "unpaid" }).eq("id", id);
    setMarkingStatus(false);
    fetchData();
  };

  const buildWhatsAppLink = () => {
    if (!invoice) return "#";
    const phone = (invoice.patients?.phone || "").replace(/\D/g, "");
    if (!phone) return "#";
    const lines = [
      `*Invoice: ${invoice.invoice_number}*`,
      `Patient: ${invoice.patients?.name || ""}`,
      `Total: ${symbol} ${invoice.total.toLocaleString()}`,
      invoice.amount_paid > 0 ? `Paid: ${symbol} ${invoice.amount_paid.toLocaleString()}` : null,
      invoice.balance > 0 ? `*Balance Due: ${symbol} ${invoice.balance.toLocaleString()}*` : "✅ Fully Paid",
      invoice.due_date ? `Due Date: ${formatDate(invoice.due_date)}` : null,
    ].filter(Boolean).join("\n");
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
  };

  const handleRecordPayment = async () => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { setPayError("Enter a valid amount."); return; }
    if (!invoice) return;

    setPayLoading(true);
    setPayError("");
    const supabase = createClient();

    const { error: pErr } = await supabase.from("payments").insert([{
      invoice_id: id,
      clinic_id: clinicId,
      amount: amt,
      payment_method: payMethod,
      payment_date: new Date().toISOString(),
      notes: payNotes || null,
    }]);

    if (pErr) { setPayError(pErr.message); setPayLoading(false); return; }

    const newAmountPaid = invoice.amount_paid + amt;
    const newStatus = newAmountPaid >= invoice.total ? "paid" : "partial";

    await supabase.from("invoices").update({ amount_paid: newAmountPaid, status: newStatus }).eq("id", id);

    setShowPayModal(false);
    setPayAmount("");
    setPayNotes("");
    setPayMethod("Cash");
    setPayLoading(false);
    fetchData();
  };

  if (loading) return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm mt-14 md:mt-0">Loading invoice...</div>
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm mt-14 md:mt-0">Invoice not found.</div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => router.push("/dashboard/billing")} className="text-teal-500 hover:text-teal-700 text-sm">← Back</button>
            <h2 className="text-xl font-semibold text-teal-800">{invoice.invoice_number}</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(effectiveStatus(invoice))}`}>{statusLabel(effectiveStatus(invoice))}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {invoice.status === "draft" && (
              <button
                onClick={handleFinalizeDraft}
                disabled={markingStatus}
                className="border border-purple-200 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-50"
              >
                Finalize Invoice
              </button>
            )}
            {invoice.status !== "draft" && invoice.status !== "paid" && invoice.status !== "cancelled" && invoice.status !== "sent" && (
              <button
                onClick={() => handleMarkStatus("sent")}
                disabled={markingStatus}
                className="border border-sky-200 text-sky-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-50"
              >
                Mark as Sent
              </button>
            )}
            {invoice.patients?.phone && (
              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-green-200 text-green-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-50 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            )}
            <button
              onClick={() => window.print()}
              className="border border-teal-200 text-teal-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-50"
            >
              Print
            </button>
            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
              <button
                onClick={() => { setShowPayModal(true); setPayError(""); }}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                Record Payment
              </button>
            )}
          </div>
        </div>

        <div className="max-w-3xl space-y-5">
          {/* Patient Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Patient</p>
                <p className="font-semibold text-gray-800">{invoice.patients?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Phone</p>
                <p className="text-gray-700">{invoice.patients?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Invoice Date</p>
                <p className="text-gray-700">{formatDate(invoice.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Due Date</p>
                <p className={`font-medium ${invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.balance > 0 ? "text-red-600" : "text-gray-700"}`}>
                  {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Invoice Items</h3>
              <span className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Description</th>
                  <th className="text-center px-3 py-3">Qty</th>
                  <th className="text-right px-5 py-3">Unit Price</th>
                  <th className="text-right px-5 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{item.description}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.quantity}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{symbol} {item.unit_price.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-800">{symbol} {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals — Item 2 redesign */}
            <div className="px-5 py-5 border-t border-gray-200 bg-gray-50">
              <div className="max-w-xs ml-auto space-y-2">
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
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{symbol} {invoice.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Amount Paid</span>
                  <span>− {symbol} {invoice.amount_paid.toLocaleString()}</span>
                </div>
                <div className={`rounded-xl px-4 py-3 mt-1 border ${
                  invoice.balance <= 0
                    ? "bg-green-50 border-green-200"
                    : invoice.status === "partial"
                    ? "bg-orange-50 border-orange-200"
                    : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-semibold ${
                      invoice.balance <= 0 ? "text-green-700" :
                      invoice.status === "partial" ? "text-orange-700" : "text-red-700"
                    }`}>
                      {invoice.balance <= 0 ? "✓ Fully Paid" : "Balance Due"}
                    </span>
                    <span className={`text-xl font-bold ${
                      invoice.balance <= 0 ? "text-green-700" :
                      invoice.status === "partial" ? "text-orange-700" : "text-red-700"
                    }`}>
                      {symbol} {Math.max(0, invoice.balance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Payment History</h3>
              {payments.length > 0 && (
                <span className="text-xs font-semibold text-emerald-600">
                  {payments.length} payment{payments.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No payments recorded yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Method</th>
                    <th className="text-right px-5 py-3">Amount</th>
                    <th className="text-left px-5 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(pay => (
                    <tr key={pay.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-600">{formatDate(pay.payment_date)}</td>
                      <td className="px-5 py-3">
                        <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">{pay.payment_method}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600">+ {symbol} {pay.amount.toLocaleString()}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{pay.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {invoice.notes && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Record Payment Modal */}
        {showPayModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-base font-semibold text-teal-800 mb-4">Record Payment</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-teal-600 mb-1 block">Amount *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder={`Balance: ${symbol} ${invoice.balance.toLocaleString()}`}
                    className="w-full border border-teal-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-teal-600 mb-1 block">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    className="w-full border border-teal-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {["Cash", "Card", "Bank Transfer", "JazzCash", "EasyPaisa", "Benefit", "Other"].map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-teal-600 mb-1 block">Notes (optional)</label>
                  <input
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    placeholder="Any notes..."
                    className="w-full border border-teal-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                {payError && <p className="text-red-500 text-xs">{payError}</p>}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleRecordPayment}
                    disabled={payLoading}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                  >
                    {payLoading ? "Recording..." : "Record Payment"}
                  </button>
                  <button
                    onClick={() => setShowPayModal(false)}
                    className="flex-1 border border-teal-200 text-teal-700 py-2.5 rounded-xl text-sm"
                  >
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
