"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/dateFormat";
import EmptyState from "@/components/EmptyState";
import { Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";
import FormError from "@/components/FormError";
import { dateOrToday, firstError, readAmount, saveErrorMessage, todayISO } from "@/lib/formSave";

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
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    item_name: "", category: "Consumable", quantity: "",
    unit: "Box", price_per_unit: "", supplier: "", date: todayISO(), notes: "",
  });
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

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

  const resetForm = () => {
    setForm({ item_name: "", category: "Consumable", quantity: "", unit: "Box", price_per_unit: "", supplier: "", date: todayISO(), notes: "" });
    setShowForm(false);
    setEditingId(null);
    setSaveError("");
  };

  /** Validated row from the form, or an error message naming the problem */
  const purchaseRow = () => {
    const qty = readAmount(form.quantity, "Quantity", { min: 1 });
    const price = readAmount(form.price_per_unit, "Price per unit");
    const error = firstError(!form.item_name.trim() && "Item name is required.", qty.error, price.error);
    if (error) return { error, row: null };
    return {
      error: null,
      row: {
        item_name: form.item_name.trim(), category: form.category,
        quantity: qty.value, unit: form.unit,
        price_per_unit: price.value, total_price: qty.value * price.value,
        supplier: form.supplier, date: dateOrToday(form.date), notes: form.notes,
      },
    };
  };

  const handleAdd = async () => {
    const { error: invalid, row } = purchaseRow();
    if (!row) { setSaveError(invalid!); return; }
    setLoading(true);
    setSaveError("");
    const { error } = await createClient().from("purchases").insert([{ ...row, clinic_id: clinicId }]);
    setLoading(false);
    // On failure the form stays open with everything typed
    if (error) { setSaveError(saveErrorMessage(error, "purchase")); return; }
    resetForm();
    fetchPurchases();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    const { error: invalid, row } = purchaseRow();
    if (!row) { setSaveError(invalid!); return; }
    setLoading(true);
    setSaveError("");
    const { error } = await createClient().from("purchases").update(row).eq("id", editingId);
    setLoading(false);
    if (error) { setSaveError(saveErrorMessage(error, "purchase")); return; }
    resetForm();
    fetchPurchases();
  };

  const openEdit = (p: Purchase) => {
    setEditingId(p.id);
    setSaveError("");
    setForm({
      item_name: p.item_name, category: p.category,
      quantity: p.quantity.toString(), unit: p.unit,
      price_per_unit: p.price_per_unit.toString(),
      supplier: p.supplier || "", date: p.date || todayISO(), notes: p.notes || "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this purchase?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) alert(saveErrorMessage(error, "purchase").replace("save", "delete"));
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
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Purchases</h2>
            <p className="text-sm text-brand-600 mt-1">Track all inventory purchases</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add</button>
        </div>

        <div className="stagger grid grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-xl p-3 md:p-4 border border-brand-100">
            <p className="text-xs font-medium text-brand-600 mb-1">TOTAL</p>
            <p className="text-xl md:text-2xl font-semibold text-brand-800">{filteredPurchases.length}</p>
            <p className="text-xs text-brand-400 mt-1">Items</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-brand-100">
            <p className="text-xs font-medium text-brand-600 mb-1">SPENT</p>
            <p className="text-lg md:text-2xl font-semibold text-red-600">{symbol} {totalSpent.toLocaleString()}</p>
            <p className="text-xs text-brand-400 mt-1">Combined</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 border border-brand-100">
            <p className="text-xs font-medium text-brand-600 mb-1">SUPPLIERS</p>
            <p className="text-xl md:text-2xl font-semibold text-brand-800">{new Set(filteredPurchases.map(p => p.supplier)).size}</p>
            <p className="text-xs text-brand-400 mt-1">Unique</p>
          </div>
        </div>

        {showAnyForm && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">{editingId ? "Edit Purchase" : "New Purchase"}</h3>
            <FormError message={saveError} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Item Name" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Consumable</option><option>Instrument</option><option>Medicine</option><option>PPE</option><option>Other</option>
              </select>
              <input placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Box</option><option>Piece</option><option>Pack</option><option>Bottle</option><option>Tube</option><option>Roll</option>
              </select>
              <input placeholder={`Price Per Unit (${symbol})`} type="number" value={form.price_per_unit} onChange={e => setForm({...form, price_per_unit: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <input placeholder="Supplier Name" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <div>
                <label className="block text-xs text-brand-600 mb-1">Purchase Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </div>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
            </div>
            {form.quantity && form.price_per_unit && (
              <div className="mt-3 bg-brand-50 rounded-lg px-4 py-2 flex justify-between">
                <span className="text-sm text-brand-600">Total:</span>
                <span className="text-sm font-bold text-brand-800">{symbol} {(parseInt(form.quantity) * parseInt(form.price_per_unit)).toLocaleString()}</span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving…" : editingId ? "Update Purchase" : "Save Purchase"}
              </button>
              <button onClick={resetForm} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input placeholder="Search item or supplier…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border border-brand-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold bg-white" />
          <div className="flex gap-2">
            {["all", "today", "month"].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-xs font-medium ${filter === f ? "bg-brand-600 text-white" : "bg-white text-brand-700 border border-brand-200"}`}>
                {f === "all" ? "All" : f === "today" ? "Today" : "Month"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
          <div className="md:hidden divide-y divide-brand-50">
            {filteredPurchases.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No purchases yet" hint="Record supplier purchases to keep inventory up to date." />
            ) : (
              filteredPurchases.map(p => (
                <div key={p.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-brand-800 text-sm">{p.item_name}</p>
                      <p className="text-xs text-brand-500">{p.category} · {p.supplier}</p>
                    </div>
                    <p className="font-semibold text-red-600 text-sm">{symbol} {p.total_price?.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-brand-400">{p.quantity} {p.unit} · {formatDate(p.date)}</p>
                    <div className="flex gap-2">
                      <button aria-label="Edit" title="Edit" onClick={() => openEdit(p)} className="text-brand-600 text-xs font-medium"><Pencil className="inline h-4 w-4" aria-hidden="true" /></button>
                      <button aria-label="Delete" title="Delete" onClick={() => handleDelete(p.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
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
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Item</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Price/Unit</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Total</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState icon={ShoppingCart} title="No purchases yet" hint="Record supplier purchases to keep inventory up to date." /></td></tr>
                ) : (
                  filteredPurchases.map(p => (
                    <tr key={p.id} className="border-t border-brand-50 hover:bg-brand-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-800">{p.item_name}</p>
                        {p.notes && <p className="text-xs text-brand-400">{p.notes}</p>}
                      </td>
                      <td className="px-4 py-3"><span className="bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-full">{p.category}</span></td>
                      <td className="px-4 py-3 text-brand-700">{p.quantity} {p.unit}</td>
                      <td className="px-4 py-3 text-brand-700">{symbol} {p.price_per_unit?.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">{symbol} {p.total_price?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-brand-700">{p.supplier}</td>
                      <td className="px-4 py-3 text-brand-700">{formatDate(p.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="text-brand-600 text-xs font-medium"><Pencil className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Edit</button>
                          <button aria-label="Delete" title="Delete" onClick={() => handleDelete(p.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
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