"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface Staff {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string;
}

const allPages = [
  "Dashboard", "Patients", "Appointments", "Doctors",
  "Lab Records", "Materials", "Expenses", "Reports", "Staff", "Settings",
];

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", role: "Receptionist", status: "Active",
  });
  const router = useRouter();

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
    setSelectedPermissions(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  const toggleEditPermission = (page: string) => {
    setEditPermissions(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("staff").insert([{
      name: form.name,
      email: form.email,
      role: form.role,
      status: form.status,
      permissions: selectedPermissions.join(","),
    }]);
    setForm({ name: "", email: "", role: "Receptionist", status: "Active" });
    setSelectedPermissions([]);
    setShowForm(false);
    setLoading(false);
    fetchStaff();
  };

  const handleEditPermissions = async () => {
    if (!editingStaff) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("staff").update({
      permissions: editPermissions.join(","),
    }).eq("id", editingStaff.id);
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
    const newStatus = s.status === "Active" ? "Inactive" : "Active";
    await supabase.from("staff").update({ status: newStatus }).eq("id", s.id);
    fetchStaff();
  };

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-8">

        {/* Edit Permissions Modal */}
        {editingStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-teal-800 mb-1">Edit Permissions</h3>
              <p className="text-sm text-teal-500 mb-4">{editingStaff.name} — {editingStaff.role}</p>

              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-semibold text-teal-700">Page Access</p>
                <div className="flex gap-2">
                  <button onClick={() => setEditPermissions([...allPages])} className="text-xs text-teal-600 hover:underline">Select All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setEditPermissions([])} className="text-xs text-red-400 hover:underline">Clear All</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                {allPages.map(page => (
                  <label key={page} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-teal-50">
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(page)}
                      onChange={() => toggleEditPermission(page)}
                      className="accent-teal-600 w-4 h-4"
                    />
                    <span className="text-sm text-teal-700">{page}</span>
                  </label>
                ))}
              </div>

              {editPermissions.length > 0 && (
                <p className="text-xs text-teal-500 mb-4">✅ {editPermissions.length} pages selected</p>
              )}

              <div className="flex gap-3">
                <button onClick={handleEditPermissions} disabled={loading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                  {loading ? "Saving..." : "Save Permissions"}
                </button>
                <button onClick={() => setEditingStaff(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-teal-800">Staff Management</h2>
            <p className="text-sm text-teal-600 mt-1">Total: {staff.length} staff members</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
            + Add Staff
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 font-medium">ℹ️ Default Password</p>
          <p className="text-xs text-blue-500 mt-1">Naye staff member ka default password: <span className="font-bold">DentEase@123</span></p>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">New Staff Member</h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input placeholder="Email Address" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Receptionist</option>
                <option>Doctor</option>
                <option>Assistant</option>
                <option>Manager</option>
              </select>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            <div className="border border-teal-100 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-teal-800">Page Access Permissions</p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedPermissions([...allPages])} className="text-xs text-teal-600 hover:underline">Select All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setSelectedPermissions([])} className="text-xs text-red-400 hover:underline">Clear All</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {allPages.map(page => (
                  <label key={page} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-teal-50">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(page)}
                      onChange={() => togglePermission(page)}
                      className="accent-teal-600 w-4 h-4"
                    />
                    <span className="text-sm text-teal-700">{page}</span>
                  </label>
                ))}
              </div>
              {selectedPermissions.length > 0 && (
                <p className="text-xs text-teal-500 mt-3">✅ {selectedPermissions.length} pages selected</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Adding..." : "Add Staff Member"}
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
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Permissions</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-teal-400">No staff members added yet</td></tr>
              ) : (
                staff.map(s => (
                  <tr key={s.id} className="border-t border-teal-50 hover:bg-teal-50">
                    <td className="px-4 py-3 font-medium text-teal-800">{s.name}</td>
                    <td className="px-4 py-3 text-teal-700">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        s.role === "Doctor" ? "bg-blue-100 text-blue-700" :
                        s.role === "Receptionist" ? "bg-purple-100 text-purple-700" :
                        s.role === "Manager" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.permissions ? s.permissions.split(",").map(p => (
                          <span key={p} className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">{p}</span>
                        )) : <span className="text-gray-400 text-xs">No permissions</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => openEdit(s)} className="text-teal-600 hover:text-teal-800 text-xs font-medium">
                          ✏️ Edit Permissions
                        </button>
                        <button onClick={() => toggleStatus(s)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
                          {s.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
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
  );
}