"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/dateFormat";
import EmptyState from "@/components/EmptyState";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";
import FormError from "@/components/FormError";
import { dateOrToday, firstError, readAmount, saveErrorMessage, todayISO } from "@/lib/formSave";

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
    title: "", category: "Rent", amount: "", date: todayISO(), notes: "",
  });
  const [saveError, setSaveError] = useState("");
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

  const fetchExpenses = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false });
    if (data) setExpenses(data);
  };

  const fetchAutoCosts = async () => {
    const supabase = createClient();
    const { data: labs } = await supabase.from("labs").select("fee_paid");
    if (labs) setLabCost(labs.reduce((sum, l) => sum + (l.fee_paid || 0), 0));
    const { data: materials } = await supabase.from("materials").select("price, quantity");
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
    setForm({ title: "", category: "Rent", amount: "", date: todayISO(), notes: "" });
    setShowForm(false);
    setEditingId(null);
    setSaveError("");
  };

  /** Validated row from the form, or an error message naming the problem */
  const expenseRow = () => {
    const amount = readAmount(form.amount, "Amount");
    const error = firstError(!form.title.trim() && "Title is required.", amount.error, amount.value === 0 && "Amount is required.");
    if (error) return { error, row: null };
    return { error: null, row: { title: form.title.trim(), category: form.category, amount: amount.value, date: dateOrToday(form.date), notes: form.notes } };
  };

  const handleAdd = async () => {
    const { error: invalid, row } = expenseRow();
    if (!row) { setSaveError(invalid!); return; }
    setLoading(true);
    setSaveError("");
    const { error } = await createClient().from("expenses").insert([{ ...row, clinic_id: clinicId }]);
    setLoading(false);
    // On failure the form stays open with everything typed
    if (error) { setSaveError(saveErrorMessage(error, "expense")); return; }
    resetForm();
    fetchExpenses();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    const { error: invalid, row } = expenseRow();
    if (!row) { setSaveError(invalid!); return; }
    setLoading(true);
    setSaveError("");
    const { error } = await createClient().from("expenses").update(row).eq("id", editingId);
    setLoading(false);
    if (error) { setSaveError(saveErrorMessage(error, "expense")); return; }
    resetForm();
    fetchExpenses();
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setSaveError("");
    setForm({
      title: e.title, category: e.category,
      amount: e.amount.toString(),
      date: e.date || todayISO(), notes: e.notes || "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) alert(saveErrorMessage(error, "expense").replace("save", "delete"));
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
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Expenses</h2>
            <p className="text-sm text-brand-600 mt-1">Track all clinic expenses</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add</button>
        </div>

        <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-xl p-3 md:p-4 border border-brand-100">
            <p className="text-xs font-medium text-brand-600 mb-1">LAB COSTS</p>
            <p className="text-lg md:text-2xl font-semibold text-brand-800">{symbol} {labCost.toLocaleString()}</p>
            <p className="text-xs text-brand-400 mt-1">From Lab Records</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-brand-100">
            <p className="text-xs font-medium text-brand-600 mb-1">MATERIALS</p>
            <p className="text-lg md:text-2xl font-semibold text-brand-800">{symbol} {materialCost.toLocaleString()}</p>
            <p className="text-xs text-brand-400 mt-1">From Materials</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-brand-100">
            <p className="text-xs font-medium text-brand-600 mb-1">OTHER</p>
            <p className="text-lg md:text-2xl font-semibold text-brand-800">{symbol} {manualTotal.toLocaleString()}</p>
            <p className="text-xs text-brand-400 mt-1">Rent, Salary etc</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 md:p-4 border border-red-100">
            <p className="text-xs font-medium text-red-600 mb-1">TOTAL</p>
            <p className="text-lg md:text-2xl font-semibold text-red-700">{symbol} {grandTotal.toLocaleString()}</p>
            <p className="text-xs text-red-400 mt-1">All combined</p>
          </div>
        </div>

        {showAnyForm && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">{editingId ? "Edit Expense" : "New Expense"}</h3>
            <FormError message={saveError} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Expense Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Rent</option><option>Electricity</option><option>Salary</option><option>Internet</option><option>Maintenance</option><option>Other</option>
              </select>
              <input placeholder={`Amount (${symbol})`} type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <div>
                <label className="block text-xs text-brand-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </div>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold md:col-span-2" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : editingId ? "Update Expense" : "Save Expense"}
              </button>
              <button onClick={resetForm} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {["all", "today", "month"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? "bg-brand-600 text-white" : "bg-white text-brand-700 border border-brand-200"}`}>
              {f === "all" ? "All" : f === "today" ? "Today" : "Month"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
          <div className="md:hidden divide-y divide-brand-50">
            {filteredExpenses.length === 0 ? (
              <EmptyState icon={Wallet} title="No expenses yet" hint="Add rent, salaries and other costs to see your true profit." />
            ) : (
              filteredExpenses.map(e => (
                <div key={e.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-brand-800 text-sm">{e.title}</p>
                      <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">{e.category}</span>
                    </div>
                    <p className="text-red-600 font-medium text-sm">{symbol} {e.amount?.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-brand-400">{e.notes} · {formatDate(e.date)}</p>
                    <div className="flex gap-2">
                      <button aria-label="Edit" title="Edit" onClick={() => openEdit(e)} className="text-brand-600 text-xs font-medium"><Pencil className="inline h-4 w-4" aria-hidden="true" /></button>
                      <button aria-label="Delete" title="Delete" onClick={() => handleDelete(e.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50">
                <tr>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Notes</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon={Wallet} title="No expenses yet" hint="Add rent, salaries and other costs to see your true profit." /></td></tr>
                ) : (
                  filteredExpenses.map(e => (
                    <tr key={e.id} className="border-t border-brand-50 hover:bg-brand-50">
                      <td className="px-4 py-3 font-medium text-brand-800">{e.title}</td>
                      <td className="px-4 py-3"><span className="bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-full">{e.category}</span></td>
                      <td className="px-4 py-3 text-red-600 font-medium">{symbol} {e.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-brand-700">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 text-brand-400">{e.notes}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(e)} className="text-brand-600 text-xs font-medium"><Pencil className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Edit</button>
                          <button aria-label="Delete" title="Delete" onClick={() => handleDelete(e.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
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