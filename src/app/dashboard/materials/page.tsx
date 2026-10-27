"use client";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/dateFormat";
import EmptyState from "@/components/EmptyState";
import { Boxes, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";
import FormError from "@/components/FormError";
import { dateOrNull, firstError, readAmount, saveErrorMessage, todayISO } from "@/lib/formSave";

interface Material {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  price: number;
  supplier: string;
  user_id: string;
  expiry_date?: string | null;
}

const daysUntil = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayISO()}T00:00:00`).getTime()) / 86400000);
/** expired / expiring within 30 days / ok */
const expiryState = (m: Material) => !m.expiry_date ? "none" : daysUntil(m.expiry_date) < 0 ? "expired" : daysUntil(m.expiry_date) <= 30 ? "soon" : "ok";
const fmtExpiry = (iso: string) => formatDate(iso);

function StockBadge({ m, small }: { m: Material; small?: boolean }) {
  const exp = expiryState(m);
  const [label, cls] = exp === "expired" ? ["Expired", "bg-red-100 text-red-700"]
    : m.quantity <= m.min_quantity ? ["Low Stock", "bg-red-100 text-red-700"]
    : exp === "soon" ? ["Expiring soon", "bg-orange-100 text-orange-700"]
    : ["In Stock", "bg-green-100 text-green-700"];
  return <span className={`${small ? "px-2 py-0.5" : "px-2 py-1"} rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{label}</span>;
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "Consumable", quantity: "",
    unit: "Box", min_quantity: "", price: "", supplier: "", expiry_date: "",
  });
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();
  const [hadExpiry, setHadExpiry] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchMaterials = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("materials").select("*").order("name", { ascending: true });
    if (data) setMaterials(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchMaterials();
  }, [router]);

  const resetForm = () => {
    setForm({ name: "", category: "Consumable", quantity: "", unit: "Box", min_quantity: "", price: "", supplier: "", expiry_date: "" });
    setShowForm(false);
    setEditingId(null);
    setSaveError("");
  };

  /** Validated row from the form, or an error message naming the problem */
  const materialRow = () => {
    const qty = readAmount(form.quantity, "Quantity");
    const min = readAmount(form.min_quantity, "Minimum quantity");
    const price = readAmount(form.price, "Price");
    const error = firstError(!form.name.trim() && "Material name is required.", qty.error, min.error, price.error);
    if (error) return { error, row: null };
    return {
      error: null,
      row: {
        name: form.name.trim(), category: form.category, quantity: qty.value, unit: form.unit,
        min_quantity: min.value, price: price.value, supplier: form.supplier,
      },
    };
  };

  const handleAdd = async () => {
    const { error: invalid, row } = materialRow();
    if (!row) { setSaveError(invalid!); return; }
    setLoading(true);
    setSaveError("");
    const expiry = dateOrNull(form.expiry_date);
    const { error } = await createClient().from("materials").insert([{ ...row, ...(expiry ? { expiry_date: expiry } : {}), clinic_id: clinicId }]);
    setLoading(false);
    // On failure the form stays open with everything typed
    if (error) { setSaveError(saveErrorMessage(error, "material")); return; }
    resetForm();
    fetchMaterials();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    const { error: invalid, row } = materialRow();
    if (!row) { setSaveError(invalid!); return; }
    setLoading(true);
    setSaveError("");
    const expiry = dateOrNull(form.expiry_date);
    const { error } = await createClient().from("materials").update({
      ...row, ...(expiry ? { expiry_date: expiry } : hadExpiry ? { expiry_date: null } : {}),
    }).eq("id", editingId);
    setLoading(false);
    if (error) { setSaveError(saveErrorMessage(error, "material")); return; }
    resetForm();
    fetchMaterials();
  };

  const openEdit = (m: Material) => {
    setHadExpiry(!!m.expiry_date);
    setEditingId(m.id);
    setSaveError("");
    setForm({
      name: m.name, category: m.category,
      quantity: m.quantity.toString(), unit: m.unit,
      min_quantity: m.min_quantity.toString(),
      price: m.price.toString(), supplier: m.supplier || "",
      expiry_date: m.expiry_date || "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this material?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) alert(saveErrorMessage(error, "material").replace("save", "delete"));
    fetchMaterials();
  };

  const updateQuantity = async (material: Material, change: number) => {
    const supabase = createClient();
    const newQty = material.quantity + change;
    if (newQty < 0) return;
    const { error } = await supabase.from("materials").update({ quantity: newQty }).eq("id", material.id);
    if (error) alert(saveErrorMessage(error, "stock change"));
    fetchMaterials();
  };

  const lowStock = materials.filter(m => m.quantity <= m.min_quantity);
  const expired = materials.filter(m => expiryState(m) === "expired");
  const expiringSoon = materials.filter(m => expiryState(m) === "soon");
  const showAnyForm = showForm || !!editingId;

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Inventory</h2>
            <p className="text-sm text-brand-600 mt-1">Total: {materials.length} items</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add</button>
        </div>

        {(lowStock.length > 0 || expired.length > 0 || expiringSoon.length > 0) && (
          <div className="stagger mb-6 grid gap-3 md:grid-cols-3">
            {([
              ["Low stock", lowStock, "border-red-200 bg-red-50 text-red-700", (m: Material) => `${m.quantity} ${m.unit} left`],
              ["Expired", expired, "border-red-200 bg-red-50 text-red-700", (m: Material) => `expired ${fmtExpiry(m.expiry_date!)}`],
              ["Expiring in 30 days", expiringSoon, "border-orange-200 bg-orange-50 text-orange-700", (m: Material) => `in ${daysUntil(m.expiry_date!)} days`],
            ] as const).filter(([, list]) => list.length > 0).map(([title, list, cls, detail]) => (
              <div key={title} className={`rounded-xl border p-4 ${cls}`}>
                <p className="mb-2 text-sm font-semibold"><TriangleAlert className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{title} ({list.length})</p>
                <ul className="space-y-1 text-xs">
                  {list.slice(0, 6).map(m => <li key={m.id}><span className="font-medium">{m.name}</span> · {detail(m)}</li>)}
                  {list.length > 6 && <li>+{list.length - 6} more</li>}
                </ul>
              </div>
            ))}
          </div>
        )}

        {showAnyForm && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">{editingId ? "Edit Material" : "New Material"}</h3>
            <FormError message={saveError} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Material Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Consumable</option><option>Instrument</option><option>Medicine</option><option>PPE</option><option>Other</option>
              </select>
              <input placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Box</option><option>Piece</option><option>Pack</option><option>Bottle</option><option>Tube</option><option>Roll</option>
              </select>
              <input placeholder="Min Quantity (Low Stock Alert)" type="number" value={form.min_quantity} onChange={e => setForm({...form, min_quantity: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <input placeholder={`Price per Unit (${symbol})`} type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <input placeholder="Supplier Name" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <label className="flex items-center gap-3 rounded-lg border border-brand-200 px-3 py-1 text-sm text-brand-600 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/50">
                <span className="whitespace-nowrap text-xs">Expiry date</span>
                <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} aria-label="Expiry date (optional)" className="w-full border-0 bg-transparent py-1 text-sm focus:outline-none" />
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving…" : editingId ? "Update Material" : "Save Material"}
              </button>
              <button onClick={resetForm} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
          <div className="md:hidden divide-y divide-brand-50">
            {materials.length === 0 ? (
              <EmptyState icon={Boxes} title="No materials yet" hint="Add items to keep track of your clinic's stock." />
            ) : (
              materials.map(m => (
                <div key={m.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-brand-800 text-sm">{m.name}</p>
                      <p className="text-xs text-brand-500">{m.category} · {m.supplier}</p>
                    </div>
                    <StockBadge m={m} small />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-brand-600">{m.quantity} {m.unit} · {symbol} {m.price}/unit{m.expiry_date ? ` · exp ${fmtExpiry(m.expiry_date)}` : ""}</p>
                    <div className="flex gap-2">
                      <button onClick={() => updateQuantity(m, 1)} className="bg-brand-100 text-brand-700 px-2 py-1 rounded text-xs font-medium">+1</button>
                      <button onClick={() => updateQuantity(m, -1)} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">-1</button>
                      <button aria-label="Edit" title="Edit" onClick={() => openEdit(m)} className="text-brand-600 text-xs font-medium"><Pencil className="inline h-4 w-4" aria-hidden="true" /></button>
                      <button aria-label="Delete" title="Delete" onClick={() => handleDelete(m.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
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
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Quantity</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Price/Unit</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Expiry</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState icon={Boxes} title="No materials yet" hint="Add items to keep track of your clinic's stock." /></td></tr>
                ) : (
                  materials.map(m => (
                    <tr key={m.id} className="border-t border-brand-50 hover:bg-brand-50">
                      <td className="px-4 py-3 font-medium text-brand-800">{m.name}</td>
                      <td className="px-4 py-3 text-brand-700">{m.category}</td>
                      <td className="px-4 py-3 text-brand-700">{m.quantity} {m.unit}</td>
                      <td className="px-4 py-3 text-brand-700">{symbol} {m.price}</td>
                      <td className="px-4 py-3 text-brand-700">{m.supplier}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${expiryState(m) === "expired" ? "text-red-600 font-medium" : expiryState(m) === "soon" ? "text-orange-600 font-medium" : "text-brand-700"}`}>{m.expiry_date ? fmtExpiry(m.expiry_date) : "—"}</td>
                      <td className="px-4 py-3">
                        <StockBadge m={m} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => updateQuantity(m, 1)} className="bg-brand-100 text-brand-700 px-2 py-1 rounded text-xs">+1</button>
                          <button onClick={() => updateQuantity(m, -1)} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">-1</button>
                          <button onClick={() => openEdit(m)} className="text-brand-600 text-xs font-medium"><Pencil className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Edit</button>
                          <button aria-label="Delete" title="Delete" onClick={() => handleDelete(m.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
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