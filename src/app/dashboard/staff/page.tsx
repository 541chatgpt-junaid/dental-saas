"use client";
import { useState, useEffect } from "react";
import EmptyState from "@/components/EmptyState";
import { CircleCheck, CircleX, Info, Pencil, Trash2, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { saveErrorMessage } from "@/lib/formSave";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useClinic } from "@/lib/ClinicContext";
import { MIN_PASSWORD_LENGTH, passwordError } from "@/lib/passwordRules";

interface Staff {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string;
  user_id: string;
}

const allPages = [
  "Dashboard", "Patients", "Appointments", "Queue", "Treatment Plans", "Recalls", "Doctors", "Commissions",
  "Lab Records", "Billing", "Materials", "Purchases", "Expenses", "Reports", "Staff", "Settings", "Online Booking",
];

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [addResult, setAddResult] = useState<{success?: boolean; error?: string} | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", role: "Receptionist", status: "Active",
    password: "",
  });
  const router = useRouter();
  const { clinicId } = useClinic();

  const fetchStaff = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("staff").select("*").order("id", { ascending: false });
    if (data) setStaff(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchStaff();
  }, [router]);

  const togglePermission = (page: string) => {
    setSelectedPermissions(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);
  };

  const toggleEditPermission = (page: string) => {
    setEditPermissions(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);
  };

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) {
      setAddResult({ error: "Name, email and password are required." });
      return;
    }
    const pwError = passwordError(form.password);
    if (pwError) {
      setAddResult({ error: pwError });
      return;
    }
    setLoading(true);
    setAddResult(null);

    // Step 1: Supabase mein user create karo
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        name: form.name,
      }),
    });
    const result = await res.json();

    if (result.error) {
      setAddResult({ error: result.error });
      setLoading(false);
      return;
    }

    // Step 2: Staff table mein save karo
    const supabase = createClient();
    const { error } = await supabase.from("staff").insert([{
      name: form.name,
      email: form.email,
      role: form.role,
      status: form.status,
      permissions: selectedPermissions.join(","),
      user_id: result.userId,
      clinic_id: clinicId,
    }]);
    if (error) {
      // The login was created but the staff record was not: keep the form so it can be retried
      setAddResult({ error: `The login for ${form.email} was created, but ${saveErrorMessage(error, "staff record").replace(/^C/, "c")}` });
      setLoading(false);
      return;
    }

    setAddResult({ success: true });
    setForm({ name: "", email: "", role: "Receptionist", status: "Active", password: "" });
    setSelectedPermissions([]);
    setShowForm(false);
    setLoading(false);
    fetchStaff();
  };

  const handleEditPermissions = async () => {
    if (!editingStaff) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("staff").update({ permissions: editPermissions.join(",") }).eq("id", editingStaff.id);
    setLoading(false);
    if (error) { alert(saveErrorMessage(error, "permissions")); return; }
    setEditingStaff(null);
    setEditPermissions([]);
    setLoading(false);
    fetchStaff();
  };

  const openEdit = (s: Staff) => {
    setEditingStaff(s);
    setEditPermissions(s.permissions ? s.permissions.split(",") : []);
  };

  const toggleStatus = async (s: Staff) => {
    const supabase = createClient();
    const { error } = await supabase.from("staff").update({ status: s.status === "Active" ? "Inactive" : "Active" }).eq("id", s.id);
    if (error) alert(saveErrorMessage(error, "staff status"));
    fetchStaff();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this staff member?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) alert(saveErrorMessage(error, "staff member").replace("save", "delete"));
    fetchStaff();
  };

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">

        {/* Edit Permissions Modal */}
        {editingStaff && (
          <div className="fixed inset-0 modal-backdrop bg-navy/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
              <h3 className="text-lg font-semibold text-brand-800 mb-1">Edit Permissions</h3>
              <p className="text-sm text-brand-500 mb-4">{editingStaff.name} — {editingStaff.role}</p>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-semibold text-brand-700">Page Access</p>
                <div className="flex gap-2">
                  <button onClick={() => setEditPermissions([...allPages])} className="text-xs text-brand-600 hover:underline">Select All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setEditPermissions([])} className="text-xs text-red-400 hover:underline">Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {allPages.map(page => (
                  <label key={page} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-brand-50">
                    <input type="checkbox" checked={editPermissions.includes(page)} onChange={() => toggleEditPermission(page)} className="accent-gold w-4 h-4" />
                    <span className="text-sm text-brand-700">{page}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleEditPermissions} disabled={loading} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                  {loading ? "Saving…" : "Save Permissions"}
                </button>
                <button onClick={() => setEditingStaff(null)} className="flex-1 border border-brand-200 text-gray-600 py-2.5 rounded-xl text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Staff</h2>
            <p className="text-sm text-brand-600 mt-1">Total: {staff.length} members</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setAddResult(null); }} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">
            + Add Staff
          </button>
        </div>

        {addResult?.success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-700 font-medium"><CircleCheck className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Staff member added successfully! Login credentials have been set.</p>
          </div>
        )}
        {addResult?.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-700 font-medium"><CircleX className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Error: {addResult.error}</p>
          </div>
        )}

        {showForm && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">New Staff Member</h3>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700 font-medium"><Info className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Staff members sign in with the email and password you set here.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
              <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <input placeholder="Email Address" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <input placeholder={`Password (min. ${MIN_PASSWORD_LENGTH} characters)`} type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Receptionist</option>
                <option>Doctor</option>
                <option>Assistant</option>
                <option>Manager</option>
              </select>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            <div className="border border-brand-100 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-brand-800">Page Access</p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedPermissions([...allPages])} className="text-xs text-brand-600 hover:underline">All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setSelectedPermissions([])} className="text-xs text-red-400 hover:underline">Clear</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {allPages.map(page => (
                  <label key={page} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-brand-50">
                    <input type="checkbox" checked={selectedPermissions.includes(page)} onChange={() => togglePermission(page)} className="accent-gold w-4 h-4" />
                    <span className="text-sm text-brand-700">{page}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAdd} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Creating account…" : "Add Staff & Create Login"}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-brand-50">
            {staff.length === 0 ? (
              <EmptyState icon={UserCog} title="No staff members yet" hint="Invite your team and choose what each person can access." />
            ) : (
              staff.map(s => (
                <div key={s.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium text-brand-800 text-sm">{s.name}</p>
                      <p className="text-xs text-brand-500">{s.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.role === "Doctor" ? "bg-blue-100 text-blue-700" : s.role === "Receptionist" ? "bg-purple-100 text-purple-700" : s.role === "Manager" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                        {s.role}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 my-2">
                    {s.permissions ? s.permissions.split(",").slice(0, 4).map(p => (
                      <span key={p} className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">{p}</span>
                    )) : <span className="text-gray-400 text-xs">No permissions</span>}
                    {s.permissions && s.permissions.split(",").length > 4 && (
                      <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">+{s.permissions.split(",").length - 4} more</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => openEdit(s)} className="text-brand-600 text-xs font-medium"><Pencil className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Permissions</button>
                    <button onClick={() => toggleStatus(s)} className="text-xs font-medium text-gray-500">
                      {s.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button aria-label="Delete" title="Delete" onClick={() => handleDelete(s.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
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
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Permissions</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-brand-700 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon={UserCog} title="No staff members yet" hint="Invite your team and choose what each person can access." /></td></tr>
                ) : (
                  staff.map(s => (
                    <tr key={s.id} className="border-t border-brand-50 hover:bg-brand-50">
                      <td className="px-4 py-3 font-medium text-brand-800">{s.name}</td>
                      <td className="px-4 py-3 text-brand-700">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.role === "Doctor" ? "bg-blue-100 text-blue-700" : s.role === "Receptionist" ? "bg-purple-100 text-purple-700" : s.role === "Manager" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                          {s.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.permissions ? s.permissions.split(",").map(p => (
                            <span key={p} className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">{p}</span>
                          )) : <span className="text-gray-400 text-xs">No permissions</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(s)} className="text-brand-600 text-xs font-medium"><Pencil className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Permissions</button>
                          <button onClick={() => toggleStatus(s)} className="text-xs font-medium text-gray-500">
                            {s.status === "Active" ? "Deactivate" : "Activate"}
                          </button>
                          <button aria-label="Delete" title="Delete" onClick={() => handleDelete(s.id)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
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