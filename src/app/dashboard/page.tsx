"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [todayPatients, setTodayPatients] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingLabs, setPendingLabs] = useState(0);
  const [pendingFees, setPendingFees] = useState(0);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserEmail(user.email || "");

      const { data: patients } = await supabase.from("patients").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (patients) {
        const todayP = patients.filter(p => p.created_at?.startsWith(today));
        setTodayPatients(todayP.length);
        setTodayRevenue(todayP.reduce((sum, p) => sum + (p.fee_paid || 0), 0));
        setPendingFees(patients.reduce((sum, p) => sum + ((p.fee_total || 0) - (p.fee_paid || 0)), 0));
        setRecentPatients(patients.slice(0, 5));
      }

      const { data: labs } = await supabase.from("labs").select("status").eq("user_id", user.id);
      if (labs) setPendingLabs(labs.filter(l => l.status === "Pending").length);
    };
    fetchData();
  }, [router, today]);

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-teal-800 tracking-tight">Dashboard</h2>
          <p className="text-sm text-teal-600 mt-1">Welcome back, {userEmail}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6">
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1 md:mb-2">PATIENTS TODAY</p>
            <p className="text-xl md:text-3xl font-semibold text-teal-800">{todayPatients}</p>
            <p className="text-xs text-teal-400 mt-1">Treated today</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1 md:mb-2">REVENUE TODAY</p>
            <p className="text-lg md:text-3xl font-semibold text-teal-800">Rs {todayRevenue.toLocaleString()}</p>
            <p className="text-xs text-teal-400 mt-1">Collected today</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1 md:mb-2">PENDING LABS</p>
            <p className="text-xl md:text-3xl font-semibold text-teal-800">{pendingLabs}</p>
            <p className="text-xs text-teal-400 mt-1">Awaiting delivery</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 md:p-4 border border-orange-100">
            <p className="text-xs font-medium text-orange-600 mb-1 md:mb-2">PENDING FEES</p>
            <p className="text-lg md:text-3xl font-semibold text-orange-700">Rs {pendingFees.toLocaleString()}</p>
            <p className="text-xs text-orange-400 mt-1">Still to collect</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100">
          <h3 className="text-sm font-semibold text-teal-800 mb-4">Recent Patients</h3>
          {recentPatients.length === 0 ? (
            <p className="text-sm text-teal-400 text-center py-8">No patients added yet</p>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden flex flex-col gap-3">
                {recentPatients.map(p => (
                  <div key={p.id} className="border border-teal-100 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-teal-800 text-sm">{p.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-teal-600">{p.treatment}</p>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-teal-500">Dr. {p.doctor_name || "-"}</p>
                      <p className="text-xs font-medium text-teal-700">Rs {p.fee_paid}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-teal-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-teal-700 font-medium">Name</th>
                      <th className="text-left px-4 py-2 text-teal-700 font-medium">Doctor</th>
                      <th className="text-left px-4 py-2 text-teal-700 font-medium">Treatment</th>
                      <th className="text-left px-4 py-2 text-teal-700 font-medium">Fee</th>
                      <th className="text-left px-4 py-2 text-teal-700 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map(p => (
                      <tr key={p.id} className="border-t border-teal-50 hover:bg-teal-50">
                        <td className="px-4 py-2 font-medium text-teal-800">{p.name}</td>
                        <td className="px-4 py-2 text-teal-700">{p.doctor_name || "-"}</td>
                        <td className="px-4 py-2 text-teal-700">{p.treatment}</td>
                        <td className="px-4 py-2 text-teal-700">Rs {p.fee_paid}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                            {p.status}
                          </span>
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