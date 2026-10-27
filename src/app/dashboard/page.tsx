"use client";
import { useEffect, useState } from "react";
import { doctorName, titleCase } from "@/lib/personName";
import EmptyState from "@/components/EmptyState";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import CountUp from "@/components/CountUp";
import Link from "next/link";
import { BellRing, ChevronRight, Globe, PackageX } from "lucide-react";
import { useClinic } from "@/lib/ClinicContext";
import { billingByPatient, countedPayments, loadLedger, NO_BILLS, sumPaymentsBetween, type PatientBilling } from "@/lib/ledger";

type RecentPatient = {
  id: string;
  name: string;
  doctor_name: string | null;
  treatment: string | null;
  billing: PatientBilling;
};

const badge = (s: string) =>
  s === "Paid" ? "bg-green-100 text-green-700" : s === "Partial" ? "bg-yellow-100 text-yellow-700" : s === "Overdue" ? "bg-red-100 text-red-700" : s === "—" ? "bg-gray-100 text-gray-500" : "bg-orange-100 text-orange-700";

export default function Dashboard() {
  const [userName, setUserName] = useState("");
  const [sampleCount, setSampleCount] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [todayPatients, setTodayPatients] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingLabs, setPendingLabs] = useState(0);
  const [pendingFees, setPendingFees] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [topTreatment, setTopTreatment] = useState("—");
  const [recallsDue, setRecallsDue] = useState(0);
  const [bookingRequests, setBookingRequests] = useState(0);
  const [stockAlerts, setStockAlerts] = useState({ low: 0, expiring: 0 });
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

  const today = new Date().toISOString().split("T")[0];

  // Clinics that loaded sample data in the setup wizard get a way to remove it
  useEffect(() => {
    fetch("/api/onboarding").then(r => r.json()).then(d => setSampleCount(d.sampleCount || 0)).catch(() => {});
  }, []);

  const removeSamples = async () => {
    if (!confirm("Remove the sample patients and appointments? Anything you added to them is removed too. Your own records are not touched.")) return;
    setRemoving(true);
    const res = await fetch("/api/onboarding", { method: "DELETE" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || json.error) { setRemoving(false); alert(json.error || "Could not remove the sample data. Please try again."); return; }
    window.location.reload();
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      // Greeting name: staff row name, else auth metadata, else the email's local part
      const { data: staffRow } = await supabase.from("staff").select("name").eq("user_id", user.id).maybeSingle();
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const raw = String(staffRow?.name || meta.full_name || meta.name || (user.email || "").split("@")[0] || "").trim();
      setUserName(titleCase(raw.replace(/[._]+/g, " ")));

      const tomorrow = new Date(`${today}T00:00:00Z`);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Fetch only the columns and rows each card needs, all in parallel
      const [total, todayRows, recent, invItems, labs, ledger] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", today).lt("created_at", tomorrow.toISOString()),
        supabase.from("patients").select("id, name, doctor_name, treatment").order("created_at", { ascending: false }).limit(5),
        supabase.from("invoice_items").select("description"),
        supabase.from("labs").select("id", { count: "exact", head: true }).eq("status", "Pending"),
        loadLedger(supabase, { clinicId, select: "id, patient_id, status, subtotal, discount, total, amount_paid, due_date, created_at, notes" }).catch(() => null),
      ]);

      setTotalPatients(total.count ?? 0);
      setTodayPatients(todayRows.count ?? 0);

      // Money cards: only the ledger (invoices + payments), drafts and cancelled invoices left out
      const byPatient = ledger ? billingByPatient(ledger.invoices) : {};
      if (recent.data) setRecentPatients(recent.data.map(p => ({ ...p, billing: byPatient[Number(p.id)] ?? NO_BILLS })));
      if (ledger) {
        const paid = countedPayments(ledger.payments, ledger.invoices);
        setTodayRevenue(sumPaymentsBetween(paid, new Date(`${today}T00:00:00Z`), tomorrow));
        setRevenueThisMonth(sumPaymentsBetween(paid, monthStart));
        const open = ledger.invoices.filter(i => i.counted && i.balance > 0);
        setPendingFees(open.reduce((sum, i) => sum + i.balance, 0));
        setPendingPayments(open.filter(i => i.state === "Overdue").reduce((sum, i) => sum + i.balance, 0));
      }

      if (invItems.data && invItems.data.length > 0) {
        const counts: Record<string, number> = {};
        invItems.data.forEach(t => { counts[t.description] = (counts[t.description] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        setTopTreatment(top?.[0] || "—");
      }

      setPendingLabs(labs.count ?? 0);

      // Recalls due within a week (table may not exist yet; ignore errors)
      const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const recalls = await supabase.from("recalls").select("id", { count: "exact", head: true })
        .in("status", ["pending", "contacted"]).lte("due_date", weekAhead);
      if (!recalls.error) setRecallsDue(recalls.count ?? 0);

      const requests = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Requested");
      if (!requests.error) setBookingRequests(requests.count ?? 0);

      // Inventory: low stock and items expired / expiring within 30 days
      const { data: stock } = await supabase.from("materials").select("*");
      if (stock) {
        const soon = new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-CA");
        setStockAlerts({
          low: stock.filter(m => (m.quantity ?? 0) <= (m.min_quantity ?? 0)).length,
          expiring: stock.filter(m => m.expiry_date && m.expiry_date <= soon).length,
        });
      }
    };
    fetchData();
  }, [router, today, clinicId]);

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Overview</p>
          <h2 className="mt-1 text-2xl md:text-3xl font-semibold text-brand-800 tracking-tight">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Welcome back{userName ? `, ${userName}` : ""}</p>
        </div>

        {sampleCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-3 md:p-4">
            <p className="flex-1 text-sm text-brand-800">
              <span className="font-semibold">You are looking at sample data.</span> It is marked &quot;Sample&quot; and never affects your bills.
            </p>
            <button onClick={removeSamples} disabled={removing} className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:border-gold disabled:opacity-60">
              {removing ? "Removing…" : "Remove sample data"}
            </button>
          </div>
        )}

        {bookingRequests > 0 && (
          <Link href="/dashboard/appointments" className="card-hover mb-4 flex items-center gap-3 rounded-xl border border-gold/40 bg-white p-3 md:p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold"><Globe className="h-5 w-5" /></span>
            <p className="flex-1 text-sm text-brand-800">
              <span className="font-semibold">{bookingRequests} online booking request{bookingRequests === 1 ? "" : "s"}</span> waiting for you to confirm.
            </p>
            <ChevronRight className="h-4 w-4 text-brand-400" />
          </Link>
        )}

        {(stockAlerts.low > 0 || stockAlerts.expiring > 0) && (
          <Link href="/dashboard/materials" className="card-hover mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-white p-3 md:p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"><PackageX className="h-5 w-5" /></span>
            <p className="flex-1 text-sm text-brand-800">
              <span className="font-semibold">Inventory needs attention:</span>
              {stockAlerts.low > 0 && ` ${stockAlerts.low} item${stockAlerts.low === 1 ? "" : "s"} low on stock`}
              {stockAlerts.low > 0 && stockAlerts.expiring > 0 && " ·"}
              {stockAlerts.expiring > 0 && ` ${stockAlerts.expiring} expired or expiring within 30 days`}
            </p>
            <ChevronRight className="h-4 w-4 text-brand-400" />
          </Link>
        )}

        {recallsDue > 0 && (
          <Link href="/dashboard/recalls" className="card-hover mb-4 flex items-center gap-3 rounded-xl border border-gold/40 bg-white p-3 md:p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold"><BellRing className="h-5 w-5" /></span>
            <p className="flex-1 text-sm text-brand-800">
              <span className="font-semibold">{recallsDue} patient{recallsDue === 1 ? " is" : "s are"} due for recall</span> this week. Send them a WhatsApp reminder.
            </p>
            <ChevronRight className="h-4 w-4 text-brand-400" />
          </Link>
        )}

        <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
          <div className="card-hover bg-white rounded-xl p-3 md:p-5 border border-brand-200 shadow-sm">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">Patients Today</p>
            <p className="text-2xl md:text-3xl font-bold text-brand-800"><CountUp value={todayPatients} /></p>
            <p className="text-xs text-gray-400 mt-1">New registrations</p>
          </div>
          <div className="card-hover bg-white rounded-xl p-3 md:p-5 border border-brand-200 shadow-sm">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">Revenue Today</p>
            <p className="text-lg md:text-2xl font-bold text-brand-800">{symbol} <CountUp value={todayRevenue} /></p>
            <p className="text-xs text-gray-400 mt-1">Collected today</p>
          </div>
          <div className="card-hover bg-white rounded-xl p-3 md:p-5 border border-brand-200 shadow-sm">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">Total Patients</p>
            <p className="text-2xl md:text-3xl font-bold text-brand-800"><CountUp value={totalPatients} /></p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>
          <div className="card-hover bg-white rounded-xl p-3 md:p-5 border border-brand-200 shadow-sm">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">Pending Labs</p>
            <p className="text-2xl md:text-3xl font-bold text-brand-800"><CountUp value={pendingLabs} /></p>
            <p className="text-xs text-gray-400 mt-1">Awaiting delivery</p>
          </div>
        </div>

        <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="card-hover bg-white rounded-xl p-3 md:p-5 border-l-4 border-l-orange-400 border border-brand-200 shadow-sm">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Pending Fees</p>
            <p className="text-lg md:text-2xl font-bold text-orange-600">{symbol} <CountUp value={pendingFees} /></p>
            <p className="text-xs text-gray-400 mt-1">Still to collect</p>
          </div>
          <div className="card-hover bg-white rounded-xl p-3 md:p-5 border-l-4 border-l-red-400 border border-brand-200 shadow-sm">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Overdue Payments</p>
            <p className="text-lg md:text-2xl font-bold text-red-600">{symbol} <CountUp value={pendingPayments} /></p>
            <p className="text-xs text-gray-400 mt-1">Part of pending, past due date</p>
          </div>
          <div className="card-hover bg-white rounded-xl p-3 md:p-5 border-l-4 border-l-green-400 border border-brand-200 shadow-sm">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Revenue This Month</p>
            <p className="text-lg md:text-2xl font-bold text-green-600">{symbol} <CountUp value={revenueThisMonth} /></p>
            <p className="text-xs text-gray-400 mt-1">Payments received</p>
          </div>
          <div className="card-hover bg-white rounded-xl p-3 md:p-5 border-l-4 border-l-gold border border-brand-200 shadow-sm">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">Top Treatment</p>
            <p className="text-sm md:text-base font-bold text-brand-800 leading-tight mt-1">{topTreatment}</p>
            <p className="text-xs text-gray-400 mt-1">Most billed</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-brand-200 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-800 mb-4">Recent Patients</h3>
          {recentPatients.length === 0 ? (
            <EmptyState icon={Users} title="No patients yet" hint="New patients will appear here as you register them." />
          ) : (
            <>
              <div className="md:hidden flex flex-col gap-3">
                {recentPatients.map(p => (
                  <div key={p.id} className="border border-brand-200 rounded-xl p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-brand-800 text-sm">{p.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge(p.billing.status)}`}>{p.billing.status}</span>
                    </div>
                    <p className="text-xs text-gray-600">{p.treatment}</p>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">{doctorName(p.doctor_name) || "-"}</p>
                      <p className="text-xs font-semibold text-gray-700">{symbol} {p.billing.totalPaid.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-50 border-b border-brand-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase tracking-wide">Doctor</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase tracking-wide">Treatment</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase tracking-wide">Fee Paid</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold text-xs uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map(p => (
                      <tr key={p.id} className="border-t border-brand-100 hover:bg-brand-50">
                        <td className="px-4 py-3 font-semibold text-brand-800">{p.name}</td>
                        <td className="px-4 py-3 text-gray-600">{doctorName(p.doctor_name) || "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{p.treatment}</td>
                        <td className="px-4 py-3 font-medium text-gray-700">{symbol} {p.billing.totalPaid.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge(p.billing.status)}`}>{p.billing.status}</span>
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
    </div>
  );
}