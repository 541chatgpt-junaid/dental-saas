"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Template { id: string; title: string; body: string; active: boolean }
const input = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

export default function ConsentForms() {
  const [rows, setRows] = useState<Template[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient().from("consent_templates").select("id, title, body, active").order("created_at", { ascending: false });
    setRows((data as Template[]) || []);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const reset = () => { setEditId(null); setTitle(""); setBody(""); };
  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/consent-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId || undefined, title, body }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok || json.error) { setMsg({ ok: false, text: json.error || "Could not save. Please try again." }); return; }
    setMsg({ ok: true, text: "Saved." }); reset(); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this consent form? Consents already signed keep their own copy of the wording.")) return;
    await fetch(`/api/consent-templates?id=${id}`, { method: "DELETE" }).catch(() => null);
    load();
  };

  return (
    <div className="w-full md:max-w-2xl space-y-5">
      <section className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-brand-800">{editId ? "Edit consent form" : "New consent form"}</h3>
        <p className="mt-1 text-xs text-brand-400">You write the wording. DentEase does not supply legal text, so have it checked by whoever advises your clinic. Patients sign it on their phone and a copy of the exact wording is stored with each signature.</p>
        <div className="mt-3 space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Consent for treatment" className={input} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Wording the patient will read and sign</label><textarea rows={8} value={body} onChange={e => setBody(e.target.value)} className={input} /></div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          {editId && <button onClick={reset} className="text-sm text-brand-500">Cancel</button>}
          {msg && <span role="status" className={`text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>}
        </div>
      </section>
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
              <div className="min-w-0"><p className="text-sm font-semibold text-brand-800">{r.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-brand-500">{r.body}</p></div>
              <div className="flex shrink-0 gap-2">
                <button aria-label={`Edit ${r.title}`} onClick={() => { setEditId(r.id); setTitle(r.title); setBody(r.body); setMsg(null); }} className="text-brand-500 hover:text-brand-800"><Pencil className="h-4 w-4" /></button>
                <button aria-label={`Delete ${r.title}`} onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
