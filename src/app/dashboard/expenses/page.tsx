"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface Expense {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
  user_id: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labCost, setLabCost] = useState(0);
  const [materialCost, setMaterialCost] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    title: "", category: "Rent", amount: "", date: "", notes: "",
  });
  const router = useRouter();

  const fetchExpenses = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("expenses").select("*").eq("user_id", user?.id).order("date", { ascending: false });
    if (data) setExpenses(data);
  };

  const fetchAutoCosts = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: labs } = await supabase.from("labs").select("fee_paid").eq("user_id", user?.id);
    if (labs) setLabCost(labs.reduce((sum, l) => sum + (l.fee_paid || 0), 0));
    const { data: materials } = await supabase.from("materials").select("price, quantity").eq("user_id", user?.id);
    if (materials) setMaterialCost(materials.reduce((sum, m) => sum + ((m.price || 0) * (m.quantity || 0)), 0));
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchExpenses();
    fetchAutoCosts();
  }, [router]);

  const resetForm = () => {
    setForm({ title: "", category: "Rent", amount: "", date: "", notes: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("expenses").insert([{
      title: form.title, category: form.category,
      amount: parseInt(form.amount) || 0,
      date: form.date, notes: form.notes, user_id: user?.id,
    }]);
    resetForm();
    setLoading(false);
    fetchExpenses();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("expenses").update({
      title: form.title, category: form.category,
      amount: parseInt(form.amount) || 0,
      date: form.date, notes: form.notes,
    }).eq("id", editingId);
    resetForm();
    setLoading(false);
    fetchExpenses();
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      title: e.title, category: e.category,
      amount: e.amount.toString(),
      date: e.date, notes: e.notes || "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    const supabase = createClient();
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  };

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const filteredExpenses = expenses.filter(e => {
    if (filter === "today") return e.date === today;
    if (filter === "month") return e.date?.startsWith(thisMonth);
    return true;
  });

  const manualTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const grandTotal = manualTotal + labCost + materialCost;
  const showAnyForm = showForm || !!editingId;

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Expenses</h2>
            <p className="text-sm text-teal-600 mt-1">Track all clinic expenses</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">LAB COSTS</p>
            <p className="text-lg md:text-2xl font-semibold text-teal-800">Rs {labCost.toLocaleString()}</p>
            <p className="text-xs text-teal-400 mt-1">From Lab Records</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">MATERIALS</p>
            <p className="text-lg md:text-2xl font-semibold text-teal-800">Rs {materialCost.toLocaleString()}</p>
            <p className="text-xs text-teal-400 mt-1">From Materials</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">OTHER</p>
            <p className="text-lg md:text-2xl font-semibold text-teal-800">Rs {manualTotal.toLocaleString()}</p>
            <p className="text-xs text-teal-400 mt-1">Rent, Salary etc</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 md:p-4 border border-red-100">
            <p className="text-xs font-medium text-red-600 mb-1">TOTAL</p>
            <p className="text-lg md:text-2xl font-semibold text-red-700">Rs {grandTotal.toLocaleString()}</p>
            <p className="text-xs text-red-400 mt-1">All combined</p>
          </div>
        </div>

        {showAnyForm && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">{editingId ? "Edit Expense" : "New Expense"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Expense Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Rent</option><option>Electricity</option><option>Salary</option><option>Internet</option><option>Maintenance</option><option>Other</option>
              </select>
              <input placeholder="Amount (Rs)" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <div>
                <label className="block text-xs text-teal-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 md:col-span-2" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : editingId ? "Update Expense" : "Save Expense"}
              </button>
              <button onClick={resetForm} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {["all", "today", "month"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? "bg-teal-600 text-white" : "bg-white text-teal-700 border border-teal-200"}`}>
              {f === "all" ? "All" : f === "today" ? "Today" : "Month"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
          <div className="md:hidden divide-y divide-teal-50">
            {filteredExpenses.length === 0 ? (
              <p className="text-center py-10 text-teal-400 text-sm">No expenses added yet</p>
            ) : (
              filteredExpenses.map(e => (
                <div key={e.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-teal-800 text-sm">{e.title}</p>
                      <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">{e.category}</span>
                    </div>
                    <p className="text-red-600 font-medium text-sm">Rs {e.amount?.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-teal-400">{e.notes} · {e.date}</p>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(e)} className="text-teal-600 text-xs font-medium">✏️</button>
                      <button onClick={() => handleDelete(e.id)} className="text-red-400 text-xs font-medium">🗑️</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teal-50">
                <tr>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Notes</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-teal-400">No expenses added yet</td></tr>
                ) : (
                  filteredExpenses.map(e => (
                    <tr key={e.id} className="border-t border-teal-50 hover:bg-teal-50">
                      <td className="px-4 py-3 font-medium text-teal-800">{e.title}</td>
                      <td className="px-4 py-3"><span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full">{e.category}</span></td>
                      <td className="px-4 py-3 text-red-600 font-medium">Rs {e.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-teal-700">{e.date}</td>
                      <td className="px-4 py-3 text-teal-400">{e.notes}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(e)} className="text-teal-600 text-xs font-medium">✏️ Edit</button>
                          <button onClick={() => handleDelete(e.id)} className="text-red-400 text-xs font-medium">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}