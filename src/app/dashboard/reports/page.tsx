"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { useCurrency } from "@/lib/useCurrency";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

export default function Reports() {
  const [filter, setFilter] = useState("month");
  const [income, setIncome] = useState(0);
  const [labCost, setLabCost] = useState(0);
  const [manualExpenses, setManualExpenses] = useState(0);
  const [materialCost, setMaterialCost] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [pendingFees, setPendingFees] = useState(0);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [expensePieData, setExpensePieData] = useState<any[]>([]);
  const [treatmentData, setTreatmentData] = useState<any[]>([]);
  const router = useRouter();
  const { symbol } = useCurrency();

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { data: patients } = await supabase.from("patients").select("*").eq("user_id", user.id);
    if (patients) {
      setAllPatients(patients);
      const filtered = patients.filter(p => {
        if (filter === "today") return p.created_at?.startsWith(today);
        if (filter === "month") return p.created_at?.startsWith(thisMonth);
        return true;
      });
      setIncome(filtered.reduce((sum, p) => sum + (p.fee_paid || 0), 0));
      setPatientCount(filtered.length);
      setPendingFees(filtered.reduce((sum, p) => sum + ((p.fee_total || 0) - (p.fee_paid || 0)), 0));

      // Monthly data for last 6 months
      const last6Months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toISOString().slice(0, 7);
        const monthName = d.toLocaleString("default", { month: "short" });
        const monthPatients = patients.filter(p => p.created_at?.startsWith(monthKey));
        last6Months.push({
          month: monthName,
          income: monthPatients.reduce((sum, p) => sum + (p.fee_paid || 0), 0),
          patients: monthPatients.length,
          pending: monthPatients.reduce((sum, p) => sum + ((p.fee_total || 0) - (p.fee_paid || 0)), 0),
        });
      }
      setMonthlyData(last6Months);

      // Treatment breakdown
      const treatmentMap: Record<string, number> = {};
      patients.forEach(p => {
        if (p.treatment) {
          treatmentMap[p.treatment] = (treatmentMap[p.treatment] || 0) + 1;
        }
      });
      const treatmentArr = Object.entries(treatmentMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setTreatmentData(treatmentArr);
    }

    const { data: labs } = await supabase.from("labs").select("fee_paid, created_at").eq("user_id", user.id);
    if (labs) {
      const filtered = labs.filter(l => {
        if (filter === "today") return l.created_at?.startsWith(today);
        if (filter === "month") return l.created_at?.startsWith(thisMonth);
        return true;
      });
      setLabCost(filtered.reduce((sum, l) => sum + (l.fee_paid || 0), 0));
    }

    const { data: expenses } = await supabase.from("expenses").select("*").eq("user_id", user.id);
    if (expenses) {
      setAllExpenses(expenses);
      const filtered = expenses.filter(e => {
        if (filter === "today") return e.date === today;
        if (filter === "month") return e.date?.startsWith(thisMonth);
        return true;
      });
      const manual = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
      setManualExpenses(manual);

      // Expense pie data
      const categoryMap: Record<string, number> = {};
      filtered.forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
      });
      const pieArr = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
      setExpensePieData(pieArr);
    }

    const { data: materials } = await supabase.from("materials").select("price, quantity").eq("user_id", user.id);
    if (materials) setMaterialCost(materials.reduce((sum, m) => sum + ((m.price || 0) * (m.quantity || 0)), 0));

    const { data: purchases } = await supabase.from("purchases").select("*").eq("user_id", user.id);
    if (purchases) setAllPurchases(purchases);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const totalExpenses = labCost + manualExpenses + materialCost;
  const profit = income - totalExpenses;

  const PIE_COLORS = ["#0d9488", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#10b981"];

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const patientsData = allPatients.map(p => ({
      ID: p.id, Name: p.name, Phone: p.phone, Age: p.age,
      Gender: p.gender, Doctor: p.doctor_name, Treatment: p.treatment,
      "Total Fee": p.fee_total, "Fee Paid": p.fee_paid,
      Remaining: p.fee_total - p.fee_paid, Status: p.status,
      Date: new Date(p.created_at).toLocaleDateString(),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientsData), "Patients");
    const expensesData = allExpenses.map(e => ({
      Title: e.title, Category: e.category, Amount: e.amount, Date: e.date,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData), "Expenses");
    const summaryData = [
      { Category: "Total Patients", Value: patientCount },
      { Category: "Total Income", Value: income },
      { Category: "Pending Fees", Value: pendingFees },
      { Category: "Lab Costs", Value: labCost },
      { Category: "Material Costs", Value: materialCost },
      { Category: "Other Expenses", Value: manualExpenses },
      { Category: "Total Expenses", Value: totalExpenses },
      { Category: "Net Profit", Value: profit },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Summary");
    const date = new Date().toLocaleDateString().replace(/\//g, "-");
    XLSX.writeFile(wb, `DentEase-Report-${date}.xlsx`);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-teal-100 rounded-lg p-3 shadow-lg">
          <p className="text-xs font-semibold text-teal-800 mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === "number" && entry.name !== "Patients"
                ? `${symbol} ${entry.value.toLocaleString()}`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Reports</h2>
            <p className="text-sm text-teal-600 mt-1">Profit & Loss Summary</p>
          </div>
          <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">
            📊 Export
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {["today", "month", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 md:px-5 py-2 rounded-lg text-xs md:text-sm font-medium ${filter === f ? "bg-teal-600 text-white" : "bg-white text-teal-700 border border-teal-200"}`}>
              {f === "today" ? "Today" : f === "month" ? "Month" : "All Time"}
            </button>
          ))}
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-5 mb-6">
          <div className="bg-white rounded-xl p-3 md:p-5 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">PATIENTS</p>
            <p className="text-2xl md:text-3xl font-semibold text-teal-800">{patientCount}</p>
            <p className="text-xs text-teal-400 mt-1">Treated</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-5 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">PENDING</p>
            <p className="text-lg md:text-3xl font-semibold text-orange-500">{symbol} {pendingFees.toLocaleString()}</p>
            <p className="text-xs text-teal-400 mt-1">To collect</p>
          </div>
          <div className={`rounded-xl p-3 md:p-5 border ${profit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-xs font-medium mb-1 ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>PROFIT</p>
            <p className={`text-lg md:text-3xl font-semibold ${profit >= 0 ? "text-green-700" : "text-red-700"}`}>{symbol} {profit.toLocaleString()}</p>
            <p className={`text-xs mt-1 ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>{profit >= 0 ? "Net Profit" : "Net Loss"}</p>
          </div>
        </div>

        {/* Income & Expense Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">💰 Income</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-teal-50">
                <span className="text-sm text-teal-700">Patient Fees</span>
                <span className="text-sm font-semibold text-green-600">{symbol} {income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-semibold text-teal-800">Total</span>
                <span className="text-sm font-bold text-green-700">{symbol} {income.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">💸 Expenses</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-teal-50">
                <span className="text-sm text-teal-700">Lab Costs</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {labCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-teal-50">
                <span className="text-sm text-teal-700">Material Costs</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {materialCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-teal-50">
                <span className="text-sm text-teal-700">Rent / Salary / Other</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {manualExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-semibold text-teal-800">Total</span>
                <span className="text-sm font-bold text-red-600">{symbol} {totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 1 — Monthly Income & Patients */}
        <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100 mb-6">
          <h3 className="text-sm font-semibold text-teal-800 mb-4">📈 Monthly Income — Last 6 Months</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdfa" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 — Monthly Patients Line */}
        <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100 mb-6">
          <h3 className="text-sm font-semibold text-teal-800 mb-4">👥 Monthly Patients — Last 6 Months</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdfa" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="patients" name="Patients" stroke="#0d9488" strokeWidth={2} dot={{ fill: "#0d9488", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3 & 4 — Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Expense Breakdown Pie */}
          <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">🥧 Expense Breakdown</h3>
            {expensePieData.length === 0 ? (
              <p className="text-center text-teal-400 text-sm py-8">No expense data</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`} labelLine={false}>
                      {expensePieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${symbol} ${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Treatment Breakdown */}
          <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">🦷 Top Treatments</h3>
            {treatmentData.length === 0 ? (
              <p className="text-center text-teal-400 text-sm py-8">No treatment data</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={treatmentData} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0fdfa" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
                    <Tooltip />
                    <Bar dataKey="count" name="Patients" fill="#0d9488" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}