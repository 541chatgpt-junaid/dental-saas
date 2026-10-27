"use client";
import { useState, useEffect } from "react";
import { doctorName } from "@/lib/personName";
import { todayISO } from "@/lib/formSave";
import { formatDate } from "@/lib/dateFormat";
import { Banknote, BarChart3, ChartPie, Stethoscope, TrendingUp, Users, Wallet } from "lucide-react";
import { useTheme } from "@/lib/useTheme";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { useCurrency } from "@/lib/useCurrency";
import { billingByPatient, countedPayments, doctorResolver, loadLedger, NO_BILLS, type LedgerInvoiceRow, type LedgerPaymentRow } from "@/lib/ledger";
import { invoiceSheet, patientSheet, paymentSheet } from "@/lib/exportBook";
import { useClinic } from "@/lib/ClinicContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

type LedgerInvoices = Awaited<ReturnType<typeof loadLedger<LedgerInvoiceRow & { invoice_number?: string | null }>>>["invoices"];
type PeriodPayments = ReturnType<typeof countedPayments<LedgerPaymentRow, LedgerInvoices[number]>>;

export default function Reports() {
  const { dark } = useTheme();
  // Chart ink: navy on the light theme, cream on the dark theme
  const INK = dark ? "#e6e2d6" : "#0f1d3d";
  const GRID = dark ? "#26345a" : "#ede8db";
  const [filter, setFilter] = useState("month");
  const [chartRange, setChartRange] = useState("6");
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
  const [doctorData, setDoctorData] = useState<any[]>([]);
  // Ledger rows kept for the export: counted invoices and the period's counted payments
  const [ledgerInvoices, setLedgerInvoices] = useState<LedgerInvoices>([]);
  const [periodPayments, setPeriodPayments] = useState<PeriodPayments>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const { clinicId } = useClinic();
  const { symbol } = useCurrency();

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const fetchData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    // Income and pending come only from the ledger: payments and invoice balances
    // (draft and cancelled invoices left out)
    const [{ data: patients }, { data: visitRows }, ledger] = await Promise.all([
      supabase.from("patients").select("*"),
      supabase.from("visits").select("id, doctor_name"),
      loadLedger(supabase, { clinicId, select: "id, invoice_number, patient_id, visit_id, status, subtotal, discount, total, amount_paid, due_date, created_at, notes" }).catch(() => null),
    ]);
    if (patients) {
      const invoices = (ledger?.invoices || []).filter(i => i.counted);
      const payments = ledger ? countedPayments(ledger.payments, ledger.invoices) : [];
      const billing = billingByPatient(invoices);
      setAllPatients(patients.map(p => ({ ...p, billing: billing[p.id] ?? NO_BILLS })));
      setLedgerInvoices(ledger?.invoices || []);

      const dayKey = (d: string | null | undefined) => { const t = d ? new Date(d) : null; return t && !isNaN(t.getTime()) ? t.toISOString() : ""; };
      const inFilter = (d: string | null | undefined) => {
        if (filter === "today") return dayKey(d).startsWith(today);
        if (filter === "month") return dayKey(d).startsWith(thisMonth);
        return true;
      };
      const filtered = patients.filter(p => inFilter(p.created_at));
      const inPeriod = payments.filter(p => inFilter(p.payment_date));
      setPeriodPayments(inPeriod);
      setIncome(inPeriod.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
      setPatientCount(filtered.length);
      // Pending is what is owed right now: the same figure as the Dashboard and the Patients list
      setPendingFees(invoices.reduce((sum, i) => sum + Math.max(0, i.balance), 0));

      // Monthly data
      const months = parseInt(chartRange);
      const monthlyArr: any[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toISOString().slice(0, 7);
        const monthName = d.toLocaleString("default", { month: "short", year: "2-digit" });
        const monthPatients = patients.filter(p => dayKey(p.created_at).startsWith(monthKey));
        monthlyArr.push({
          month: monthName,
          income: payments.filter(p => dayKey(p.payment_date).startsWith(monthKey)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
          patients: monthPatients.length,
          pending: invoices.filter(inv => dayKey(inv.created_at).startsWith(monthKey)).reduce((sum, inv) => sum + Math.max(0, inv.balance), 0),
        });
      }
      setMonthlyData(monthlyArr);

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

      // Doctor breakdown: payments and balances per doctor (visit doctor, else the patient's doctor)
      const doctorOf = doctorResolver(visitRows || [], patients);
      const doctorMap: Record<string, { patients: number; income: number; pending: number }> = {};
      const row = (doc: string) => (doctorMap[doc || "Unassigned"] ||= { patients: 0, income: 0, pending: 0 });
      patients.forEach(p => { row(p.doctor_name).patients += 1; });
      payments.forEach(p => { row(doctorOf(p.invoice)).income += Number(p.amount) || 0; });
      invoices.forEach(inv => { if (inv.balance > 0) row(doctorOf(inv)).pending += inv.balance; });
      const doctorArr = Object.entries(doctorMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.patients - a.patients);
      setDoctorData(doctorArr);
    }

    const { data: labs } = await supabase.from("labs").select("fee_paid, created_at");
    if (labs) {
      const filtered = labs.filter(l => {
        if (filter === "today") return l.created_at?.startsWith(today);
        if (filter === "month") return l.created_at?.startsWith(thisMonth);
        return true;
      });
      setLabCost(filtered.reduce((sum, l) => sum + (l.fee_paid || 0), 0));
    }

    const { data: expenses } = await supabase.from("expenses").select("*");
    if (expenses) {
      setAllExpenses(expenses);
      const filtered = expenses.filter(e => {
        if (filter === "today") return e.date === today;
        if (filter === "month") return e.date?.startsWith(thisMonth);
        return true;
      });
      setManualExpenses(filtered.reduce((sum, e) => sum + (e.amount || 0), 0));

      // Expense pie
      const categoryMap: Record<string, number> = {};
      filtered.forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
      });
      setExpensePieData(Object.entries(categoryMap).map(([name, value]) => ({ name, value })));
    }

    const { data: materials } = await supabase.from("materials").select("price, quantity");
    if (materials) setMaterialCost(materials.reduce((sum, m) => sum + ((m.price || 0) * (m.quantity || 0)), 0));

    const { data: purchases } = await supabase.from("purchases").select("*");
    if (purchases) setAllPurchases(purchases);
    setLoaded(true);
  };

  useEffect(() => { fetchData(); }, [filter, chartRange, clinicId]);

  const totalExpenses = labCost + manualExpenses + materialCost;
  const profit = income - totalExpenses;

  const PIE_COLORS = [INK, "#d4af37", "#3b82f6", "#ef4444", "#8b5cf6", "#10b981"];

  const periodLabel = filter === "today" ? "Today" : filter === "month" ? "This month" : "All time";

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const add = (name: string, rows: object[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
    const nameOf = (id: number | null) => allPatients.find(p => p.id === id)?.name ?? "";
    const inPeriodExpenses = allExpenses.filter(e => filter === "today" ? e.date === today : filter === "month" ? e.date?.startsWith(thisMonth) : true);
    const sum = (rows: { amount?: number | null }[]) => rows.reduce((t, r) => t + (Number(r.amount) || 0), 0);
    // Summary first: every figure is the one on screen, and the sheets below add up to it
    add("Summary", [
      { Category: "Period", Value: periodLabel },
      { Category: "Total Patients", Value: patientCount },
      { Category: "Total Income (payments in period)", Value: income },
      { Category: "Pending Fees (all open invoices)", Value: pendingFees },
      { Category: "Lab Costs", Value: labCost },
      { Category: "Material Costs", Value: materialCost },
      { Category: "Other Expenses", Value: manualExpenses },
      { Category: "Total Expenses", Value: totalExpenses },
      { Category: "Net Profit", Value: profit },
      { Category: "Check: sum of Payments sheet", Value: sum(periodPayments) },
      { Category: "Check: sum of open Invoice balances", Value: ledgerInvoices.filter(i => i.counted).reduce((t, i) => t + Math.max(0, i.balance), 0) },
    ]);
    add("Patients", patientSheet(allPatients, Object.fromEntries(allPatients.map(p => [p.id, p.billing]))));
    add("Invoices", invoiceSheet(ledgerInvoices, nameOf));
    add("Payments", paymentSheet(periodPayments, nameOf));
    add("Expenses", inPeriodExpenses.map(e => ({ Title: e.title, Category: e.category, Amount: e.amount, Date: formatDate(e.date) })));
    add("Doctors", doctorData.map(d => ({ Doctor: d.name === "Unassigned" ? d.name : doctorName(d.name), Patients: d.patients, Income: d.income, Pending: d.pending })));
    XLSX.writeFile(wb, `DentEase-Report-${todayISO()}.xlsx`);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-brand-100 rounded-lg p-3 shadow-lg">
          <p className="text-xs font-semibold text-brand-800 mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.name === "Patients" ? entry.value : `${symbol} ${entry.value?.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Reports</h2>
            <p className="text-sm text-brand-600 mt-1">Profit & Loss Summary</p>
          </div>
          <button onClick={exportToExcel} disabled={!loaded} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium disabled:opacity-60">
            <BarChart3 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Export
          </button>
        </div>

        {/* Summary Filter */}
        <div className="flex gap-2 mb-6">
          {["today", "month", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 md:px-5 py-2 rounded-lg text-xs md:text-sm font-medium ${filter === f ? "bg-brand-600 text-white" : "bg-white text-brand-700 border border-brand-200"}`}>
              {f === "today" ? "Today" : f === "month" ? "Month" : "All Time"}
            </button>
          ))}
        </div>

        {/* Top Stats */}
        <div className="stagger grid grid-cols-3 gap-3 md:gap-5 mb-6">
          <div className="bg-white rounded-xl p-3 md:p-5 border border-brand-100">
            <p className="text-xs font-medium text-brand-600 mb-1">PATIENTS</p>
            <p className="text-2xl md:text-3xl font-semibold text-brand-800">{patientCount}</p>
            <p className="text-xs text-brand-400 mt-1">Treated</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-5 border border-brand-100">
            <p className="text-xs font-medium text-brand-600 mb-1">PENDING</p>
            <p className="text-lg md:text-3xl font-semibold text-orange-500">{symbol} {pendingFees.toLocaleString()}</p>
            <p className="text-xs text-brand-400 mt-1">To collect</p>
          </div>
          <div className={`rounded-xl p-3 md:p-5 border ${profit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-xs font-medium mb-1 ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>PROFIT</p>
            <p className={`text-lg md:text-3xl font-semibold ${profit >= 0 ? "text-green-700" : "text-red-700"}`}>{symbol} {profit.toLocaleString()}</p>
            <p className={`text-xs mt-1 ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>{profit >= 0 ? "Net Profit" : "Net Loss"}</p>
          </div>
        </div>

        {/* Income & Expense Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 md:p-5 border border-brand-100">
            <h3 className="text-sm font-semibold text-brand-800 mb-4"><Wallet className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Income</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-brand-50">
                <span className="text-sm text-brand-700">Patient Fees</span>
                <span className="text-sm font-semibold text-green-600">{symbol} {income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-semibold text-brand-800">Total</span>
                <span className="text-sm font-bold text-green-700">{symbol} {income.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-5 border border-brand-100">
            <h3 className="text-sm font-semibold text-brand-800 mb-4"><Banknote className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Expenses</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-brand-50">
                <span className="text-sm text-brand-700">Lab Costs</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {labCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-brand-50">
                <span className="text-sm text-brand-700">Material Costs</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {materialCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-brand-50">
                <span className="text-sm text-brand-700">Rent / Salary / Other</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {manualExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-semibold text-brand-800">Total</span>
                <span className="text-sm font-bold text-red-600">{symbol} {totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Range Filter */}
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm font-medium text-brand-700">Chart Range:</p>
          {[{ label: "3 Months", value: "3" }, { label: "6 Months", value: "6" }, { label: "12 Months", value: "12" }].map(r => (
            <button key={r.value} onClick={() => setChartRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${chartRange === r.value ? "bg-brand-600 text-white" : "bg-white text-brand-700 border border-brand-200"}`}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Chart 1 — Monthly Income */}
        <div className="bg-white rounded-xl p-4 md:p-5 border border-brand-100 mb-6">
          <h3 className="text-sm font-semibold text-brand-800 mb-4"><TrendingUp className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Monthly Income — Last {chartRange} Months</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill={INK} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 — Monthly Patients */}
        <div className="bg-white rounded-xl p-4 md:p-5 border border-brand-100 mb-6">
          <h3 className="text-sm font-semibold text-brand-800 mb-4"><Users className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Monthly Patients — Last {chartRange} Months</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="patients" name="Patients" stroke={INK} strokeWidth={2} dot={{ fill: INK, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3 & 4 — Pie + Treatments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 md:p-5 border border-brand-100">
            <h3 className="text-sm font-semibold text-brand-800 mb-4"><ChartPie className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Expense Breakdown</h3>
            {expensePieData.length === 0 ? (
              <p className="text-center text-brand-400 text-sm py-8">No expense data</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensePieData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      labelLine={false}>
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

          <div className="bg-white rounded-xl p-4 md:p-5 border border-brand-100">
            <h3 className="text-sm font-semibold text-brand-800 mb-4"><Stethoscope className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Top Treatments</h3>
            {treatmentData.length === 0 ? (
              <p className="text-center text-brand-400 text-sm py-8">No treatment data</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={treatmentData} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={65} />
                    <Tooltip />
                    <Bar dataKey="count" name="Patients" fill={INK} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Doctor Performance */}
        <div className="bg-white rounded-xl p-4 md:p-5 border border-brand-100 mb-6">
          <h3 className="text-sm font-semibold text-brand-800 mb-4"><Stethoscope className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Doctor Performance</h3>
          {doctorData.length === 0 ? (
            <p className="text-center text-brand-400 text-sm py-8">No doctor data</p>
          ) : (
            <>
              {/* Chart */}
              <div className="h-56 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={doctorData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="patients" name="Patients" fill={INK} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="income" name="Income" fill="#d4af37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-brand-700 font-medium text-xs">Doctor</th>
                      <th className="text-left px-4 py-2 text-brand-700 font-medium text-xs">Patients</th>
                      <th className="text-left px-4 py-2 text-brand-700 font-medium text-xs">Income</th>
                      <th className="text-left px-4 py-2 text-brand-700 font-medium text-xs">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorData.map((d, i) => (
                      <tr key={i} className="border-t border-brand-50 hover:bg-brand-50">
                        <td className="px-4 py-2 font-medium text-brand-800 text-xs"><Stethoscope className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{d.name === "Unassigned" ? d.name : doctorName(d.name)}</td>
                        <td className="px-4 py-2 text-xs">
                          <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">{d.patients}</span>
                        </td>
                        <td className="px-4 py-2 text-green-600 font-medium text-xs">{symbol} {d.income.toLocaleString()}</td>
                        <td className="px-4 py-2 text-orange-500 font-medium text-xs">{symbol} {d.pending.toLocaleString()}</td>
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