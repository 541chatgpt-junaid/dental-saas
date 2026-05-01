"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

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
}

export default function Materials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "Consumable", quantity: "",
    unit: "Box", min_quantity: "", price: "", supplier: "",
  });
  const router = useRouter();

  const fetchMaterials = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("materials").select("*").eq("user_id", user?.id).order("name", { ascending: true });
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
    setForm({ name: "", category: "Consumable", quantity: "", unit: "Box", min_quantity: "", price: "", supplier: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("materials").insert([{
      name: form.name, category: form.category,
      quantity: parseInt(form.quantity) || 0, unit: form.unit,
      min_quantity: parseInt(form.min_quantity) || 0,
      price: parseInt(form.price) || 0,
      supplier: form.supplier, user_id: user?.id,
    }]);
    resetForm();
    setLoading(false);
    fetchMaterials();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("materials").update({
      name: form.name, category: form.category,
      quantity: parseInt(form.quantity) || 0, unit: form.unit,
      min_quantity: parseInt(form.min_quantity) || 0,
      price: parseInt(form.price) || 0,
      supplier: form.supplier,
    }).eq("id", editingId);
    resetForm();
    setLoading(false);
    fetchMaterials();
  };

  const openEdit = (m: Material) => {
    setEditingId(m.id);
    setForm({
      name: m.name, category: m.category,
      quantity: m.quantity.toString(), unit: m.unit,
      min_quantity: m.min_quantity.toString(),
      price: m.price.toString(), supplier: m.supplier || "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this material?")) return;
    const supabase = createClient();
    await supabase.from("materials").delete().eq("id", id);
    fetchMaterials();
  };

  const updateQuantity = async (material: Material, change: number) => {
    const supabase = createClient();
    const newQty = material.quantity + change;
    if (newQty < 0) return;
    await supabase.from("materials").update({ quantity: newQty }).eq("id", material.id);
    fetchMaterials();
  };

  const lowStock = materials.filter(m => m.quantity <= m.min_quantity);

  const MaterialForm = ({ title }: { title: string }) => (
    <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
      <h3 className="text-sm font-semibold text-teal-800 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <input placeholder="Material Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option>Consumable</option><option>Instrument</option><option>Medicine</option><option>PPE</option><option>Other</option>
        </select>
        <input placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option>Box</option><option>Piece</option><option>Pack</option><option>Bottle</option><option>Tube</option><option>Roll</option>
        </select>
        <input placeholder="Min Quantity (Low Stock Alert)" type="number" value={form.min_quantity} onChange={e => setForm({...form, min_quantity: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        <input placeholder="Price per Unit (Rs)" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        <input placeholder="Supplier Name" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 md:col-span-2" />
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
          {loading ? "Saving..." : editingId ? "Update Material" : "Save Material"}
        </button>
        <button onClick={resetForm} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Materials</h2>
            <p className="text-sm text-teal-600 mt-1">Total: {materials.length} items</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add</button>
        </div>

        {lowStock.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Low Stock Alert!</p>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(m => (
                <span key={m.id} className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full">
                  {m.name} — {m.quantity} {m.unit} left
                </span>
              ))}
            </div>
          </div>
        )}

        {showForm && <MaterialForm title="New Material" />}
        {editingId && <MaterialForm title="Edit Material" />}

        <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
          {/* Mobile */}
          <div className="md:hidden divide-y divide-teal-50">
            {materials.length === 0 ? (
              <p className="text-center py-10 text-teal-400 text-sm">No materials added yet</p>
            ) : (
              materials.map(m => (
                <div key={m.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-teal-800 text-sm">{m.name}</p>
                      <p className="text-xs text-teal-500">{m.category} · {m.supplier}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.quantity <= m.min_quantity ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {m.quantity <= m.min_quantity ? "Low Stock" : "In Stock"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-teal-600">{m.quantity} {m.unit} · Rs {m.price}/unit</p>
                    <div className="flex gap-2">
                      <button onClick={() => updateQuantity(m, 1)} className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-medium">+1</button>
                      <button onClick={() => updateQuantity(m, -1)} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">-1</button>
                      <button onClick={() => openEdit(m)} className="text-teal-600 text-xs font-medium">✏️</button>
                      <button onClick={() => handleDelete(m.id)} className="text-red-400 text-xs font-medium">🗑️</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teal-50">
                <tr>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Quantity</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Price</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-teal-400">No materials added yet</td></tr>
                ) : (
                  materials.map(m => (
                    <tr key={m.id} className="border-t border-teal-50 hover:bg-teal-50">
                      <td className="px-4 py-3 font-medium text-teal-800">{m.name}</td>
                      <td className="px-4 py-3 text-teal-700">{m.category}</td>
                      <td className="px-4 py-3 text-teal-700">{m.quantity} {m.unit}</td>
                      <td className="px-4 py-3 text-teal-700">Rs {m.price}</td>
                      <td className="px-4 py-3 text-teal-700">{m.supplier}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.quantity <= m.min_quantity ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {m.quantity <= m.min_quantity ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => updateQuantity(m, 1)} className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs">+1</button>
                          <button onClick={() => updateQuantity(m, -1)} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">-1</button>
                          <button onClick={() => openEdit(m)} className="text-teal-600 text-xs font-medium">✏️ Edit</button>
                          <button onClick={() => handleDelete(m.id)} className="text-red-400 text-xs font-medium">🗑️</button>
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