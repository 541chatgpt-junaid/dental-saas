"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
  created_at: string;
  patient_count: number;
  visit_count: number;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminPanel() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", adminPassword: "",
  });
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const { data: staffData } = await supabase
        .from("staff")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (staffData?.role !== "superadmin") {
        router.push("/unauthorized");
        return;
      }
      setAuthorized(true);
      fetchClinics();
    })();
  }, [router]);

  const fetchClinics = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/clinics");
    const data = await res.json();
    setClinics(data);
    setLoading(false);
  };

  const toggleActive = async (clinic: Clinic) => {
    await fetch("/api/admin/clinics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicId: clinic.id, is_active: !clinic.is_active }),
    });
    fetchClinics();
  };

  const handleExport = (clinicId: string) => {
    window.open(`/api/admin/export?clinicId=${clinicId}`, "_blank");
  };

  const handleAddClinic = async () => {
    setFormLoading(true);
    setFormError("");
    const res = await fetch("/api/admin/clinics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) {
      setFormError(data.error);
    } else {
      setFormSuccess("Clinic created successfully!");
      setForm({ name: "", email: "", phone: "", address: "", adminPassword: "" });
      setShowForm(false);
      fetchClinics();
    }
    setFormLoading(false);
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Super Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">Manage all registered clinics</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setFormError(""); setFormSuccess(""); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add New Clinic
          </button>
        </div>

        {formSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-700 text-sm font-medium">
            ✅ {formSuccess}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Register New Clinic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input placeholder="Clinic Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Admin Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Admin Password *" type="password" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 md:col-span-2" />
            </div>
            {formError && <p className="text-red-600 text-sm mb-3">❌ {formError}</p>}
            <div className="flex gap-3">
              <button onClick={handleAddClinic} disabled={formLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {formLoading ? "Creating..." : "Create Clinic"}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Loading clinics...</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-4">
              {clinics.map(clinic => (
                <div key={clinic.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{clinic.name}</p>
                      <p className="text-xs text-gray-500">{clinic.email}</p>
                      <p className="text-xs text-gray-400">{clinic.phone}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${clinic.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {clinic.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 mb-3">
                    <span>👥 {clinic.patient_count} patients</span>
                    <span>🩺 {clinic.visit_count} visits</span>
                    <span>📅 {formatDate(clinic.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleActive(clinic)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${clinic.is_active ? "border-red-200 text-red-600" : "border-green-200 text-green-600"}`}>
                      {clinic.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => handleExport(clinic.id)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-medium">
                      Export CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-600 font-medium">Clinic</th>
                    <th className="text-left px-5 py-3 text-gray-600 font-medium">Contact</th>
                    <th className="text-left px-5 py-3 text-gray-600 font-medium">Registered</th>
                    <th className="text-left px-5 py-3 text-gray-600 font-medium">Patients</th>
                    <th className="text-left px-5 py-3 text-gray-600 font-medium">Visits</th>
                    <th className="text-left px-5 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clinics.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">No clinics registered yet</td></tr>
                  ) : (
                    clinics.map(clinic => (
                      <tr key={clinic.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800">{clinic.name}</p>
                          <p className="text-xs text-gray-400">{clinic.address || "—"}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-gray-700">{clinic.email}</p>
                          <p className="text-xs text-gray-400">{clinic.phone || "—"}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(clinic.created_at)}</td>
                        <td className="px-5 py-3 font-medium text-gray-800">{clinic.patient_count}</td>
                        <td className="px-5 py-3 font-medium text-gray-800">{clinic.visit_count}</td>
                        <td className="px-5 py-3">
                          <button onClick={() => toggleActive(clinic)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${clinic.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                            {clinic.is_active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <button onClick={() => handleExport(clinic.id)} className="text-indigo-600 text-xs font-medium hover:underline">
                            Export CSV
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
