"use client";
import { useState, useEffect } from "react";
import { doctorName } from "@/lib/personName";
import { formatDate } from "@/lib/dateFormat";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft, ArrowRight, Phone, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";
import PatientFiles from "./PatientFiles";
import { billingOf, loadLedger, REGISTRATION_NOTE, type Ledgered } from "@/lib/ledger";

interface Patient {
  id: number;
  name: string;
  phone: string;
  age: number | null;
  gender: string;
  treatment: string;
  doctor_name: string;
  created_at: string;
}

type Invoice = Ledgered<{
  id: string;
  patient_id: number | null;
  invoice_number: string;
  status: string;
  due_date: string | null;
  created_at: string;
  notes: string | null;
}>;

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
  invoice_id: string;
  invoices: { invoice_number: string } | null;
}


// Colours for the shared ledger statuses (getInvoiceStatus)
const statusColor = (s: string) => {
  if (s === "overdue") return "bg-red-100 text-red-700";
  if (s === "paid") return "bg-green-100 text-green-700";
  if (s === "partial") return "bg-blue-100 text-blue-700";
  if (s === "cancelled") return "bg-gray-100 text-gray-500";
  if (s === "draft") return "bg-purple-100 text-purple-700";
  if (s === "sent") return "bg-sky-100 text-sky-700";
  return "bg-orange-100 text-orange-700";
};

