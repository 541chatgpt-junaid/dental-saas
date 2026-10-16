"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import CountUp from "@/components/CountUp";

type RecentPatient = {
  id: string;
  name: string;
  doctor_name: string | null;
  treatment: string | null;
  fee_paid: number | null;
  status: string;
};

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [todayPatients, setTodayPatients] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingLabs, setPendingLabs] = useState(0);
  const [pendingFees, setPendingFees] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [topTreatment, setTopTreatment] = useState("—");
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const router = useRouter();
  const { symbol } = useCurrency();

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserEmail(user.email || "");

      const tomorrow = new Date(`${today}T00:00:00Z`);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Fetch only the columns and rows each card needs, all in parallel
      const [total, todayRows, feeRows, recent, invItems, labs, invoices, monthPayments] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("fee_paid").gte("created_at", today).lt("created_at", tomorrow.toISOString()),
        supabase.from("patients").select("fee_total, fee_paid"),
        supabase.from("patients").select("id, name, doctor_name, treatment, fee_paid, status").order("created_at", { ascending: false }).limit(5),
        supabase.from("invoice_items").select("description"),
        supabase.from("labs").select("id", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("invoices").select("balance").in("status", ["unpaid", "partial"]),
        supabase.from("payments").select("amount").gte("payment_date", monthStart.toISOString()),
      ]);

      setTotalPatients(total.count ?? 0);
      if (todayRows.data) {
        setTodayPatients(todayRows.data.length);
        setTodayRevenue(todayRows.data.reduce((sum, p) => sum + (p.fee_paid || 0), 0));
      }
      if (feeRows.data) setPendingFees(feeRows.data.reduce((sum, p) => sum + ((p.fee_total || 0) - (p.fee_paid || 0)), 0));
      if (recent.data) setRecentPatients(recent.data);

      if (invItems.data && invItems.data.length > 0) {
        const counts: Record<string, number> = {};
        invItems.data.forEach(t => { counts[t.description] = (counts[t.description] || 0) + 1; });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        setTopTreatment(top?.[0] || "—");
      }

      setPendingLabs(labs.count ?? 0);
      if (invoices.data) setPendingPayments(invoices.data.reduce((sum, i) => sum + (i.balance || 0), 0));
      if (monthPayments.data) setRevenueThisMonth(monthPayments.data.reduce((sum, p) => sum + (p.amount || 0), 0));
    };
    fetchData();
  }, [router, today]);

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Overview</p>
          <h2 className="mt-1 text-2xl md:text-3xl font-semibold text-brand-800 tracking-tight">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {userEmail}</p>
        </div>

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
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Pending Payments</p>
            <p className="text-lg md:text-2xl font-bold text-red-600">{symbol} <CountUp value={pendingPayments} /></p>
            <p className="text-xs text-gray-400 mt-1">Invoice balance due</p>
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
            <p className="text-sm text-gray-400 text-center py-8">No patients added yet</p>
          ) : (
            <>
              <div className="md:hidden flex flex-col gap-3">
                {recentPatients.map(p => (
                  <div key={p.id} className="border border-brand-200 rounded-xl p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-brand-800 text-sm">{p.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{p.status}</span>
                    </div>
                    <p className="text-xs text-gray-600">{p.treatment}</p>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">Dr. {p.doctor_name || "-"}</p>
                      <p className="text-xs font-semibold text-gray-700">{symbol} {p.fee_paid}</p>
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
                        <td className="px-4 py-3 text-gray-600">{p.doctor_name || "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{p.treatment}</td>
                        <td className="px-4 py-3 font-medium text-gray-700">{symbol} {p.fee_paid}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{p.status}</span>
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