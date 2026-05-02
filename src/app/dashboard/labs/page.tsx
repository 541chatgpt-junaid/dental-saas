"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface Lab {
  id: number;
  patient_name: string;
  lab_name: string;
  work_type: string;
  units: number;
  shade: string;
  material: string;
  given_date: string;
  delivery_date: string;
  fee: number;
  fee_paid: number;
  status: string;
  notes: string;
  user_id: string;
}

export default function Labs() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    patient_name: "", lab_name: "", work_type: "Crown",
    units: "1", shade: "", material: "Zirconia",
    given_date: "", delivery_date: "", fee: "", fee_paid: "0",
    status: "Pending", notes: "",
  });
  const router = useRouter();

  const fetchLabs = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("labs").select("*").eq("user_id", user?.id).order("id", { ascending: false });
    if (data) setLabs(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchLabs();
  }, [router]);

  const resetForm = () => {
    setForm({ patient_name: "", lab_name: "", work_type: "Crown", units: "1", shade: "", material: "Zirconia", given_date: "", delivery_date: "", fee: "", fee_paid: "0", status: "Pending", notes: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("labs").insert([{
      patient_name: form.patient_name, lab_name: form.lab_name,
      work_type: form.work_type, units: parseInt(form.units) || 1,
      shade: form.shade, material: form.material,
      given_date: form.given_date, delivery_date: form.delivery_date,
      fee: parseInt(form.fee) || 0, fee_paid: parseInt(form.fee_paid) || 0,
      status: form.status, notes: form.notes, user_id: user?.id,
    }]);
    resetForm();
    setLoading(false);
    fetchLabs();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("labs").update({
      patient_name: form.patient_name, lab_name: form.lab_name,
      work_type: form.work_type, units: parseInt(form.units) || 1,
      shade: form.shade, material: form.material,
      given_date: form.given_date, delivery_date: form.delivery_date,
      fee: parseInt(form.fee) || 0, fee_paid: parseInt(form.fee_paid) || 0,
      status: form.status, notes: form.notes,
    }).eq("id", editingId);
    resetForm();
    setLoading(false);
    fetchLabs();
  };

  const openEdit = (l: Lab) => {
    setEditingId(l.id);
    setForm({
      patient_name: l.patient_name, lab_name: l.lab_name,
      work_type: l.work_type, units: l.units.toString(),
      shade: l.shade || "", material: l.material,
      given_date: l.given_date || "", delivery_date: l.delivery_date || "",
      fee: l.fee.toString(), fee_paid: l.fee_paid.toString(),
      status: l.status, notes: l.notes || "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this lab record?")) return;
    const supabase = createClient();
    await supabase.from("labs").delete().eq("id", id);
    fetchLabs();
  };

  const handlePayment = async (lab: Lab, extraPayment: number) => {
    const supabase = createClient();
    const newPaid = lab.fee_paid + extraPayment;
    const newStatus = newPaid >= lab.fee ? "Delivered" : lab.status;
    await supabase.from("labs").update({ fee_paid: newPaid, status: newStatus }).eq("id", lab.id);
    fetchLabs();
  };

  const updateStatus = async (lab: Lab, newStatus: string) => {
    const supabase = createClient();
    await supabase.from("labs").update({ status: newStatus }).eq("id", lab.id);
    fetchLabs();
  };

  const showAnyForm = showForm || !!editingId;

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Lab Records</h2>
            <p className="text-sm text-teal-600 mt-1">Total: {labs.length} records</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add</button>
        </div>

        {showAnyForm && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">{editingId ? "Edit Lab Record" : "New Lab Record"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Patient Name" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Lab Name" value={form.lab_name} onChange={e => setForm({...form, lab_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.work_type} onChange={e => setForm({...form, work_type: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Crown</option><option>Bridge</option><option>Denture</option><option>Retainer</option><option>Night Guard</option>
              </select>
              <input placeholder="Units" type="number" value={form.units} onChange={e => setForm({...form, units: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Shade (e.g. A1, A2)" value={form.shade} onChange={e => setForm({...form, shade: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.material} onChange={e => setForm({...form, material: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Zirconia</option><option>PFM</option><option>Acrylic</option><option>Metal</option><option>E-max</option>
              </select>
              <div>
                <label className="block text-xs text-teal-600 mb-1">Given Date</label>
                <input type="date" value={form.given_date} onChange={e => setForm({...form, given_date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-teal-600 mb-1">Delivery Date</label>
                <input type="date" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <input placeholder="Total Fee (Rs)" type="number" value={form.fee} onChange={e => setForm({...form, fee: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Fee Paid (Rs)" type="number" value={form.fee_paid} onChange={e => setForm({...form, fee_paid: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Pending</option><option>Delivered</option>
              </select>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : editingId ? "Update Record" : "Save Record"}
              </button>
              <button onClick={resetForm} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
          <div className="md:hidden divide-y divide-teal-50">
            {labs.length === 0 ? (
              <p className="text-center py-10 text-teal-400 text-sm">No lab records yet</p>
            ) : (
              labs.map(l => (
                <div key={l.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-teal-800 text-sm">{l.patient_name}</p>
                      <p className="text-xs text-teal-500">{l.lab_name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{l.status}</span>
                  </div>
                  <p className="text-xs text-teal-600">{l.work_type} x{l.units} · {l.shade} · {l.material}</p>
                  <p className="text-xs text-teal-400 mt-1">Delivery: {l.delivery_date}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-teal-600">Paid: Rs {l.fee_paid} / Rs {l.fee}</p>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(l)} className="text-teal-600 text-xs font-medium">✏️</button>
                      {l.fee_paid < l.fee && <button onClick={() => { const a = prompt(`Payment:`); if (a) handlePayment(l, parseInt(a)); }} className="text-teal-600 text-xs font-medium">Pay</button>}
                      {l.status === "Pending" && <button onClick={() => updateStatus(l, "Delivered")} className="text-green-600 text-xs font-medium">Delivered</button>}
                      <button onClick={() => handleDelete(l.id)} className="text-red-400 text-xs font-medium">🗑️</button>
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
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Patient</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Lab</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Work</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Delivery</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Fee</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Paid</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {labs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-teal-400">No lab records yet</td></tr>
                ) : (
                  labs.map(l => (
                    <tr key={l.id} className="border-t border-teal-50 hover:bg-teal-50">
                      <td className="px-4 py-3 font-medium text-teal-800">{l.patient_name}</td>
                      <td className="px-4 py-3 text-teal-700">{l.lab_name}</td>
                      <td className="px-4 py-3 text-teal-700">{l.work_type} x{l.units}<p className="text-xs text-teal-400">{l.shade} · {l.material}</p></td>
                      <td className="px-4 py-3 text-teal-700">{l.delivery_date}</td>
                      <td className="px-4 py-3 text-teal-700">Rs {l.fee}</td>
                      <td className="px-4 py-3 text-teal-700">Rs {l.fee_paid}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${l.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{l.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => openEdit(l)} className="text-teal-600 text-xs font-medium">✏️ Edit</button>
                          {l.fee_paid < l.fee && <button onClick={() => { const a = prompt(`Payment for ${l.patient_name}:`); if (a) handlePayment(l, parseInt(a)); }} className="text-teal-600 text-xs font-medium">Pay</button>}
                          {l.status === "Pending" && <button onClick={() => updateStatus(l, "Delivered")} className="text-green-600 text-xs font-medium">Delivered</button>}
                          <button onClick={() => handleDelete(l.id)} className="text-red-400 text-xs font-medium">🗑️</button>
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