export default function PatientHistoryPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { symbol } = useCurrency();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"invoices" | "payments" | "files">("invoices");
  const { clinicId } = useClinic();

  useEffect(() => {
    const supabase = createClient();
    const fetchAll = async () => {
      // clinic_id filter in code too: a guessed patient id can't open another clinic's record
      let patientQ = supabase.from("patients").select("*").eq("id", Number(id));
      if (clinicId) patientQ = patientQ.eq("clinic_id", clinicId);
      const [{ data: p }, ledger] = await Promise.all([
        patientQ.maybeSingle(),
        loadLedger<Invoice>(supabase, { patientId: Number(id), clinicId }).catch(() => ({ invoices: [] as Invoice[], payments: [] })),
      ]);
      setPatient(p || null);
      setInvoices(ledger.invoices);
      setPayments(ledger.payments
        .map(pay => ({ ...pay, invoices: pay.invoice ? { invoice_number: pay.invoice.invoice_number } : null }) as Payment)
        .reverse());
      setLoading(false);
    };
    fetchAll();
  }, [id, clinicId]);

  // Draft and cancelled invoices are left out of every total
  const { totalBilled, totalPaid, outstanding } = billingOf(invoices);
  const registration = invoices.find(i => i.notes === REGISTRATION_NOTE && i.counted);

  if (loading) return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm mt-14 md:mt-0">Loading…</div>
    </div>
  );

  if (!patient) return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm mt-14 md:mt-0">Patient not found.</div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard/patients")} className="text-brand-500 hover:text-brand-700 text-sm"><ArrowLeft className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Back</button>
          <div>
            <h2 className="text-xl font-semibold text-brand-800">{patient.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Financial History</p>
          </div>
        </div>

        {/* Patient Info Bar */}
        <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {patient.phone && <span className="text-gray-600"><Phone className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{patient.phone}</span>}
            {patient.age && <span className="text-gray-500">{patient.age} yrs</span>}
            {patient.gender && <span className="text-gray-500">{patient.gender}</span>}
            {patient.doctor_name && <span className="text-gray-500">{doctorName(patient.doctor_name)}</span>}
            {patient.treatment && <span className="text-gray-500">{patient.treatment}</span>}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-5">
          <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Billed</p>
            <p className="text-lg font-bold text-brand-800">{symbol} {totalBilled.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Paid</p>
            <p className="text-lg font-bold text-emerald-600">{symbol} {totalPaid.toLocaleString()}</p>
          </div>
          <div className={`rounded-xl border shadow-sm p-4 text-center ${outstanding > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1 text-gray-500">Outstanding</p>
            <p className={`text-lg font-bold ${outstanding > 0 ? "text-orange-600" : "text-green-600"}`}>{symbol} {outstanding.toLocaleString()}</p>
          </div>
        </div>

        {/* Registration invoice, with its current figures from the ledger */}
        {registration && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-sm text-blue-800">
            Registration receipt ({registration.invoice_number}): {symbol} {registration.amount_paid.toLocaleString()} paid of {symbol} {registration.total.toLocaleString()} total
            {registration.balance > 0 && (
              <span className="ml-2 font-semibold text-orange-700">({symbol} {registration.balance.toLocaleString()} pending)</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-brand-200 shadow-sm rounded-xl p-1 mb-5 w-fit">
          {(["invoices", "payments", "files"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {t === "files" ? "X-rays & photos" : `${t} (${t === "invoices" ? invoices.length : payments.length})`}
            </button>
          ))}
        </div>

        {tab === "invoices" && (
          <>
            {invoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices yet" hint="Invoices you create for this patient will show here." />
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden flex flex-col gap-3">
                  {invoices.map(inv => (
                    <div key={inv.id} className="bg-white rounded-xl border border-brand-200 shadow-sm p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-brand-700 text-sm">{inv.invoice_number}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(inv.state.toLowerCase())}`}>{inv.state}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>{formatDate(inv.created_at)}</span>
                        {inv.due_date && <span>Due: {formatDate(inv.due_date)}</span>}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Total: {symbol} {inv.total.toLocaleString()}</span>
                        <span className="text-emerald-600">Paid: {symbol} {inv.amount_paid.toLocaleString()}</span>
                        {inv.balance > 0 && <span className="text-orange-600 font-semibold">Bal: {symbol} {inv.balance.toLocaleString()}</span>}
                      </div>
                      <button onClick={() => router.push(`/dashboard/billing/${inv.id}`)} className="mt-2 text-xs text-brand-600 font-semibold hover:underline">View Invoice <ArrowRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" /></button>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="hidden md:block bg-white rounded-xl border border-brand-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-brand-50 border-b border-brand-200 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-5 py-3">Invoice #</th>
                        <th className="text-left px-5 py-3">Date</th>
                        <th className="text-left px-5 py-3">Due Date</th>
                        <th className="text-right px-5 py-3">Total</th>
                        <th className="text-right px-5 py-3">Paid</th>
                        <th className="text-right px-5 py-3">Balance</th>
                        <th className="text-left px-5 py-3">Status</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id} className="border-t border-brand-100 hover:bg-brand-50">
                          <td className="px-5 py-3 font-semibold text-brand-700">{inv.invoice_number}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(inv.created_at)}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                          <td className="px-5 py-3 text-right font-semibold text-brand-800">{symbol} {inv.total.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-emerald-600 font-medium">{symbol} {inv.amount_paid.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-bold text-orange-600">{symbol} {inv.balance.toLocaleString()}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(inv.state.toLowerCase())}`}>{inv.state}</span>
                          </td>
                          <td className="px-5 py-3">
                            <button onClick={() => router.push(`/dashboard/billing/${inv.id}`)} className="text-brand-600 text-xs font-semibold hover:underline">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {tab === "files" && <PatientFiles patientId={Number(id)} clinicId={clinicId} />}

        {tab === "payments" && (
          <>
            {payments.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No payments recorded for this patient</div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden flex flex-col gap-3">
                  {payments.map(pay => (
                    <div key={pay.id} className="bg-white rounded-xl border border-brand-200 shadow-sm p-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-emerald-600 font-bold text-sm">+ {symbol} {pay.amount.toLocaleString()}</span>
                        <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">{pay.payment_method}</span>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(pay.payment_date)}</p>
                      {pay.invoices?.invoice_number && (
                        <p className="text-xs text-brand-600 mt-0.5">{pay.invoices.invoice_number}</p>
                      )}
                      {pay.notes && <p className="text-xs text-gray-400 mt-0.5">{pay.notes}</p>}
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="hidden md:block bg-white rounded-xl border border-brand-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-brand-50 border-b border-brand-200 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-5 py-3">Date</th>
                        <th className="text-left px-5 py-3">Invoice</th>
                        <th className="text-left px-5 py-3">Method</th>
                        <th className="text-right px-5 py-3">Amount</th>
                        <th className="text-left px-5 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(pay => (
                        <tr key={pay.id} className="border-t border-brand-100 hover:bg-brand-50">
                          <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(pay.payment_date)}</td>
                          <td className="px-5 py-3 text-brand-600 text-xs font-medium">{pay.invoices?.invoice_number || "—"}</td>
                          <td className="px-5 py-3">
                            <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">{pay.payment_method}</span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-emerald-600">+ {symbol} {pay.amount.toLocaleString()}</td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{pay.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
