"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface Doctor {
  id: number;
  name: string;
  specialization: string;
  phone: string;
  email: string;
  status: string;
  timing_start: string;
  timing_end: string;
  working_days: string;
  off_days: string;
  user_id: string;
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedWorkingDays, setSelectedWorkingDays] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", specialization: "", phone: "", email: "", status: "Active",
    timing_start: "09:00", timing_end: "17:00", off_days: "",
  });
  const router = useRouter();

  const fetchDoctors = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("doctors").select("*").eq("user_id", user?.id).order("id", { ascending: false });
    if (data) setDoctors(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchDoctors();
  }, [router]);

  const resetForm = () => {
    setForm({ name: "", specialization: "", phone: "", email: "", status: "Active", timing_start: "09:00", timing_end: "17:00", off_days: "" });
    setSelectedWorkingDays([]);
    setShowForm(false);
    setEditingId(null);
  };

  const toggleDay = (day: string) => {
    setSelectedWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("doctors").insert([{
      name: form.name, specialization: form.specialization,
      phone: form.phone, email: form.email,
      status: form.status, user_id: user?.id,
      timing_start: form.timing_start,
      timing_end: form.timing_end,
      working_days: selectedWorkingDays.join(", "),
      off_days: form.off_days,
    }]);
    resetForm();
    setLoading(false);
    fetchDoctors();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("doctors").update({
      name: form.name, specialization: form.specialization,
      phone: form.phone, email: form.email, status: form.status,
      timing_start: form.timing_start,
      timing_end: form.timing_end,
      working_days: selectedWorkingDays.join(", "),
      off_days: form.off_days,
    }).eq("id", editingId);
    resetForm();
    setLoading(false);
    fetchDoctors();
  };

  const openEdit = (d: Doctor) => {
    setEditingId(d.id);
    setForm({
      name: d.name, specialization: d.specialization,
      phone: d.phone, email: d.email, status: d.status,
      timing_start: d.timing_start || "09:00",
      timing_end: d.timing_end || "17:00",
      off_days: d.off_days || "",
    });
    setSelectedWorkingDays(d.working_days ? d.working_days.split(", ") : []);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this doctor?")) return;
    const supabase = createClient();
    await supabase.from("doctors").delete().eq("id", id);
    fetchDoctors();
  };

  const toggleStatus = async (doctor: Doctor) => {
    const supabase = createClient();
    const newStatus = doctor.status === "Active" ? "Inactive" : "Active";
    await supabase.from("doctors").update({ status: newStatus }).eq("id", doctor.id);
    fetchDoctors();
  };

  const showAnyForm = showForm || !!editingId;

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Doctors</h2>
            <p className="text-sm text-teal-600 mt-1">Total: {doctors.length} doctors</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">
            + Add Doctor
          </button>
        </div>

        {showAnyForm && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">{editingId ? "Edit Doctor" : "New Doctor"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Specialization" value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            {/* Timing Section */}
            <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
              <p className="text-sm font-semibold text-teal-800 mb-3">⏰ Timing & Schedule</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-teal-600 mb-1">Start Time</label>
                  <input type="time" value={form.timing_start} onChange={e => setForm({...form, timing_start: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-teal-600 mb-1">End Time</label>
                  <input type="time" value={form.timing_end} onChange={e => setForm({...form, timing_end: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-teal-600 mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {days.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedWorkingDays.includes(day)
                          ? "bg-teal-600 text-white"
                          : "bg-white text-teal-600 border border-teal-200 hover:bg-teal-50"
                      }`}>
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-teal-600 mb-1">Off Days / Leave Notes (optional)</label>
                <input placeholder="e.g. Every 2nd Saturday, Public holidays" value={form.off_days} onChange={e => setForm({...form, off_days: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : editingId ? "Update Doctor" : "Save Doctor"}
              </button>
              <button onClick={resetForm} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-teal-50">
            {doctors.length === 0 ? (
              <p className="text-center py-10 text-teal-400 text-sm">No doctors added yet</p>
            ) : (
              doctors.map(d => (
                <div key={d.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-teal-800 text-sm">{d.name}</p>
                      <p className="text-xs text-teal-500">{d.specialization}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-teal-400 mt-1">{d.phone} · {d.email}</p>
                  {(d.timing_start || d.timing_end) && (
                    <p className="text-xs text-teal-500 mt-1">⏰ {d.timing_start} — {d.timing_end}</p>
                  )}
                  {d.working_days && (
                    <p className="text-xs text-teal-500 mt-0.5">📅 {d.working_days}</p>
                  )}
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => openEdit(d)} className="text-teal-600 text-xs font-medium">✏️ Edit</button>
                    <button onClick={() => toggleStatus(d)} className="text-teal-600 text-xs font-medium">{d.status === "Active" ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-400 text-xs font-medium">🗑️ Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-teal-50">
                <tr>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Specialization</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Timing</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Working Days</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {doctors.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-teal-400">No doctors added yet</td></tr>
                ) : (
                  doctors.map(d => (
                    <tr key={d.id} className="border-t border-teal-50 hover:bg-teal-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-teal-800">{d.name}</p>
                        <p className="text-xs text-teal-400">{d.email}</p>
                      </td>
                      <td className="px-4 py-3 text-teal-700">{d.specialization}</td>
                      <td className="px-4 py-3 text-teal-700">{d.phone}</td>
                      <td className="px-4 py-3 text-teal-700">
                        {d.timing_start && d.timing_end ? (
                          <p className="text-sm">⏰ {d.timing_start} — {d.timing_end}</p>
                        ) : <p className="text-teal-300 text-xs">Not set</p>}
                        {d.off_days && <p className="text-xs text-teal-400 mt-0.5">Off: {d.off_days}</p>}
                      </td>
                      <td className="px-4 py-3 text-teal-700">
                        {d.working_days ? (
                          <div className="flex flex-wrap gap-1">
                            {d.working_days.split(", ").map(day => (
                              <span key={day} className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">{day.slice(0,3)}</span>
                            ))}
                          </div>
                        ) : <p className="text-teal-300 text-xs">Not set</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(d)} className="text-teal-600 text-xs font-medium">✏️ Edit</button>
                          <button onClick={() => toggleStatus(d)} className="text-teal-600 text-xs font-medium">{d.status === "Active" ? "Deactivate" : "Activate"}</button>
                          <button onClick={() => handleDelete(d.id)} className="text-red-400 text-xs font-medium">🗑️</button>
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