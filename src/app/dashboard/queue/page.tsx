"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ListOrdered, MessageCircle, Monitor, Plus, SkipForward, Undo2, UserRoundCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import EmptyState from "@/components/EmptyState";
import { useClinic } from "@/lib/ClinicContext";
import { waLink } from "@/lib/whatsapp";
import { localToday, type QueueStatus, type Token } from "@/lib/queue";

interface Patient { id: number; name: string; phone: string | null }

const STATUS_CLS: Record<QueueStatus, string> = {
  waiting: "bg-gold/15 text-[#8a6d12]",
  in_chair: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  skipped: "bg-gray-100 text-gray-600",
};
const STATUS_LABEL: Record<QueueStatus, string> = { waiting: "Waiting", in_chair: "In chair", done: "Done", skipped: "Skipped" };
const minsSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export default function QueuePage() {
  const router = useRouter();
  const { clinicId, clinicName } = useClinic();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorFilter, setDoctorFilter] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", doctor_name: "", reason: "" });
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const { data, error: e } = await createClient().from("queue_tokens").select("*")
      .eq("token_date", localToday()).order("token_no", { ascending: true });
    if (e) setError("Could not load the queue. Has supabase_clinic_tools.sql been run?");
    else { setError(""); setTokens(data as Token[]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => { if (!user) router.push("/"); });
    supabase.from("patients").select("id, name, phone").order("name").then(({ data }) => data && setPatients(data as Patient[]));
    supabase.from("doctors").select("name").eq("status", "Active").then(({ data }) => data && setDoctors(data.map(d => d.name as string)));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
    // Keep in sync with other devices (reception, doctor's room) and refresh wait times
    const poll = setInterval(() => { load(); setTick(t => t + 1); }, 10000);
    return () => clearInterval(poll);
  }, [load, router]);

  const addToken = async () => {
    const name = form.name.trim();
    if (!name) { setError("Enter the patient's name."); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const known = patients.find(p => p.name.trim().toLowerCase() === name.toLowerCase());
    const { data: todays } = await supabase.from("queue_tokens").select("token_no").eq("token_date", localToday());
    const token_no = Math.max(0, ...(todays || []).map(t => Number(t.token_no) || 0)) + 1;
    const { error: e } = await supabase.from("queue_tokens").insert([{
      clinic_id: clinicId, token_date: localToday(), token_no,
      patient_id: known?.id ?? null, patient_name: known?.name ?? name,
      phone: form.phone.trim() || known?.phone || null,
      doctor_name: form.doctor_name || null, reason: form.reason.trim() || null, status: "waiting",
    }]);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setForm({ name: "", phone: "", doctor_name: form.doctor_name, reason: "" });
    load();
  };

  const setStatus = async (t: Token, status: QueueStatus) => {
    const patch: Partial<Token> = { status };
    if (status === "in_chair") patch.called_at = new Date().toISOString();
    setTokens(list => list.map(x => (x.id === t.id ? { ...x, ...patch } : x)));
    await createClient().from("queue_tokens").update(patch).eq("id", t.id);
  };

  const waiting = useMemo(() => tokens.filter(t => t.status === "waiting" && (!doctorFilter || !t.doctor_name || t.doctor_name === doctorFilter)), [tokens, doctorFilter]);
  const inChair = tokens.filter(t => t.status === "in_chair");

  /** Finish whoever is in this doctor's chair and call the next waiting token */
  const callNext = async () => {
    const next = waiting[0];
    if (!next) return;
    const doctor = doctorFilter || next.doctor_name || "";
    const current = inChair.filter(t => (t.doctor_name || "") === doctor);
    for (const c of current) await setStatus(c, "done");
    await setStatus(next, "in_chair");
  };

  const called = tokens.filter(t => t.called_at);
  const avgWait = called.length ? Math.round(called.reduce((s, t) => s + (new Date(t.called_at!).getTime() - new Date(t.created_at).getTime()) / 60000, 0) / called.length) : 0;
  const knownMatch = patients.find(p => p.name.trim().toLowerCase() === form.name.trim().toLowerCase());
  const inputCls = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800 tracking-tight">Walk-in Queue</h2>
            <p className="text-sm text-brand-500 mt-1">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · tokens restart every day</p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/queue/display" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:border-gold">
              <Monitor className="h-4 w-4" /> Display screen <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "Close" : "New token"}
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[["Waiting", tokens.filter(t => t.status === "waiting").length], ["In chair", inChair.length], ["Seen today", tokens.filter(t => t.status === "done").length], ["Avg. wait", `${avgWait} min`]].map(([l, v]) => (
            <div key={l as string} className="card-hover bg-white rounded-xl p-3 md:p-5 border border-brand-100">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">{l}</p>
              <p className="text-2xl md:text-3xl font-bold text-brand-800">{v}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">Issue a token</h3>
            <datalist id="queue-patients">{patients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Patient name *</span>
                <input list="queue-patients" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addToken()} placeholder="Type or pick a patient" className={inputCls} />
                {knownMatch && <span className="mt-1 block text-[11px] text-green-600">Existing patient{knownMatch.phone ? ` · ${knownMatch.phone}` : ""}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Phone</span>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={knownMatch?.phone || "Optional"} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Doctor</span>
                <select value={form.doctor_name} onChange={e => setForm({ ...form, doctor_name: e.target.value })} className={inputCls}>
                  <option value="">Any doctor</option>
                  {doctors.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Reason</span>
                <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} onKeyDown={e => e.key === "Enter" && addToken()} placeholder="e.g. Toothache" className={inputCls} />
              </label>
            </div>
            <button onClick={addToken} disabled={saving} className="mt-4 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {saving ? "Issuing…" : "Issue token"}
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)} aria-label="Doctor"
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-700 focus:outline-none focus:ring-2 focus:ring-gold/50">
            <option value="">All doctors</option>
            {doctors.map(d => <option key={d} value={d}>Dr. {d}</option>)}
          </select>
          <button onClick={callNext} disabled={!waiting.length}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-navy hover:brightness-95 disabled:opacity-40">
            <UserRoundCheck className="h-4 w-4" /> Call next{waiting[0] ? ` (#${waiting[0].token_no})` : ""}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
          {loading ? (
            <p className="py-16 text-center text-sm text-brand-400">Loading queue…</p>
          ) : tokens.length === 0 ? (
            <EmptyState icon={ListOrdered} title="No tokens yet today" hint="Issue a token when a walk-in patient arrives. Numbers start from 1 every day." />
          ) : (
            <ul className="divide-y divide-brand-100">
              {[...tokens].sort((a, b) => ({ in_chair: 0, waiting: 1, done: 2, skipped: 3 }[a.status] - { in_chair: 0, waiting: 1, done: 2, skipped: 3 }[b.status]) || a.token_no - b.token_no).map(t => (
                <li key={t.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 p-4 ${t.status === "in_chair" ? "bg-blue-50/60" : ""} ${t.status === "done" || t.status === "skipped" ? "opacity-60" : ""}`}>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-xl font-bold ${t.status === "in_chair" ? "bg-gold text-navy" : "bg-brand-50 text-brand-800 ring-1 ring-brand-100"}`}>{t.token_no}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-brand-800">{t.patient_name}</p>
                    <p className="text-xs text-brand-500">
                      {t.doctor_name ? `Dr. ${t.doctor_name}` : "Any doctor"}{t.reason ? ` · ${t.reason}` : ""}{t.phone ? ` · ${t.phone}` : ""}
                      {t.status === "waiting" && ` · waiting ${minsSince(t.created_at)} min`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                  <div className="flex flex-wrap gap-2">
                    {t.status === "waiting" && (
                      <>
                        <button onClick={() => setStatus(t, "in_chair")} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"><UserRoundCheck className="h-3.5 w-3.5" /> Call</button>
                        {t.phone && (
                          <a href={waLink(t.phone, `Assalam o Alaikum ${t.patient_name}, your token number ${t.token_no} at ${clinicName || "the clinic"} will be called soon. Please be at the reception.`)}
                            target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"><MessageCircle className="h-3.5 w-3.5" /> Notify</a>
                        )}
                        <button onClick={() => setStatus(t, "skipped")} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold"><SkipForward className="h-3.5 w-3.5" /> Skip</button>
                      </>
                    )}
                    {t.status === "in_chair" && (
                      <button onClick={() => setStatus(t, "done")} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"><Check className="h-3.5 w-3.5" /> Done</button>
                    )}
                    {t.status !== "waiting" && (
                      <button onClick={() => setStatus(t, "waiting")} title="Put back in the waiting list" className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold"><Undo2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
