"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

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
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    item_name: "", category: "Consumable", quantity: "",
    unit: "Box", price_per_unit: "", supplier: "", date: "", notes: "",
  });
  const router = useRouter();

  const fetchPurchases = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("purchases").select("*").order("date", { ascending: false });
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

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const qty = parseInt(form.quantity) || 0;
    const price = parseInt(form.price_per_unit) || 0;
    const total = qty * price;
    await supabase.from("purchases").insert([{
      item_name: form.item_name,
      category: form.category,
      quantity: qty,
      unit: form.unit,
      price_per_unit: price,
      total_price: total,
      supplier: form.supplier,
      date: form.date,
      notes: form.notes,
    }]);
    setForm({ item_name: "", category: "Consumable", quantity: "", unit: "Box", price_per_unit: "", supplier: "", date: "", notes: "" });
    setShowForm(false);
    setLoading(false);
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

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-teal-800">Purchase History</h2>
            <p className="text-sm text-teal-600 mt-1">Track all inventory purchases</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
            + Add Purchase
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">TOTAL PURCHASES</p>
            <p className="text-2xl font-semibold text-teal-800">{filteredPurchases.length}</p>
            <p className="text-xs text-teal-400 mt-1">Items purchased</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">TOTAL SPENT</p>
            <p className="text-2xl font-semibold text-red-600">Rs {totalSpent.toLocaleString()}</p>
            <p className="text-xs text-teal-400 mt-1">All purchases combined</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-teal-100">
            <p className="text-xs font-medium text-teal-600 mb-1">SUPPLIERS</p>
            <p className="text-2xl font-semibold text-teal-800">
              {new Set(filteredPurchases.map(p => p.supplier)).size}
            </p>
            <p className="text-xs text-teal-400 mt-1">Unique suppliers</p>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">New Purchase</h3>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Item Name" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Consumable</option>
                <option>Instrument</option>
                <option>Medicine</option>
                <option>PPE</option>
                <option>Other</option>
              </select>
              <input placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Box</option>
                <option>Piece</option>
                <option>Pack</option>
                <option>Bottle</option>
                <option>Tube</option>
                <option>Roll</option>
              </select>
              <input placeholder="Price Per Unit (Rs)" type="number" value={form.price_per_unit} onChange={e => setForm({...form, price_per_unit: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Supplier Name" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <div>
                <label className="block text-xs text-teal-600 mb-1">Purchase Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            {form.quantity && form.price_per_unit && (
              <div className="mt-3 bg-teal-50 rounded-lg px-4 py-2 flex justify-between items-center">
                <span className="text-sm text-teal-600">Total Amount:</span>
                <span className="text-sm font-bold text-teal-800">
                  Rs {(parseInt(form.quantity) * parseInt(form.price_per_unit)).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : "Save Purchase"}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <input placeholder="Search item or supplier..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border border-teal-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
          {["all", "today", "month"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-medium ${filter === f ? "bg-teal-600 text-white" : "bg-white text-teal-700 border border-teal-200"}`}>
              {f === "all" ? "All Time" : f === "today" ? "Today" : "This Month"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-teal-50">
              <tr>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Item</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Quantity</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Price/Unit</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Total</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-teal-400">No purchases found</td></tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="border-t border-teal-50 hover:bg-teal-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-teal-800">{p.item_name}</p>
                      {p.notes && <p className="text-xs text-teal-400">{p.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-teal-700">{p.quantity} {p.unit}</td>
                    <td className="px-4 py-3 text-teal-700">Rs {p.price_per_unit?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">Rs {p.total_price?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-teal-700">{p.supplier}</td>
                    <td className="px-4 py-3 text-teal-700">{p.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}