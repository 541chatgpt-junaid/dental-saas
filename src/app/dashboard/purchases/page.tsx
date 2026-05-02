"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";

interface Purchase {
  id: number;
  created_at: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
  supplier: string;
  date: string;
  notes: string;
  user_id: string;
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    item_name: "", category: "Consumable", quantity: "",
    unit: "Box", price_per_unit: "", supplier: "", date: "", notes: "",
  });
  const router = useRouter();
  const { symbol } = useCurrency();

  const fetchPurchases = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("purchases").select("*").eq("user_id", user?.id).order("date", { ascending: false });
    if (data) setPurchases(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchPurchases();
  }, [router]);

  const resetForm = () => {
    setForm({ item_name: "", category: "Consumable", quantity: "", unit: "Box", price_per_unit: "", supplier: "", date: "", notes: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const qty = parseInt(form.quantity) || 0;
    const price = parseInt(form.price_per_unit) || 0;
    await supabase.from("purchases").insert([{
      item_name: form.item_name, category: form.category,
      quantity: qty, unit: form.unit,
      price_per_unit: price, total_price: qty * price,
      supplier: form.supplier, date: form.date,
      notes: form.notes, user_id: user?.id,
    }]);
    resetForm();
    setLoading(false);
    fetchPurchases();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    const supabase = createClient();
    const qty = parseInt(form.quantity) || 0;
    const price = parseInt(form.price_per_unit) || 0;
    await supabase.from("purchases").update({
      item_name: form.item_name, category: form.category,
      quantity: qty, unit: form.unit,
      price_per_unit: price, total_price: qty * price,
      supplier: form.supplier, date: form.date, notes: form.notes,
    }).eq("id", editingId);
    resetForm();
    setLoading(false);
    fetchPurchases();
  };

  const openEdit = (p: Purchase) => {
    setEditingId(p.id);
    setForm({
      item_name: p.item_name, category: p.category,
      quantity: p.quantity.toString(), unit: p.unit,
      price_per_unit: p.price_per_unit.toString(),
      supplier: p.supplier || "", date: p.date, notes: p.notes || "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this purchase?")) return;
    const supabase = createClient();
    await supabase.from("purchases").delete().eq("id", id);
    fetchPurchases();
  };

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const filteredPurchases = purchases.filter(p => {
    const matchesFilter =
      filter === "all" ? true :
      filter === "today" ? p.date === today :
      p.date?.startsWith(thisMonth);
    const matchesSearch =
      p.item_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalSpent = filteredPurchases.reduce((sum, p) => sum + (p.total_price || 0), 0);
  const showAnyForm = showForm || !!editingId;

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Purchases</h2>
            <p className="text-sm text-teal-600 mt-1">Track all inventory purchases</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add</button>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">TOTAL</p>
            <p className="text-xl md:text-2xl font-semibold text-teal-800">{filteredPurchases.length}</p>
            <p className="text-xs text-teal-400 mt-1">Items</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">SPENT</p>
            <p className="text-lg md:text-2xl font-semibold text-red-600">{symbol} {totalSpent.toLocaleString()}</p>
            <p className="text-xs text-teal-400 mt-1">Combined</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">SUPPLIERS</p>
            <p className="text-xl md:text-2xl font-semibold text-teal-800">{new Set(filteredPurchases.map(p => p.supplier)).size}</p>
            <p className="text-xs text-teal-400 mt-1">Unique</p>
          </div>
        </div>

        {showAnyForm && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">{editingId ? "Edit Purchase" : "New Purchase"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Item Name" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Consumable</option><option>Instrument</option><option>Medicine</option><option>PPE</option><option>Other</option>
              </select>
              <input placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Box</option><option>Piece</option><option>Pack</option><option>Bottle</option><option>Tube</option><option>Roll</option>
              </select>
              <input placeholder={`Price Per Unit (${symbol})`} type="number" value={form.price_per_unit} onChange={e => setForm({...form, price_per_unit: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Supplier Name" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <div>
                <label className="block text-xs text-teal-600 mb-1">Purchase Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            {form.quantity && form.price_per_unit && (
              <div className="mt-3 bg-teal-50 rounded-lg px-4 py-2 flex justify-between">
                <span className="text-sm text-teal-600">Total:</span>
                <span className="text-sm font-bold text-teal-800">{symbol} {(parseInt(form.quantity) * parseInt(form.price_per_unit)).toLocaleString()}</span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : editingId ? "Update Purchase" : "Save Purchase"}
              </button>
              <button onClick={resetForm} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input placeholder="Search item or supplier..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border border-teal-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
          <div className="flex gap-2">
            {["all", "today", "month"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-xs font-medium ${filter === f ? "bg-teal-600 text-white" : "bg-white text-teal-700 border border-teal-200"}`}>
                {f === "all" ? "All" : f === "today" ? "Today" : "Month"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
          <div className="md:hidden divide-y divide-teal-50">
            {filteredPurchases.length === 0 ? (
              <p className="text-center py-10 text-teal-400 text-sm">No purchases found</p>
            ) : (
              filteredPurchases.map(p => (
                <div key={p.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-teal-800 text-sm">{p.item_name}</p>
                      <p className="text-xs text-teal-500">{p.category} · {p.supplier}</p>
                    </div>
                    <p className="font-semibold text-red-600 text-sm">{symbol} {p.total_price?.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-teal-400">{p.quantity} {p.unit} · {p.date}</p>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-teal-600 text-xs font-medium">✏️</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-400 text-xs font-medium">🗑️</button>
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
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Item</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Price/Unit</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Total</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-teal-400">No purchases found</td></tr>
                ) : (
                  filteredPurchases.map(p => (
                    <tr key={p.id} className="border-t border-teal-50 hover:bg-teal-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-teal-800">{p.item_name}</p>
                        {p.notes && <p className="text-xs text-teal-400">{p.notes}</p>}
                      </td>
                      <td className="px-4 py-3"><span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full">{p.category}</span></td>
                      <td className="px-4 py-3 text-teal-700">{p.quantity} {p.unit}</td>
                      <td className="px-4 py-3 text-teal-700">{symbol} {p.price_per_unit?.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">{symbol} {p.total_price?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-teal-700">{p.supplier}</td>
                      <td className="px-4 py-3 text-teal-700">{p.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="text-teal-600 text-xs font-medium">✏️ Edit</button>
                          <button onClick={() => handleDelete(p.id)} className="text-red-400 text-xs font-medium">🗑️</button>
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