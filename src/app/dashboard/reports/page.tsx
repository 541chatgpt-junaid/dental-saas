"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";
import { useCurrency } from "@/lib/useCurrency";

export default function Reports() {
  const [filter, setFilter] = useState("today");
  const [income, setIncome] = useState(0);
  const [labCost, setLabCost] = useState(0);
  const [manualExpenses, setManualExpenses] = useState(0);
  const [materialCost, setMaterialCost] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [pendingFees, setPendingFees] = useState(0);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
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
      setManualExpenses(filtered.reduce((sum, e) => sum + (e.amount || 0), 0));
    }

    const { data: materials } = await supabase.from("materials").select("price, quantity").eq("user_id", user.id);
    if (materials) setMaterialCost(materials.reduce((sum, m) => sum + ((m.price || 0) * (m.quantity || 0)), 0));

    const { data: purchases } = await supabase.from("purchases").select("*").eq("user_id", user.id);
    if (purchases) setAllPurchases(purchases);
  };

  useEffect(() => { fetchData(); }, [filter]);

  const totalExpenses = labCost + manualExpenses + materialCost;
  const profit = income - totalExpenses;

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
      Title: e.title, Category: e.category, Amount: e.amount, Date: e.date, Notes: e.notes,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData), "Expenses");
    const purchasesData = allPurchases.map(p => ({
      Item: p.item_name, Category: p.category, Quantity: p.quantity,
      Unit: p.unit, "Price/Unit": p.price_per_unit, Total: p.total_price,
      Supplier: p.supplier, Date: p.date,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchasesData), "Purchases");
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

        <div className="grid grid-cols-3 gap-3 md:gap-5 mb-6">
          <div className="bg-white rounded-xl p-3 md:p-5 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1 md:mb-2">PATIENTS</p>
            <p className="text-2xl md:text-3xl font-semibold text-teal-800">{patientCount}</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-5 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1 md:mb-2">PENDING</p>
            <p className="text-lg md:text-3xl font-semibold text-orange-500">{symbol} {pendingFees.toLocaleString()}</p>
          </div>
          <div className={`rounded-xl p-3 md:p-5 border ${profit >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-xs font-medium mb-1 md:mb-2 ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>PROFIT</p>
            <p className={`text-lg md:text-3xl font-semibold ${profit >= 0 ? "text-green-700" : "text-red-700"}`}>{symbol} {profit.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6">
          <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">💰 Income</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-teal-50">
                <span className="text-sm text-teal-700">Patient Fees Collected</span>
                <span className="text-sm font-semibold text-green-600">{symbol} {income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold text-teal-800">Total Income</span>
                <span className="text-sm font-bold text-green-700">{symbol} {income.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">💸 Expenses</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-teal-50">
                <span className="text-sm text-teal-700">Lab Costs</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {labCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-teal-50">
                <span className="text-sm text-teal-700">Material Costs</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {materialCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-teal-50">
                <span className="text-sm text-teal-700">Rent / Salary / Other</span>
                <span className="text-sm font-semibold text-red-500">{symbol} {manualExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold text-teal-800">Total Expenses</span>
                <span className="text-sm font-bold text-red-600">{symbol} {totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-teal-100">
          <h3 className="text-sm font-semibold text-teal-800 mb-4">📊 Income vs Expenses</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-teal-600 mb-1">
                <span>Income</span><span>{symbol} {income.toLocaleString()}</span>
              </div>
              <div className="w-full bg-teal-100 rounded-full h-4">
                <div className="bg-green-500 h-4 rounded-full" style={{ width: income > 0 ? "100%" : "0%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-teal-600 mb-1">
                <span>Expenses</span><span>{symbol} {totalExpenses.toLocaleString()}</span>
              </div>
              <div className="w-full bg-teal-100 rounded-full h-4">
                <div className="bg-red-500 h-4 rounded-full" style={{ width: income > 0 ? `${Math.min((totalExpenses / income) * 100, 100)}%` : "0%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-teal-600 mb-1">
                <span>Net Profit</span><span>{symbol} {profit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-teal-100 rounded-full h-4">
                <div className={`h-4 rounded-full ${profit >= 0 ? "bg-teal-500" : "bg-red-700"}`} style={{ width: income > 0 ? `${Math.min(Math.abs(profit / income) * 100, 100)}%` : "0%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}