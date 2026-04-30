"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface Appointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  time: string;
  treatment: string;
  status: string;
  notes: string;
  user_id: string;
}

interface Doctor {
  id: number;
  name: string;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    patient_name: "", doctor_name: "", date: "",
    time: "", treatment: "", status: "Scheduled", notes: "",
  });
  const router = useRouter();

  const fetchAppointments = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("appointments").select("*").eq("user_id", user?.id).order("date", { ascending: true });
    if (data) setAppointments(data);
  };

  const fetchDoctors = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("doctors").select("id, name").eq("status", "Active").eq("user_id", user?.id);
    if (data) setDoctors(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchAppointments();
    fetchDoctors();
  }, [router]);

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("appointments").insert([{
      patient_name: form.patient_name,
      doctor_name: form.doctor_name,
      date: form.date,
      time: form.time,
      treatment: form.treatment,
      status: form.status,
      notes: form.notes,
      user_id: user?.id,
    }]);
    setForm({ patient_name: "", doctor_name: "", date: "", time: "", treatment: "", status: "Scheduled", notes: "" });
    setShowForm(false);
    setLoading(false);
    fetchAppointments();
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const supabase = createClient();
    await supabase.from("appointments").update({ status: newStatus }).eq("id", id);
    fetchAppointments();
  };

  const today = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter(a => a.date === today);

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      status === "Completed" ? "bg-green-100 text-green-700" :
      status === "Scheduled" ? "bg-blue-100 text-blue-700" :
      "bg-red-100 text-red-700"
    }`}>{status}</span>
  );

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Appointments</h2>
            <p className="text-sm text-teal-600 mt-1">Total: {appointments.length} appointments</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">
            + Add
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">New Appointment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Patient Name" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.doctor_name} onChange={e => setForm({...form, doctor_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="">Select Doctor</option>
                {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <div>
                <label className="block text-xs text-teal-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs text-teal-600 mb-1">Time</label>
                <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <input placeholder="Treatment" value={form.treatment} onChange={e => setForm({...form, treatment: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option>Scheduled</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 md:col-span-2" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : "Save Appointment"}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Today's Appointments */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-teal-800 mb-3">Today's Appointments</h3>
          <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-teal-50">
              {todayAppts.length === 0 ? (
                <p className="text-center py-6 text-teal-400 text-sm">No appointments today</p>
              ) : (
                todayAppts.map(a => (
                  <div key={a.id} className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-teal-800 text-sm">{a.patient_name}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-xs text-teal-600">{a.treatment} · Dr. {a.doctor_name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-teal-400">{a.time}</p>
                      {a.status === "Scheduled" && (
                        <div className="flex gap-2">
                          <button onClick={() => updateStatus(a.id, "Completed")} className="text-green-600 text-xs font-medium">✓ Done</button>
                          <button onClick={() => updateStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium">✗ Cancel</button>
                        </div>
                      )}
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
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Patient</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Doctor</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Time</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Treatment</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppts.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-teal-400">No appointments today</td></tr>
                  ) : (
                    todayAppts.map(a => (
                      <tr key={a.id} className="border-t border-teal-50 hover:bg-teal-50">
                        <td className="px-4 py-3 font-medium text-teal-800">{a.patient_name}</td>
                        <td className="px-4 py-3 text-teal-700">{a.doctor_name}</td>
                        <td className="px-4 py-3 text-teal-700">{a.time}</td>
                        <td className="px-4 py-3 text-teal-700">{a.treatment}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-3">
                          {a.status === "Scheduled" && (
                            <div className="flex gap-2">
                              <button onClick={() => updateStatus(a.id, "Completed")} className="text-green-600 hover:text-green-800 text-xs font-medium">Done</button>
                              <button onClick={() => updateStatus(a.id, "Cancelled")} className="text-red-500 hover:text-red-700 text-xs font-medium">Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* All Appointments */}
        <div>
          <h3 className="text-sm font-semibold text-teal-800 mb-3">All Appointments</h3>
          <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-teal-50">
              {appointments.length === 0 ? (
                <p className="text-center py-10 text-teal-400 text-sm">No appointments yet</p>
              ) : (
                appointments.map(a => (
                  <div key={a.id} className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-teal-800 text-sm">{a.patient_name}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="text-xs text-teal-600">{a.treatment} · Dr. {a.doctor_name}</p>
                    <p className="text-xs text-teal-400 mt-1">{a.date} · {a.time}</p>
                  </div>
                ))
              )}
            </div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-teal-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Patient</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Doctor</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Time</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Treatment</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-teal-400">No appointments yet</td></tr>
                  ) : (
                    appointments.map(a => (
                      <tr key={a.id} className="border-t border-teal-50 hover:bg-teal-50">
                        <td className="px-4 py-3 font-medium text-teal-800">{a.patient_name}</td>
                        <td className="px-4 py-3 text-teal-700">{a.doctor_name}</td>
                        <td className="px-4 py-3 text-teal-700">{a.date}</td>
                        <td className="px-4 py-3 text-teal-700">{a.time}</td>
                        <td className="px-4 py-3 text-teal-700">{a.treatment}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}