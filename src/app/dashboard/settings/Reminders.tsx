"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/dateFormat";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/reminders/schedule";

interface Wa { connected: boolean; enabled: boolean; phoneNumberId: string }
interface Row { id: string; kind: string; status: string; reason: string | null; due_at: string; sent_at: string | null; sent_via: string | null; patients: { name: string } | null }
const input = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";
const card = "bg-white rounded-xl border border-brand-200 p-5 shadow-sm";
const ZONES = ["Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "Europe/Paris", "America/New_York", "America/Toronto", "Australia/Sydney"];
const KIND: Record<string, string> = { reminder_day_before: "Day-before reminder", reminder_same_day: "Same-day reminder", noshow_followup: "No-show follow-up", review_request: "Review request", recall_followup: "Recall message" };
const REASON: Record<string, string> = {
  no_consent: "no contact consent on record", no_phone: "no phone number", rescheduled: "appointment was moved", not_scheduled: "appointment no longer scheduled", too_late: "too close to the appointment",
  superseded: "replaced by the same-day reminder", not_a_no_show: "patient came or booking changed", not_completed: "visit not completed", no_review_link: "no Google review link set",
  asked_recently: "asked for a review recently", opted_out: "patient opted out", record_removed: "record removed",
};
const stamp = (iso: string) => `${formatDate(iso)} ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

export default function Reminders() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [owner, setOwner] = useState(false);
  const [wa, setWa] = useState<Wa | null>(null);
  const [waForm, setWaForm] = useState({ phoneNumberId: "", token: "", enabled: true });
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [waMsg, setWaMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/reminders/settings").catch(() => null);
    const j = res ? await res.json().catch(() => null) : null;
    if (j?.settings) { setS({ ...DEFAULT_SETTINGS, ...j.settings }); setOwner(!!j.owner); setWa(j.whatsapp); if (j.whatsapp) setWaForm(f => ({ ...f, phoneNumberId: j.whatsapp.phoneNumberId, enabled: j.whatsapp.connected ? j.whatsapp.enabled : true })); }
    const { data } = await createClient().from("message_outbox").select("id, kind, status, reason, due_at, sent_at, sent_via, patients(name)").order("created_at", { ascending: false }).limit(40);
    setRows((data as unknown as Row[]) || []);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); setOrigin(window.location.origin); }, [load]);

  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/reminders/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    setMsg(res?.ok && !j.error ? { ok: true, text: "Saved." } : { ok: false, text: j.error || "Could not save. Please try again." });
  };
  const saveWa = async () => {
    setWaMsg(null);
    const res = await fetch("/api/reminders/whatsapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(waForm) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && !j.error) { setWa(j.whatsapp); setWaForm(f => ({ ...f, token: "" })); setWaMsg({ ok: true, text: "Saved." }); } else setWaMsg({ ok: false, text: j.error || "Could not save." });
  };
  const disconnect = async () => {
    if (!confirm("Disconnect WhatsApp? Messages will wait in the queue for a one-tap send.")) return;
    const res = await fetch("/api/reminders/whatsapp", { method: "DELETE" }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) { setWa(j.whatsapp); setWaForm({ phoneNumberId: "", token: "", enabled: true }); }
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(p => ({ ...p, [k]: v }));
  const toggle = (label: string, k: keyof Settings, hint?: string) => (
    <label className="flex items-start gap-2 text-sm text-brand-700"><input type="checkbox" disabled={!owner} checked={!!s[k]} onChange={e => set(k, e.target.checked as never)} className="mt-0.5 h-4 w-4 accent-gold" /><span>{label}{hint && <span className="block text-xs text-brand-400">{hint}</span>}</span></label>
  );
  const num = (k: "same_day_hours" | "noshow_delay_hours" | "review_delay_hours", label: string, max: number) => (
    <label className="inline-flex items-center gap-2 text-sm text-brand-700">{label}<input type="number" min={1} max={max} disabled={!owner} value={s[k]} onChange={e => set(k, Number(e.target.value))} className="w-16 border border-brand-200 rounded-lg px-2 py-1 text-sm" /> hours</label>
  );

  return (
    <div className="w-full md:max-w-2xl space-y-5">
      <section className={card}>
        <h3 className="text-sm font-semibold text-brand-800">Automatic messages</h3>
        <p className="mt-1 text-xs text-brand-400">Sent only to patients who agreed to be messaged (tick &quot;Allow WhatsApp messages&quot; on the patient record, or the box on your booking page). Nobody without that agreement is ever messaged.</p>
        <div className="mt-4 space-y-4">
          {toggle("Switch automatic messages on", "enabled")}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Clinic time zone</label>
              <select disabled={!owner} value={s.timezone} onChange={e => set("timezone", e.target.value)} className={input}>{[...new Set([s.timezone, ...ZONES])].map(z => <option key={z}>{z}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Google review link</label>
              <input disabled={!owner} value={s.google_review_url ?? ""} onChange={e => set("google_review_url", e.target.value)} placeholder="https://g.page/r/…/review" className={input} /></div>
          </div>
          <div className="space-y-3 border-t border-brand-100 pt-4">
            {toggle("Day-before reminder", "day_before_on")}
            <label className="ml-6 inline-flex items-center gap-2 text-sm text-brand-700">sent at <input type="time" disabled={!owner} value={s.day_before_time} onChange={e => set("day_before_time", e.target.value)} className="border border-brand-200 rounded-lg px-2 py-1 text-sm" /> the evening before</label>
            {toggle("Same-day reminder", "same_day_on")}
            <div className="ml-6">{num("same_day_hours", "sent", 12)} before the appointment</div>
          </div>
          <div className="space-y-3 border-t border-brand-100 pt-4">
            {toggle("No-show follow-up (offers a new time; never a review request)", "noshow_on")}
            <div className="ml-6">{num("noshow_delay_hours", "sent", 72)} after the missed appointment</div>
            {toggle("Review request after a completed visit (never to a no-show)", "review_on", "Needs the Google review link above.")}
            <div className="ml-6">{num("review_delay_hours", "sent", 72)} after the visit</div>
          </div>
        </div>
        {owner && <div className="mt-5 flex items-center gap-3"><button onClick={save} disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          {msg && <span role="status" className={`text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>}</div>}
        {!owner && <p className="mt-4 text-xs text-brand-400">Only the clinic owner can change these.</p>}
      </section>

      {owner && (
        <section className={card}>
          <h3 className="text-sm font-semibold text-brand-800">WhatsApp sending {wa?.connected && <span className="ml-2 text-xs font-normal text-green-700">{wa.enabled ? "connected" : "saved, switched off"}</span>}</h3>
          <p className="mt-1 text-xs text-brand-400">Messages go out from your own WhatsApp Business number (Cloud API), so the sender is your clinic. Without a connection, each message waits in the queue on the Appointments page for you to send with one tap.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Phone number ID</label><input value={waForm.phoneNumberId} onChange={e => setWaForm({ ...waForm, phoneNumberId: e.target.value })} autoComplete="off" className={input} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Access token</label><input type="password" value={waForm.token} onChange={e => setWaForm({ ...waForm, token: e.target.value })} autoComplete="off" placeholder={wa?.connected ? "Saved. Leave blank to keep it" : ""} className={input} /></div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Reminder template</label><input value={s.tpl_reminder ?? ""} onChange={e => set("tpl_reminder", e.target.value)} placeholder="optional" className={input} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600">No-show template</label><input value={s.tpl_noshow ?? ""} onChange={e => set("tpl_noshow", e.target.value)} placeholder="optional" className={input} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Review template</label><input value={s.tpl_review ?? ""} onChange={e => set("tpl_review", e.target.value)} placeholder="optional" className={input} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Template language</label><input value={s.tpl_lang} onChange={e => set("tpl_lang", e.target.value)} className={input} /></div>
          </div>
          <p className="mt-2 text-xs text-brand-400">WhatsApp only lets a business message first with an approved template. Placeholders: reminder {"{{1}} name, {{2}} clinic, {{3}} date, {{4}} time, {{5}} stop link"}; no-show {"{{1}} name, {{2}} clinic, {{3}} rebooking link or phone, {{4}} stop link"}; review {"{{1}} name, {{2}} clinic, {{3}} review link, {{4}} stop link"}. Save the template names above with the settings.</p>
          <label className="mt-3 flex items-center gap-2 text-sm text-brand-700"><input type="checkbox" checked={waForm.enabled} onChange={e => setWaForm({ ...waForm, enabled: e.target.checked })} className="h-4 w-4 accent-gold" />Send through WhatsApp automatically</label>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={saveWa} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium">Save connection</button>
            {wa?.connected && <button onClick={disconnect} className="text-sm text-red-600 hover:underline">Disconnect</button>}
            {waMsg && <span role="status" className={`text-xs font-medium ${waMsg.ok ? "text-green-700" : "text-red-600"}`}>{waMsg.text}</span>}
          </div>
        </section>
      )}

      {owner && (
        <section className={card}>
          <h3 className="text-sm font-semibold text-brand-800">Scheduler</h3>
          <p className="mt-1 text-xs text-brand-400">Messages go out when this address is called, so set a job to call it every 15 minutes (any cron service, GitHub Actions, or Vercel Cron on a plan that allows it). Set <code>CRON_SECRET</code> on the server and send it as <code>Authorization: Bearer &lt;secret&gt;</code>. Each message is sent once, however often it is called.</p>
          <p className="mt-2 break-all rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">{origin}/api/cron/messages</p>
        </section>
      )}

      <section className={card}>
        <h3 className="text-sm font-semibold text-brand-800">Recent messages</h3>
        {rows.length === 0 ? <p className="mt-2 text-xs text-brand-400">Nothing yet.</p> : (
          <ul className="mt-2 divide-y divide-brand-100 text-xs text-brand-700">{rows.map(r => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><strong>{r.patients?.name || "Patient"}</strong> · {KIND[r.kind] || r.kind}</span>
              <span className="text-brand-500">{r.status === "sent" ? `Sent ${stamp(r.sent_at || r.due_at)}${r.sent_via === "manual" ? " (by hand)" : ""}` : r.status === "skipped" ? `Not sent: ${REASON[r.reason || ""] || r.reason}` : r.status === "ready" ? "Ready to send" : r.status === "failed" ? `Failed: ${r.reason}` : `Due ${stamp(r.due_at)}`}</span>
            </li>))}</ul>)}
      </section>
    </div>
  );
}
