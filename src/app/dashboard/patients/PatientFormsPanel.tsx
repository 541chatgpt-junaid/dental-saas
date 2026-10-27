"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, FileSignature, MessageCircle, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/dateFormat";
import { waLink } from "@/lib/whatsapp";

interface FormRow { id: string; kind: "history" | "consent" | "portal"; created_at: string; expires_at: string; submitted_at: string | null; revoked: boolean }
interface Submission { id: string; submitted_at: string; flagged: { allergies?: string[]; conditions?: string[] } }
interface Consent { id: string; title: string; signer_name: string; signer_relation: string | null; signed_at: string; signature_png: string }
interface Template { id: string; title: string }

const KIND_LABEL = { history: "Medical history", consent: "Consent", portal: "Portal invitation" } as const;
const stamp = (iso: string) => `${formatDate(iso)}, ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

export default function PatientFormsPanel({ patientId, patientName, phone, clinicName, onHistoryChanged }: { patientId: number; patientName: string; phone: string | null; clinicName: string; onHistoryChanged: () => void }) {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ kind: FormRow["kind"]; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const db = createClient();
    const [f, s, c, t] = await Promise.all([
      db.from("patient_forms").select("id, kind, created_at, expires_at, submitted_at, revoked").eq("patient_id", patientId).order("created_at", { ascending: false }),
      db.from("patient_form_submissions").select("id, submitted_at, flagged").eq("patient_id", patientId).order("submitted_at", { ascending: false }),
      db.from("consent_records").select("id, title, signer_name, signer_relation, signed_at, signature_png").eq("patient_id", patientId).order("signed_at", { ascending: false }),
      db.from("consent_templates").select("id, title").eq("active", true).order("title"),
    ]);
    setForms((f.data as FormRow[]) || []); setSubs((s.data as Submission[]) || []); setConsents((c.data as Consent[]) || []);
    const tpl = (t.data as Template[]) || [];
    setTemplates(tpl); setTemplateId(cur => cur || tpl[0]?.id || "");
  }, [patientId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (subs.length) onHistoryChanged(); }, [subs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (kind: FormRow["kind"]) => {
    setBusy(kind); setError(""); setLink(null);
    const res = await fetch(kind === "portal" ? "/api/portal/invite" : "/api/forms/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, kind, templateId: kind === "consent" ? templateId : undefined }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy("");
    if (!res?.ok || json.error) { setError(json.error || "Could not create the link. Please try again."); return; }
    setLink({ kind, url: json.url }); setCopied(false); load();
  };
  const revoke = async (id: string) => {
    if (!confirm("Stop this link from working?")) return;
    await fetch(`/api/forms/links?id=${id}`, { method: "DELETE" }).catch(() => null);
    load();
  };
  const copy = async () => { if (link) { await navigator.clipboard?.writeText(link.url).catch(() => null); setCopied(true); } };
  const message = (kind: FormRow["kind"], url: string) =>
    `Hello ${patientName}, ${clinicName} sent you ${kind === "history" ? "a medical history form to fill in before your visit" : kind === "consent" ? "a consent form to read and sign" : "an invitation to your patient portal"}: ${url}`;

  const open = forms.filter(f => !f.submitted_at && !f.revoked && new Date(f.expires_at) > new Date());
  const btn = "rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-medium text-brand-700 hover:border-gold disabled:opacity-60";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <section aria-label="Send a form">
        <h3 className="text-sm font-semibold text-brand-800">Send to patient</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => send("history")} disabled={!!busy} className={btn}>Medical history form</button>
          <select aria-label="Consent form" value={templateId} onChange={e => setTemplateId(e.target.value)} className="rounded-lg border border-brand-200 px-2 py-2 text-xs">
            {templates.length === 0 && <option value="">No consent forms yet</option>}
            {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button onClick={() => send("consent")} disabled={!!busy || !templateId} className={btn}>Send consent</button>
          <button onClick={() => send("portal")} disabled={!!busy} className={btn}>Invite to portal</button>
        </div>
        {templates.length === 0 && <p className="mt-2 text-xs text-brand-400">Write your consent wording in Settings → Consent forms first.</p>}
        {error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>}
        {link && (
          <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs">
            <p className="font-semibold text-brand-800">{KIND_LABEL[link.kind]} link ready</p>
            <p className="mt-1 break-all text-brand-600">{link.url}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={copy} className={btn}><Copy className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{copied ? "Copied" : "Copy link"}</button>
              <a href={waLink(phone, message(link.kind, link.url))} target="_blank" rel="noreferrer" className={btn}><MessageCircle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />WhatsApp</a>
            </div>
          </div>
        )}
        {open.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs text-brand-600">
            {open.map(f => (
              <li key={f.id} className="flex items-center justify-between gap-2"><span>{KIND_LABEL[f.kind]} · waiting · expires {formatDate(f.expires_at)}</span>
                <button onClick={() => revoke(f.id)} className="text-red-600 hover:underline">Revoke</button></li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Submitted histories">
        <h3 className="text-sm font-semibold text-brand-800">Submitted by patient</h3>
        {subs.length === 0 ? <p className="mt-2 text-xs text-brand-400">No history form submitted yet.</p> : (
          <ul className="mt-2 space-y-2">
            {subs.map(s => {
              const a = s.flagged?.allergies || [], c = s.flagged?.conditions || [];
              return (
                <li key={s.id} className="rounded-lg border border-brand-200 p-3 text-sm">
                  <p className="text-xs text-brand-500">Submitted {stamp(s.submitted_at)}</p>
                  {a.length + c.length > 0 ? (
                    <p className="mt-1 text-red-800"><TriangleAlert className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
                      {a.length > 0 && <span><strong>Allergies:</strong> {a.join(", ")}{c.length > 0 ? " · " : ""}</span>}
                      {c.length > 0 && <span><strong>Conditions:</strong> {c.join(", ")}</span>}
                    </p>
                  ) : <p className="mt-1 text-xs text-brand-500">Nothing flagged.</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Signed consents">
        <h3 className="text-sm font-semibold text-brand-800">Signed consents</h3>
        {consents.length === 0 ? <p className="mt-2 text-xs text-brand-400">No consent signed yet.</p> : (
          <ul className="mt-2 space-y-2">
            {consents.map(c => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 p-3 text-sm">
                <span><FileSignature className="mr-1 inline h-4 w-4 text-gold align-[-3px]" aria-hidden="true" /><strong>{c.title}</strong><br />
                  <span className="text-xs text-brand-500">Signed by {c.signer_name}{c.signer_relation ? ` (${c.signer_relation})` : ""} · {stamp(c.signed_at)}</span></span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.signature_png} alt={`Signature of ${c.signer_name}`} className="h-10 w-24 shrink-0 rounded border border-brand-100 bg-white object-contain" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
