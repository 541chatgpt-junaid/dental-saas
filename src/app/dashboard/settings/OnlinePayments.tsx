"use client";
import { useCallback, useEffect, useState } from "react";
import { CircleCheck, Copy, Lock } from "lucide-react";
import { PROVIDER_META, type ProviderId } from "@/lib/payments/types";

interface Described { provider: ProviderId; label: string; enabled: boolean; environment: "sandbox" | "live"; filled: Record<string, boolean>; shown: Record<string, string> }
const input = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

function ProviderCard({ d, onSaved }: { d: Described; onSaved: (p: Described[]) => void }) {
  const meta = PROVIDER_META[d.provider];
  const [enabled, setEnabled] = useState(d.enabled);
  const [environment, setEnvironment] = useState(d.environment);
  const [values, setValues] = useState<Record<string, string>>(d.shown);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const configured = Object.values(d.filled).some(Boolean);

  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/payment-providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: d.provider, enabled, environment, values }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || json.error) setMsg({ ok: false, text: json.error || "Could not save. Please try again." });
    else { setMsg({ ok: true, text: "Saved." }); setValues(v => Object.fromEntries(Object.entries(v).map(([k, val]) => [k, meta.fields.find(f => f.key === k)?.secret ? "" : val]))); onSaved(json.providers); }
    setBusy(false);
  };
  const remove = async () => {
    if (!confirm(`Remove the saved ${meta.label} details?`)) return;
    const res = await fetch(`/api/payment-providers?provider=${d.provider}`, { method: "DELETE" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) { onSaved(json.providers); setEnabled(false); setValues({}); } else setMsg({ ok: false, text: json.error || "Could not remove. Please try again." });
  };

  return (
    <section className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-brand-800">{meta.label}{meta.currencies ? <span className="ml-2 text-xs font-normal text-brand-400">{meta.currencies.join(", ")} only</span> : null}</h4>
        <label className="flex items-center gap-2 text-xs text-brand-600">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 accent-gold" /> Accept {meta.label}
        </label>
      </div>
      {meta.environments && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Environment</label>
          <select value={environment} onChange={e => setEnvironment(e.target.value as "sandbox" | "live")} className={input}>
            <option value="sandbox">Sandbox (test payments)</option>
            <option value="live">Live (real money)</option>
          </select>
        </div>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {meta.fields.map(f => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-gray-600">{f.label}</label>
            <input type={f.secret ? "password" : "text"} autoComplete="off" value={values[f.key] ?? ""} onChange={e => setValues({ ...values, [f.key]: e.target.value })}
              placeholder={f.secret && d.filled[f.key] ? "Saved. Leave blank to keep it" : f.hint || ""} className={input} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
        {configured && <button onClick={remove} className="text-xs font-medium text-red-500 hover:underline">Remove saved details</button>}
        {msg && <span role="status" className={`text-xs font-medium ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.ok && <CircleCheck className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />}{msg.text}</span>}
      </div>
    </section>
  );
}

export default function OnlinePayments() {
  const [state, setState] = useState<{ ready: boolean; providers: Described[]; urls: { stripeWebhook: string } } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/payment-providers", { cache: "no-store" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) setError(json.error || "Could not load payment settings."); else setState(json);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="text-sm text-brand-500">{error}</p>;
  if (!state) return <p className="text-sm text-brand-400">Loading…</p>;
  return (
    <div className="space-y-5 md:max-w-2xl">
      <div className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-600">
        <p><Lock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Connect your clinic&apos;s own merchant accounts. Patients pay on the provider&apos;s page and the money goes to <strong>your</strong> account, not through DentEase. Each confirmed payment is added to the invoice automatically. Your keys are stored encrypted and are never shown again.</p>
        {!state.ready && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Online payments are not switched on for this server yet: the server setting PAYMENT_SECRETS_KEY is missing, so keys cannot be saved safely. Ask whoever hosts DentEase to set it.</p>}
      </div>
      {state.providers.map(d => <ProviderCard key={d.provider} d={d} onSaved={p => setState(s => s && { ...s, providers: p })} />)}
      <div className="rounded-xl border border-brand-100 bg-white p-4 text-xs text-brand-600">
        <p className="mb-1 font-medium text-brand-800">Stripe webhook address</p>
        <p className="mb-2">In your Stripe dashboard, add a webhook to this address for the event <code>checkout.session.completed</code>, then paste its signing secret above.</p>
        <div className="flex items-center gap-2">
          <input readOnly value={state.urls.stripeWebhook} onFocus={e => e.target.select()} aria-label="Stripe webhook address" className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs" />
          <button onClick={async () => { try { await navigator.clipboard.writeText(state.urls.stripeWebhook); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select the box instead */ } }} className="rounded-lg border border-brand-200 px-3 py-2 font-medium text-brand-700 hover:border-gold"><Copy className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
    </div>
  );
}
