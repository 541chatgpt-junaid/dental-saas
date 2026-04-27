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
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", specialization: "", phone: "", email: "", status: "Active",
  });
  const router = useRouter();

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

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("doctors").insert([{
      name: form.name,
      specialization: form.specialization,
      phone: form.phone,
      email: form.email,
      status: form.status,
    }]);
    setForm({ name: "", specialization: "", phone: "", email: "", status: "Active" });
    setShowForm(false);
    setLoading(false);
    fetchDoctors();
  };

  const toggleStatus = async (doctor: Doctor) => {
    const supabase = createClient();
    const newStatus = doctor.status === "Active" ? "Inactive" : "Active";
    await supabase.from("doctors").update({ status: newStatus }).eq("id", doctor.id);
    fetchDoctors();
  };

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-teal-800">Doctors</h2>
            <p className="text-sm text-teal-600 mt-1">Total: {doctors.length} doctors</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
            + Add Doctor
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">New Doctor</h3>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Specialization (e.g. Orthodontist)" value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : "Save Doctor"}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-teal-50">
              <tr>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Specialization</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {doctors.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-teal-400">No doctors added yet</td></tr>
              ) : (
                doctors.map(d => (
                  <tr key={d.id} className="border-t border-teal-50 hover:bg-teal-50">
                    <td className="px-4 py-3 font-medium text-teal-800">{d.name}</td>
                    <td className="px-4 py-3 text-teal-700">{d.specialization}</td>
                    <td className="px-4 py-3 text-teal-700">{d.phone}</td>
                    <td className="px-4 py-3 text-teal-700">{d.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(d)} className="text-teal-600 hover:text-teal-800 text-xs font-medium">
                        {d.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
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