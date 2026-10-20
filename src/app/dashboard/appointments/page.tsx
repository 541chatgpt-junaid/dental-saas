"use client";
import { useState, useEffect } from "react";
import EmptyState from "@/components/EmptyState";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useClinic } from "@/lib/ClinicContext";
import { waLink } from "@/lib/whatsapp";
import { CalendarDays, CalendarRange, List } from "lucide-react";
import AppointmentCalendar, { slotKey } from "./AppointmentCalendar";

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
  phone?: string | null;
  source?: string | null;
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    patient_name: "", doctor_name: "", date: "",
    time: "", treatment: "", status: "Scheduled", notes: "",
  });
  const router = useRouter();
  const { clinicId, clinicName } = useClinic();
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [view, setView] = useState<"list" | "day" | "week">("list");
  const [calDate, setCalDate] = useState(() => new Date().toLocaleDateString("en-CA"));

  /** Warn before saving a scheduled appointment that clashes with another for the same doctor and time */
  const confirmNoClash = () => {
    if (form.status !== "Scheduled" || !form.date || !form.time || !form.doctor_name) return true;
    const key = slotKey(form);
    const clash = appointments.find(a => a.id !== editingId && a.status === "Scheduled" && slotKey(a) === key);
    return !clash || confirm(`Dr. ${form.doctor_name} already has ${clash.patient_name} at ${clash.time} on ${clash.date}.\n\nBook this appointment anyway?`);
  };

  const newAt = (date: string, time: string, doctor: string) => {
    setEditingId(null);
    setForm({ patient_name: "", doctor_name: doctor, date, time, treatment: "", status: "Scheduled", notes: "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchAppointments = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("appointments").select("*").order("date", { ascending: true });
    if (data) setAppointments(data);
  };

  // Patient phone numbers by name, for WhatsApp reminders (appointments only store the name)
  const fetchPhones = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("name, phone");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(p => { if (p.name && p.phone) map[p.name.trim().toLowerCase()] = p.phone; });
      setPhones(map);
    }
  };

  const confirmLink = (a: Appointment) => {
    const when = new Date(`${a.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const text = `Assalam o Alaikum ${a.patient_name}, your appointment${clinicName ? ` at ${clinicName}` : ""} on ${when}${a.time ? ` at ${a.time}` : ""}${a.doctor_name ? ` with Dr. ${a.doctor_name}` : ""} is confirmed. See you then!`;
    return waLink(a.phone || phones[a.patient_name?.trim().toLowerCase()], text);
  };

  const reminderLink = (a: Appointment) => {
    const when = new Date(`${a.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const text = `Assalam o Alaikum ${a.patient_name}, this is a reminder of your appointment${clinicName ? ` at ${clinicName}` : ""} on ${when}${a.time ? ` at ${a.time}` : ""}${a.doctor_name ? ` with Dr. ${a.doctor_name}` : ""}. Please reply to confirm. Thank you!`;
    return waLink(a.phone || phones[a.patient_name?.trim().toLowerCase()], text);
  };

  const fetchDoctors = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("doctors").select("id, name").eq("status", "Active");
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
    fetchPhones();
  }, [router]);

  const handleAdd = async () => {
    if (!confirmNoClash()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("appointments").insert([{
      patient_name: form.patient_name,
      doctor_name: form.doctor_name,
      date: form.date, time: form.time,
      treatment: form.treatment,
      status: form.status,
      notes: form.notes,
      clinic_id: clinicId,
    }]);
    setForm({ patient_name: "", doctor_name: "", date: "", time: "", treatment: "", status: "Scheduled", notes: "" });
    setShowForm(false);
    setLoading(false);
    fetchAppointments();
  };

  const handleEdit = async () => {
    if (!editingId) return;
    if (!confirmNoClash()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("appointments").update({
      patient_name: form.patient_name,
      doctor_name: form.doctor_name,
      date: form.date, time: form.time,
      treatment: form.treatment,
      status: form.status,
      notes: form.notes,
    }).eq("id", editingId);
    setEditingId(null);
    setForm({ patient_name: "", doctor_name: "", date: "", time: "", treatment: "", status: "Scheduled", notes: "" });
    setLoading(false);
    fetchAppointments();
  };

  const openEdit = (a: Appointment) => {
    setEditingId(a.id);
    setForm({
      patient_name: a.patient_name,
      doctor_name: a.doctor_name,
      date: a.date, time: a.time,
      treatment: a.treatment,
      status: a.status,
      notes: a.notes,
    });
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const supabase = createClient();
    await supabase.from("appointments").update({ status: newStatus }).eq("id", id);
    fetchAppointments();
  };

  const deleteAppointment = async (id: number) => {
    if (!confirm("Delete this appointment?")) return;
    const supabase = createClient();
    await supabase.from("appointments").delete().eq("id", id);
    fetchAppointments();
  };

  const today = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter(a => a.date === today);

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      status === "Completed" ? "bg-green-100 text-green-700" :
      status === "Scheduled" ? "bg-blue-100 text-blue-700" :
      status === "Requested" ? "bg-gold/20 text-[#8a6d12]" :
      "bg-red-100 text-red-700"
    }`}>{status}</span>
  );


  const AppointmentCard = ({ a }: { a: Appointment }) => (
    <div className="p-4">
      <div className="flex justify-between items-start mb-1">
        <p className="font-medium text-brand-800 text-sm">{a.patient_name}</p>
        <StatusBadge status={a.status} />
      </div>
      <p className="text-xs text-brand-600">{a.treatment} · Dr. {a.doctor_name}</p>
      <p className="text-xs text-brand-400 mt-1">{a.date} · {a.time}</p>
      {a.notes && <p className="text-xs text-brand-400">📝 {a.notes}</p>}
      <div className="flex gap-2 mt-2 flex-wrap">
        {a.status === "Requested" && (
          <>
            <button onClick={() => updateStatus(a.id, "Scheduled")} className="text-green-600 text-xs font-semibold">✓ Confirm</button>
            <a href={confirmLink(a)} target="_blank" rel="noreferrer" className="text-[#128C7E] text-xs font-medium">💬 Tell patient</a>
            <button onClick={() => updateStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium">✗ Decline</button>
          </>
        )}
        {a.status === "Scheduled" && (
          <>
            <button onClick={() => updateStatus(a.id, "Completed")} className="text-green-600 text-xs font-medium">✓ Done</button>
            <button onClick={() => updateStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium">✗ Cancel</button>
          </>
        )}
        {a.status === "Scheduled" && <a href={reminderLink(a)} target="_blank" rel="noreferrer" title="Send WhatsApp reminder" className="text-[#128C7E] text-xs font-medium">💬 Remind</a>}
        <button onClick={() => openEdit(a)} className="text-brand-600 text-xs font-medium">✏️ Edit</button>
        <button onClick={() => deleteAppointment(a.id)} className="text-red-400 text-xs font-medium">🗑️ Delete</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Appointments</h2>
            <p className="text-sm text-brand-600 mt-1">Total: {appointments.length} appointments</p>
            {appointments.some(a => a.status === "Requested") && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-[#8a6d12]">
                🌐 {appointments.filter(a => a.status === "Requested").length} online booking request(s) waiting for confirmation
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-brand-200 bg-white p-0.5" role="tablist" aria-label="View">
              {([["list", "List", List], ["day", "Day", CalendarDays], ["week", "Week", CalendarRange]] as const).map(([k, l, Icon]) => (
                <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${view === k ? "bg-brand-700 text-white" : "text-brand-600 hover:bg-brand-50"}`}>
                  <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{l}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">
              + Add
            </button>
          </div>
        </div>

        {(showForm || !!editingId) && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">
              {editingId ? "Edit Appointment" : "New Appointment"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input placeholder="Patient Name" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.doctor_name} onChange={e => setForm({...form, doctor_name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option value="">Select Doctor</option>
                {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <div>
                <label className="block text-xs text-brand-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs text-brand-600 mb-1">Time</label>
                <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </div>
              <input placeholder="Treatment" value={form.treatment} onChange={e => setForm({...form, treatment: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                <option>Scheduled</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold md:col-span-2" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={editingId ? handleEdit : handleAdd} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : editingId ? "Update Appointment" : "Save Appointment"}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ patient_name: "", doctor_name: "", date: "", time: "", treatment: "", status: "Scheduled", notes: "" }); }} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {view !== "list" ? (
          <AppointmentCalendar
            view={view}
            date={calDate}
            onDateChange={setCalDate}
            appointments={appointments}
            doctors={doctors.map(d => d.name)}
            onSelect={a => { const full = appointments.find(x => x.id === a.id); if (full) openEdit(full); }}
            onNew={newAt}
          />
        ) : (<>
        {/* Today's Appointments */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-brand-800 mb-3">Today's Appointments</h3>
          <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
            <div className="md:hidden divide-y divide-brand-50">
              {todayAppts.length === 0 ? (
                <EmptyState icon={CalendarCheck} title="No appointments today" hint="Nothing is scheduled for today." compact />
              ) : (
                todayAppts.map(a => <AppointmentCard key={a.id} a={a} />)
              )}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Patient</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Doctor</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Time</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Treatment</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAppts.length === 0 ? (
                    <tr><td colSpan={6}><EmptyState icon={CalendarCheck} title="No appointments today" hint="Nothing is scheduled for today." compact /></td></tr>
                  ) : (
                    todayAppts.map(a => (
                      <tr key={a.id} className="border-t border-brand-50 hover:bg-brand-50">
                        <td className="px-4 py-3 font-medium text-brand-800">{a.patient_name}</td>
                        <td className="px-4 py-3 text-brand-700">{a.doctor_name}</td>
                        <td className="px-4 py-3 text-brand-700">{a.time}</td>
                        <td className="px-4 py-3 text-brand-700">{a.treatment}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {a.status === "Requested" && (
                              <>
                                <button onClick={() => updateStatus(a.id, "Scheduled")} className="text-green-600 text-xs font-semibold">✓ Confirm</button>
                                <a href={confirmLink(a)} target="_blank" rel="noreferrer" className="text-[#128C7E] text-xs font-medium">💬 Tell patient</a>
                                <button onClick={() => updateStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium">✗ Decline</button>
                              </>
                            )}
                            {a.status === "Scheduled" && (
                              <>
                                <button onClick={() => updateStatus(a.id, "Completed")} className="text-green-600 text-xs font-medium">✓ Done</button>
                                <button onClick={() => updateStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium">✗ Cancel</button>
                              </>
                            )}
                            {a.status === "Scheduled" && <a href={reminderLink(a)} target="_blank" rel="noreferrer" title="Send WhatsApp reminder" className="text-[#128C7E] text-xs font-medium">💬 Remind</a>}
                            <button onClick={() => openEdit(a)} className="text-brand-600 text-xs font-medium">✏️ Edit</button>
                            <button onClick={() => deleteAppointment(a.id)} className="text-red-400 text-xs font-medium">🗑️</button>
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

        {/* All Appointments */}
        <div>
          <h3 className="text-sm font-semibold text-brand-800 mb-3">All Appointments</h3>
          <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
            <div className="md:hidden divide-y divide-brand-50">
              {appointments.length === 0 ? (
                <EmptyState icon={CalendarCheck} title="No appointments yet" hint="Book your first appointment with + Add." />
              ) : (
                appointments.map(a => <AppointmentCard key={a.id} a={a} />)
              )}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Patient</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Doctor</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Time</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Treatment</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-brand-700 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon={CalendarCheck} title="No appointments yet" hint="Book your first appointment with + Add." /></td></tr>
                  ) : (
                    appointments.map(a => (
                      <tr key={a.id} className="border-t border-brand-50 hover:bg-brand-50">
                        <td className="px-4 py-3 font-medium text-brand-800">{a.patient_name}</td>
                        <td className="px-4 py-3 text-brand-700">{a.doctor_name}</td>
                        <td className="px-4 py-3 text-brand-700">{a.date}</td>
                        <td className="px-4 py-3 text-brand-700">{a.time}</td>
                        <td className="px-4 py-3 text-brand-700">{a.treatment}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {a.status === "Requested" && (
                              <>
                                <button onClick={() => updateStatus(a.id, "Scheduled")} className="text-green-600 text-xs font-semibold">✓ Confirm</button>
                                <a href={confirmLink(a)} target="_blank" rel="noreferrer" className="text-[#128C7E] text-xs font-medium">💬 Tell patient</a>
                                <button onClick={() => updateStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium">✗ Decline</button>
                              </>
                            )}
                            {a.status === "Scheduled" && (
                              <>
                                <button onClick={() => updateStatus(a.id, "Completed")} className="text-green-600 text-xs font-medium">✓ Done</button>
                                <button onClick={() => updateStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium">✗ Cancel</button>
                              </>
                            )}
                            {a.status === "Scheduled" && <a href={reminderLink(a)} target="_blank" rel="noreferrer" title="Send WhatsApp reminder" className="text-[#128C7E] text-xs font-medium">💬 Remind</a>}
                            <button onClick={() => openEdit(a)} className="text-brand-600 text-xs font-medium">✏️ Edit</button>
                            <button onClick={() => deleteAppointment(a.id)} className="text-red-400 text-xs font-medium">🗑️</button>
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
        </>)}
      </div>
    </div>
  );
}