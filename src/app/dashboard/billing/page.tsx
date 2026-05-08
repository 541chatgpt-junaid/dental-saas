"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";
import Link from "next/link";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  created_at: string;
  due_date: string | null;
  patients: { name: string } | null;
}

const STATUS_TABS = ["All", "Unpaid", "Partial", "Paid", "Cancelled"];

const statusColor = (s: string) => {
  if (s === "Paid") return "bg-green-100 text-green-700";
  if (s === "Partial") return "bg-blue-100 text-blue-700";
  if (s === "Cancelled") return "bg-gray-100 text-gray-500";
  return "bg-orange-100 text-orange-700";
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

  useEffect(() => {
    if (!clinicId) return;
    const supabase = createClient();
    supabase
      .from("invoices")
      .select("*, patients(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setInvoices(data || []); setLoading(false); });
  }, [clinicId]);

  const filtered = invoices.filter(inv => {
    const matchTab = tab === "All" || inv.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.patients?.name || "").toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Billing & Invoices</h2>
            <p className="text-sm text-teal-600 mt-1">Manage invoices and payments</p>
          </div>
          <Link
            href="/dashboard/billing/new"
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium text-center"
          >
            + New Invoice
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="flex gap-1 bg-white border border-teal-100 rounded-xl p-1 overflow-x-auto">
            {STATUS_TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t ? "bg-teal-600 text-white" : "text-teal-600 hover:bg-teal-50"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            placeholder="Search invoice # or patient..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-teal-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-teal-400 text-sm">Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-teal-400 text-sm">No invoices found</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.map(inv => (
                <div key={inv.id} className="bg-white rounded-xl border border-teal-100 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-teal-800 text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-teal-500">{inv.patients?.name || "—"}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>{inv.status}</span>
                  </div>
                  <div className="flex justify-between text-xs text-teal-600 mb-3">
                    <span>Total: {symbol} {inv.total.toLocaleString()}</span>
                    <span>Bal: {symbol} {inv.balance.toLocaleString()}</span>
                    <span>{formatDate(inv.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/billing/${inv.id}`)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 font-medium"
                    >
                      View
                    </button>
                    {inv.status !== "Paid" && inv.status !== "Cancelled" && (
                      <button
                        onClick={() => router.push(`/dashboard/billing/${inv.id}?pay=1`)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white font-medium"
                      >
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block bg-white rounded-xl border border-teal-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-teal-50 border-b border-teal-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-teal-700 font-medium">Invoice #</th>
                    <th className="text-left px-5 py-3 text-teal-700 font-medium">Patient</th>
                    <th className="text-left px-5 py-3 text-teal-700 font-medium">Date</th>
                    <th className="text-right px-5 py-3 text-teal-700 font-medium">Total</th>
                    <th className="text-right px-5 py-3 text-teal-700 font-medium">Paid</th>
                    <th className="text-right px-5 py-3 text-teal-700 font-medium">Balance</th>
                    <th className="text-left px-5 py-3 text-teal-700 font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-teal-700 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id} className="border-t border-teal-50 hover:bg-teal-50">
                      <td className="px-5 py-3 font-medium text-teal-800">{inv.invoice_number}</td>
                      <td className="px-5 py-3 text-teal-700">{inv.patients?.name || "—"}</td>
                      <td className="px-5 py-3 text-teal-500 text-xs">{formatDate(inv.created_at)}</td>
                      <td className="px-5 py-3 text-right font-medium text-teal-800">{symbol} {inv.total.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-green-700">{symbol} {inv.amount_paid.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-medium text-orange-700">{symbol} {inv.balance.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>{inv.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => router.push(`/dashboard/billing/${inv.id}`)}
                            className="text-teal-600 text-xs font-medium hover:underline"
                          >
                            View
                          </button>
                          {inv.status !== "Paid" && inv.status !== "Cancelled" && (
                            <button
                              onClick={() => router.push(`/dashboard/billing/${inv.id}?pay=1`)}
                              className="text-orange-600 text-xs font-medium hover:underline"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
