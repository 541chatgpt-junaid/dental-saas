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

const statusColor = (s: string) => {
  if (s === "paid") return "bg-green-100 text-green-700";
  if (s === "partial") return "bg-blue-100 text-blue-700";
  if (s === "cancelled") return "bg-gray-100 text-gray-500";
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
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-teal-400 text-sm mt-14 md:mt-0">Loading invoice...</div>
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm mt-14 md:mt-0">Invoice not found.</div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => router.push("/dashboard/billing")} className="text-teal-500 hover:text-teal-700 text-sm">← Back</button>
            <h2 className="text-xl font-semibold text-teal-800">{invoice.invoice_number}</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(invoice.status)}`}>{statusLabel(invoice.status)}</span>
          </div>
          <div className="flex gap-2">
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
          <div className="bg-white rounded-xl border border-teal-100 p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-teal-500 mb-0.5">Patient</p>
                <p className="font-medium text-teal-800">{invoice.patients?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-teal-500 mb-0.5">Phone</p>
                <p className="text-teal-700">{invoice.patients?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-teal-500 mb-0.5">Invoice Date</p>
                <p className="text-teal-700">{formatDate(invoice.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-teal-500 mb-0.5">Due Date</p>
                <p className="text-teal-700">{invoice.due_date ? formatDate(invoice.due_date) : "—"}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-teal-100 bg-teal-50">
              <h3 className="text-sm font-semibold text-teal-800">Invoice Items</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-teal-600">
                <tr>
                  <th className="text-left px-5 py-2.5">Description</th>
                  <th className="text-center px-3 py-2.5">Qty</th>
                  <th className="text-right px-5 py-2.5">Unit Price</th>
                  <th className="text-right px-5 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-teal-50">
                    <td className="px-5 py-2.5 text-teal-800">{item.description}</td>
                    <td className="px-3 py-2.5 text-center text-teal-600">{item.quantity}</td>
                    <td className="px-5 py-2.5 text-right text-teal-700">{symbol} {item.unit_price.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-teal-800">{symbol} {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-teal-100 bg-teal-50">
              <div className="max-w-xs ml-auto space-y-2 text-sm">
                <div className="flex justify-between text-teal-600">
                  <span>Subtotal</span>
                  <span>{symbol} {invoice.subtotal.toLocaleString()}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-teal-600">
                    <span>Discount</span>
                    <span>− {symbol} {invoice.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-teal-800 pt-2 border-t border-teal-200">
                  <span>Total</span>
                  <span>{symbol} {invoice.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Amount Paid</span>
                  <span>{symbol} {invoice.amount_paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-orange-700 pt-2 border-t border-teal-200">
                  <span>Balance Due</span>
                  <span>{symbol} {invoice.balance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-teal-100 bg-teal-50">
              <h3 className="text-sm font-semibold text-teal-800">Payment History</h3>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-teal-400 text-center py-8">No payments recorded yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-teal-600">
                  <tr>
                    <th className="text-left px-5 py-2.5">Date</th>
                    <th className="text-left px-5 py-2.5">Method</th>
                    <th className="text-right px-5 py-2.5">Amount</th>
                    <th className="text-left px-5 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(pay => (
                    <tr key={pay.id} className="border-t border-teal-50">
                      <td className="px-5 py-2.5 text-teal-600">{formatDate(pay.payment_date)}</td>
                      <td className="px-5 py-2.5 text-teal-700">{pay.payment_method}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-green-700">{symbol} {pay.amount.toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-teal-400 text-xs">{pay.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {invoice.notes && (
            <div className="bg-white rounded-xl border border-teal-100 p-5">
              <p className="text-xs text-teal-500 mb-1">Notes</p>
              <p className="text-sm text-teal-700">{invoice.notes}</p>
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
                    {["Cash", "Card", "Bank Transfer", "Online", "Other"].map(m => (
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
