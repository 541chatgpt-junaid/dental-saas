"use client";
import { useState, useEffect } from "react";
import { doctorName } from "@/lib/personName";
import EmptyState from "@/components/EmptyState";
import { Calendar, Clock, Pencil, Stethoscope, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import FormError from "@/components/FormError";
import { firstError, saveErrorMessage } from "@/lib/formSave";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useClinic } from "@/lib/ClinicContext";

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
  const [saveError, setSaveError] = useState("");
  const [selectedWorkingDays, setSelectedWorkingDays] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", specialization: "", phone: "", email: "", status: "Active",
    timing_start: "09:00", timing_end: "17:00", off_days: "",
  });
  const router = useRouter();
  const { clinicId } = useClinic();

  const fetchDoctors = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("doctors").select("*").order("id", { ascending: false });
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
    setSaveError("");
  };

  /** Validated row from the form, or an error message naming the problem */
  const doctorRow = () => {
    const error = firstError(
      !form.name.trim() && "Doctor name is required.",
      (!form.timing_start || !form.timing_end) && "Set both the start and end time.",
      form.timing_start && form.timing_end && form.timing_end <= form.timing_start && "End time must be after start time.",
    );
    if (error) return { error, row: null };
    return {
      error: null,
      row: {
        name: form.name.trim(), specialization: form.specialization,
        phone: form.phone, email: form.email, status: form.status,
        timing_start: form.timing_start, timing_end: form.timing_end,
        working_days: selectedWorkingDays.join(", "), off_days: form.off_days,
      },
    };
  };

  const toggleDay = (day: string) => {
    setSelectedWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAdd = async () => {
    const { error: invalid, row } = doctorRow();
    if (!row) { setSaveError(invalid!); return; }
    setLoading(true);
    setSaveError("");
    const { error } = await createClient().from("doctors").insert([{ ...row, clinic_id: clinicId }]);
    setLoading(false);
    // On failure the form stays open with everything typed
    if (error) { setSaveError(saveErrorMessage(error, "doctor")); return; }
    resetForm();
    fetchDoctors();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    const { error: invalid, row } = doctorRow();
    if (!row) { setSaveError(invalid!); return; }
    setLoading(true);
    setSaveError("");
    const { error } = await createClient().from("doctors").update(row).eq("id", editingId);
    setLoading(false);
    if (error) { setSaveError(saveErrorMessage(error, "doctor")); return; }
    resetForm();
    fetchDoctors();
  };

  const openEdit = (d: Doctor) => {
    setEditingId(d.id);
    setSaveError("");
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
    const { error } = await supabase.from("doctors").delete().eq("id", id);
    if (error) alert(saveErrorMessage(error, "doctor").replace("save", "delete"));
    fetchDoctors();
  };

  const toggleStatus = async (doctor: Doctor) => {
    const supabase = createClient();
    const newStatus = doctor.status === "Active" ? "Inactive" : "Active";
    const { error } = await supabase.from("doctors").update({ status: newStatus }).eq("id", doctor.id);
    if (error) alert(saveErrorMessage(error, "doctor status"));
    fetchDoctors();
  };

  const showAnyForm = showForm || !!editingId;

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Doctors</h2>
            <p className="text-sm text-brand-600 mt-1">Total: {doctors.length} doctors</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">
            + Add Doctor
          </button>
        </div>

        {showAnyForm && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">{editingId ? "Edit Doctor" : "New Doctor"}</h3>
            <FormError message={saveError} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <input placeholder="Specialization" value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <input placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            {/* Timing Section */}
            <div className="mt-4 p-4 bg-brand-50 rounded-xl border border-brand-100">
              <p className="text-sm font-semibold text-brand-800 mb-3"><Clock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Timing & Schedule</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-brand-600 mb-1">Start Time</label>
                  <input type="time" value={form.timing_start} onChange={e => setForm({...form, timing_start: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-brand-600 mb-1">End Time</label>
                  <input type="time" value={form.timing_end} onChange={e => setForm({...form, timing_end: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold bg-white" />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-brand-600 mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {days.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedWorkingDays.includes(day)
                          ? "bg-brand-600 text-white"
                          : "bg-white text-brand-600 border border-brand-200 hover:bg-brand-50"
                      }`}>
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-brand-600 mb-1">Off Days / Leave Notes (optional)</label>
                <input placeholder="e.g. Every 2nd Saturday, Public holidays" value={form.off_days} onChange={e => setForm({...form, off_days: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold bg-white" />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : editingId ? "Update Doctor" : "Save Doctor"}
              </button>
              <button onClick={resetForm} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-brand-50">
            {doctors.length === 0 ? (
              <EmptyState icon={Stethoscope} title="No doctors yet" hint="Add the doctors who work at your clinic." />
            ) : (
              doctors.map(d => (
                <div key={d.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-brand-800 text-sm">{doctorName(d.name)}</p>
                      <p className="text-xs text-brand-500">{d.specialization}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-brand-400 mt-1">{d.phone} · {d.email}</p>
                  {(d.timing_start || d.timing_end) && (
                    <p className="text-xs text-brand-500 mt-1"><Clock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{d.timing_start} — {d.timing_end}</p>
                  )}
                  {d.working_days && (
                    <p className="text-xs text-brand-500 mt-0.5"><Calendar className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{d.working_days}</p>
                  )}
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => openEdit(d)} className="text-brand-600 text-xs font-medium"><Pencil className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Edit</button>
                    <button onClick={() => toggleStatus(d)} className="text-brand-600 text-xs font-medium">{d.status === "Active" ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-400 text-xs font-medium"><Trash2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50">
                <tr>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Specialization</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Timing</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Working Days</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {doctors.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon={Stethoscope} title="No doctors yet" hint="Add the doctors who work at your clinic." /></td></tr>
                ) : (
                  doctors.map(d => (
                    <tr key={d.id} className="border-t border-brand-50 hover:bg-brand-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-800">{doctorName(d.name)}</p>
                        <p className="text-xs text-brand-400">{d.email}</p>
                      </td>
                      <td className="px-4 py-3 text-brand-700">{d.specialization}</td>
                      <td className="px-4 py-3 text-brand-700">{d.phone}</td>
                      <td className="px-4 py-3 text-brand-700">
                        {d.timing_start && d.timing_end ? (
                          <p className="text-sm"><Clock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{d.timing_start} — {d.timing_end}</p>
                        ) : <p className="text-brand-300 text-xs">Not set</p>}
                        {d.off_days && <p className="text-xs text-brand-400 mt-0.5">Off: {d.off_days}</p>}
                      </td>
                      <td className="px-4 py-3 text-brand-700">
                        {d.working_days ? (
                          <div className="flex flex-wrap gap-1">
                            {d.working_days.split(", ").map(day => (
                              <span key={day} className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">{day.slice(0,3)}</span>
                            ))}
                          </div>
                        ) : <p className="text-brand-300 text-xs">Not set</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(d)} className="text-brand-600 text-xs font-medium"><Pencil className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Edit</button>
                          <button onClick={() => toggleStatus(d)} className="text-brand-600 text-xs font-medium">{d.status === "Active" ? "Deactivate" : "Activate"}</button>
                          <button aria-label="Delete" title="Delete" onClick={() => handleDelete(d.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
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