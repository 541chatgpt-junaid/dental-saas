"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/dateFormat";
import { useRouter } from "next/navigation";
import { BellRing, CalendarCheck, Check, MessageCircle, Plus, RotateCw, Sparkles, Trash2, X } from "lucide-react";
import AiDraftModal from "@/components/AiDraftModal";
import { useAiStatus } from "@/lib/useAi";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import EmptyState from "@/components/EmptyState";
import { useClinic } from "@/lib/ClinicContext";
import { waLink } from "@/lib/whatsapp";
import { saveErrorMessage } from "@/lib/formSave";

type Status = "pending" | "contacted" | "booked" | "done" | "cancelled";
interface Recall {
  id: string; patient_id: number | null; patient_name: string; phone: string | null;
  reason: string; due_date: string; status: Status; notes: string | null; created_at: string;
}
interface Patient { id: number; name: string; phone: string | null }

const REASONS = [
  "6-month check-up", "Scaling & polishing", "Filling review", "Root canal follow-up",
  "Crown / bridge review", "Orthodontic adjustment", "Implant review", "Denture check",
];

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-gold/15 text-[#8a6d12]",
  contacted: "bg-blue-100 text-blue-700",
  booked: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};
const daysFromToday = (iso: string) =>
  Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayISO()}T00:00:00`).getTime()) / 86400000);
const fmtDate = (iso: string) => formatDate(iso, { weekday: true });

function dueLabel(iso: string) {
  const d = daysFromToday(iso);
  if (d === 0) return { text: "Due today", cls: "text-orange-600" };
  if (d < 0) return { text: `${-d} day${d === -1 ? "" : "s"} overdue`, cls: "text-red-600" };
  if (d <= 7) return { text: `In ${d} day${d === 1 ? "" : "s"}`, cls: "text-orange-600" };
  return { text: `In ${d} days`, cls: "text-brand-500" };
}

type Tab = "due" | "upcoming" | "closed";

export default function Recalls() {
  const router = useRouter();
  const { clinicId, clinicName } = useClinic();
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("due");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id: "", reason: REASONS[0], due_date: addMonths(todayISO(), 6), notes: "" });

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data, error: e }, { data: pts }] = await Promise.all([
      supabase.from("recalls").select("*").order("due_date", { ascending: true }),
      supabase.from("patients").select("id, name, phone").order("name"),
    ]);
    if (e) setError("Could not load recalls. Has supabase_clinic_features.sql been run?");
    else { setError(""); setRecalls(data as Recall[]); }
    if (pts) setPatients(pts as Patient[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => { if (!user) router.push("/"); });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load, router]);

  const addRecall = async () => {
    const patient = patients.find(p => String(p.id) === form.patient_id);
    if (!patient) { setError("Please select a patient."); return; }
    if (!form.reason.trim() || !form.due_date) { setError("Please choose a reason and due date."); return; }
    setSaving(true);
    const { error: e } = await createClient().from("recalls").insert([{
      clinic_id: clinicId, patient_id: patient.id, patient_name: patient.name, phone: patient.phone,
      reason: form.reason.trim(), due_date: form.due_date, notes: form.notes.trim() || null,
    }]);
    setSaving(false);
    if (e) { setError(saveErrorMessage(e, "recall")); return; }
    setShowForm(false);
    setForm({ patient_id: "", reason: REASONS[0], due_date: addMonths(todayISO(), 6), notes: "" });
    load();
  };

  const setStatus = async (r: Recall, status: Status) => {
    setRecalls(list => list.map(x => (x.id === r.id ? { ...x, status } : x)));
    const { error: e } = await createClient().from("recalls").update({ status }).eq("id", r.id);
    // The list changed optimistically: on failure say so and reload the real state
    if (e) { setError(saveErrorMessage(e, "recall status")); load(); }
  };

  /** Mark done and schedule the same recall again in 6 months */
  const doneAndRepeat = async (r: Recall) => {
    const supabase = createClient();
    let { error: e } = await supabase.from("recalls").update({ status: "done" }).eq("id", r.id);
    if (!e) ({ error: e } = await supabase.from("recalls").insert([{
      clinic_id: clinicId, patient_id: r.patient_id, patient_name: r.patient_name, phone: r.phone,
      reason: r.reason, due_date: addMonths(todayISO(), 6), notes: r.notes,
    }]));
    if (e) setError(saveErrorMessage(e, "next recall"));
    load();
  };

  const remove = async (r: Recall) => {
    if (!confirm(`Delete the recall for ${r.patient_name}?`)) return;
    setRecalls(list => list.filter(x => x.id !== r.id));
    const { error: e } = await createClient().from("recalls").delete().eq("id", r.id);
    if (e) { setError(saveErrorMessage(e, "recall").replace("save", "delete")); load(); }
  };

  const ai = useAiStatus();
  const [aiFor, setAiFor] = useState<Recall | null>(null);

  const message = (r: Recall) =>
    `Assalam o Alaikum ${r.patient_name}, this is a friendly reminder from ${clinicName || "your dental clinic"} that your ${r.reason.toLowerCase()} is due${daysFromToday(r.due_date) < 0 ? "" : ` on ${fmtDate(r.due_date)}`}. Please reply to book a convenient time. Thank you!`;

  const open = recalls.filter(r => r.status === "pending" || r.status === "contacted");
  const groups = useMemo(() => ({
    due: open.filter(r => daysFromToday(r.due_date) <= 14),
    upcoming: open.filter(r => daysFromToday(r.due_date) > 14),
    closed: recalls.filter(r => r.status === "booked" || r.status === "done" || r.status === "cancelled").reverse(),
  }), [recalls]); // eslint-disable-line react-hooks/exhaustive-deps
  const overdue = open.filter(r => daysFromToday(r.due_date) < 0).length;
  const shown = groups[tab];
  const inputCls = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      {aiFor && <AiDraftModal tool="recall" refId={aiFor.id} title={`Recall message for ${aiFor.patient_name}`} onClose={() => setAiFor(null)} onSent={() => { if (aiFor.status === "pending") setStatus(aiFor, "contacted"); }} />}
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800 tracking-tight">Recalls</h2>
            <p className="text-sm text-brand-500 mt-1">Bring patients back for check-ups and follow-ups</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "Close" : "New Recall"}
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="stagger grid grid-cols-3 gap-3 md:gap-4 mb-6">
          {[["Overdue", overdue, "text-red-600"], ["Due in 2 weeks", groups.due.length - overdue, "text-orange-600"], ["Upcoming", groups.upcoming.length, "text-brand-800"]].map(([label, n, cls]) => (
            <div key={label as string} className="card-hover bg-white rounded-xl p-3 md:p-5 border border-brand-100">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">{label as string}</p>
              <p className={`text-2xl md:text-3xl font-bold ${cls}`}>{n as number}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">New Recall</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Patient *</span>
                <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className={inputCls}>
                  <option value="">Select patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Reason *</span>
                <input list="recall-reasons" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className={inputCls} />
                <datalist id="recall-reasons">{REASONS.map(r => <option key={r} value={r} />)}</datalist>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Due date *</span>
                <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 3, 6, 12].map(m => (
                <button key={m} type="button" onClick={() => setForm({ ...form, due_date: addMonths(todayISO(), m) })}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${form.due_date === addMonths(todayISO(), m) ? "bg-brand-700 text-white" : "border border-brand-200 text-brand-700 hover:border-gold"}`}>
                  In {m} month{m > 1 ? "s" : ""}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-brand-600">Notes</span>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" className={inputCls} />
            </label>
            <div className="mt-4 flex gap-3">
              <button onClick={addRecall} disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? "Saving…" : "Save recall"}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2" role="tablist">
          {([["due", `Due now (${groups.due.length})`], ["upcoming", `Upcoming (${groups.upcoming.length})`], ["closed", "Booked & done"]] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? "bg-brand-700 text-white" : "border border-brand-200 bg-white text-brand-700 hover:border-gold"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
          {loading ? (
            <p className="py-16 text-center text-sm text-brand-400">Loading recalls…</p>
          ) : shown.length === 0 ? (
            <EmptyState icon={BellRing}
              title={tab === "due" ? "Nobody is due right now" : tab === "upcoming" ? "No upcoming recalls" : "Nothing here yet"}
              hint={tab === "closed" ? "Recalls you mark as booked or done appear here." : "Add a recall when you finish treatment, e.g. a 6-month check-up."} />
          ) : (
            <ul className="divide-y divide-brand-100">
              {shown.map(r => {
                const due = dueLabel(r.due_date);
                const isOpen = r.status === "pending" || r.status === "contacted";
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:bg-brand-50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-brand-800">{r.patient_name}</p>
                      <p className="text-xs text-brand-500">{r.reason}{r.phone ? ` · ${r.phone}` : ""}{r.notes ? ` · ${r.notes}` : ""}</p>
                    </div>
                    <div className="w-40 text-sm">
                      <p className="text-brand-800">{fmtDate(r.due_date)}</p>
                      {isOpen && <p className={`text-xs font-medium ${due.cls}`}>{due.text}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                    <div className="flex flex-wrap gap-2">
                      {isOpen && (
                        <>
                          <a href={waLink(r.phone, message(r))} target="_blank" rel="noreferrer" onClick={() => r.status === "pending" && setStatus(r, "contacted")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                          {ai?.ready && r.patient_id && (
                            <button onClick={() => setAiFor(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs font-medium text-[#8a6d12] hover:bg-gold/20">
                              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI draft
                            </button>
                          )}
                          <button onClick={() => setStatus(r, "booked")} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                            <CalendarCheck className="h-3.5 w-3.5" /> Booked
                          </button>
                        </>
                      )}
                      {r.status !== "done" && r.status !== "cancelled" && (
                        <>
                          <button onClick={() => setStatus(r, "done")} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                            <Check className="h-3.5 w-3.5" /> Done
                          </button>
                          <button onClick={() => doneAndRepeat(r)} title="Mark done and recall again in 6 months"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                            <RotateCw className="h-3.5 w-3.5" /> Done + 6 mo
                          </button>
                        </>
                      )}
                      <button onClick={() => remove(r)} aria-label="Delete recall" className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
