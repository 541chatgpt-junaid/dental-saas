"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CircleX, LoaderCircle, Lock, ShieldCheck } from "lucide-react";

interface Info {
  clinic: { name: string; logo_url: string | null };
  invoice: { number: string | null; total: number; paid: number; due: number; currency: string; symbol: string; advance: boolean };
  providers: { id: string; label: string }[];
  attempt: { status: string; provider: string } | null;
}
type Checkout = { kind: "redirect"; url: string } | { kind: "form"; action: string; method: "POST"; fields: Record<string, string> };

const money = (symbol: string, n: number) => `${symbol} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function PayClient({ token }: { token: string }) {
  const q = useSearchParams();
  const ref = q.get("ref"), sessionId = q.get("session_id"), cancelled = q.get("cancelled"), failedFlag = q.get("failed");
  const [info, setInfo] = useState<Info | null>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<{ action: string; fields: Record<string, string> } | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams(); if (ref) qs.set("ref", ref); if (sessionId) qs.set("session_id", sessionId);
    const res = await fetch(`/api/pay/${encodeURIComponent(token)}?${qs}`, { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) { setGone(true); return null; }
    const d: Info = await res.json(); setInfo(d); return d;
  }, [token, ref, sessionId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the invoice
  useEffect(() => { load(); }, [load]);
  // A payment just came back from the provider: re-check for a short while until it is confirmed
  useEffect(() => {
    if (!ref || info?.attempt?.status !== "pending") return;
    const t = setTimeout(load, 2500);
    return () => clearTimeout(t);
  }, [ref, info, load]);
  useEffect(() => { if (form) formRef.current?.submit(); }, [form]);

  const pay = async (provider: string) => {
    setBusy(provider); setError("");
    const res = await fetch(`/api/pay/${encodeURIComponent(token)}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !json.checkout) { setError(json.error || "Could not start the payment. Please try again."); setBusy(null); return; }
    const c: Checkout = json.checkout;
    if (c.kind === "redirect") window.location.assign(c.url); else setForm({ action: c.action, fields: c.fields });
  };

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-md">{children}</div>
    </main>
  );

  if (gone) return shell(
    <div className="rounded-3xl bg-white p-8 text-center shadow-[0_20px_50px_rgba(15,29,61,.10)]">
      <CircleX className="mx-auto h-10 w-10 text-navy/40" aria-hidden="true" />
      <h1 className="mt-4 font-display text-2xl font-semibold text-navy">Link not available</h1>
      <p className="mt-2 text-sm text-navy/60">This payment link has expired, was cancelled, or the invoice is no longer open. Please contact the clinic.</p>
    </div>,
  );
  if (!info) return shell(<div className="flex items-center justify-center gap-2 py-24 text-sm text-navy/50"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading…</div>);

  const { invoice: inv } = info;
  const paidNow = info.attempt?.status === "paid";
  const settled = paidNow || inv.due <= 0;
  return shell(
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.15)]">
      <header className="bg-navy px-6 py-6 text-white" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.12) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}>
        <div className="flex items-center gap-3">
          {info.clinic.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.clinic.logo_url} alt="" className="h-12 w-12 rounded-xl bg-white object-contain p-1" />
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">{inv.advance ? "Advance booking fee" : "Pay invoice"}</p>
            <h1 className="truncate font-display text-2xl font-semibold">{info.clinic.name}</h1>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {settled ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15"><Check className="h-8 w-8 text-gold" /></span>
            <h2 className="mt-5 font-display text-2xl font-semibold text-navy">{paidNow ? "Payment received" : "Already paid"}</h2>
            <p className="mt-2 text-sm text-navy/65">{paidNow ? `Thank you. ${info.clinic.name} has received your payment${inv.number ? ` for ${inv.number}` : ""}.` : "Nothing is due on this invoice."}</p>
          </div>
        ) : (
          <>
            <dl className="space-y-2 text-sm">
              {inv.number && <div className="flex justify-between"><dt className="text-navy/55">Invoice</dt><dd className="font-semibold text-navy">{inv.number}</dd></div>}
              <div className="flex justify-between"><dt className="text-navy/55">Total</dt><dd className="text-navy">{money(inv.symbol, inv.total)}</dd></div>
              {inv.paid > 0 && <div className="flex justify-between"><dt className="text-navy/55">Already paid</dt><dd className="text-emerald-700">{money(inv.symbol, inv.paid)}</dd></div>}
              <div className="flex items-baseline justify-between border-t border-navy/10 pt-3"><dt className="font-semibold text-navy">Amount due</dt><dd className="font-display text-3xl font-semibold text-navy">{money(inv.symbol, inv.due)}</dd></div>
            </dl>

            {(failedFlag || cancelled || info.attempt?.status === "failed") && !info.attempt?.status?.includes("paid") && (
              <p role="status" className="mt-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-navy">
                {ref && info.attempt?.status === "pending" ? "We have not received confirmation of your payment yet." : "The payment was not completed. You can try again below."}
              </p>
            )}
            {ref && info.attempt?.status === "pending" && !failedFlag && !cancelled && (
              <p role="status" className="mt-5 flex items-center gap-2 rounded-xl bg-cream px-4 py-3 text-sm text-navy/70"><LoaderCircle className="h-4 w-4 animate-spin" /> Confirming your payment…</p>
            )}

            {info.providers.length === 0 ? (
              <p className="mt-6 text-sm text-navy/60">Online payment is not available for this clinic right now. Please contact the clinic.</p>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-navy/45">Pay with</p>
                {info.providers.map(p => (
                  <button key={p.id} onClick={() => pay(p.id)} disabled={!!busy}
                    className="flex w-full items-center justify-between rounded-xl border-2 border-navy/10 px-4 py-3.5 text-left text-sm font-semibold text-navy transition-colors hover:border-gold disabled:opacity-60">
                    {p.label}
                    {busy === p.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span className="text-xs font-medium text-navy/45">{money(inv.symbol, inv.due)}</span>}
                  </button>
                ))}
              </div>
            )}
            {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p>}
            <p className="mt-6 flex items-start gap-2 text-xs text-navy/50"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> You pay on the payment provider&apos;s own page. DentEase never sees or stores your card or wallet details.</p>
          </>
        )}
      </div>
      <footer className="flex items-center justify-center gap-1.5 border-t border-navy/10 bg-cream px-6 py-3 text-[11px] text-navy/50"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Secure payment link by DentEase</footer>

      {form && (
        <form ref={formRef} method="POST" action={form.action} className="hidden">
          {Object.entries(form.fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        </form>
      )}
    </div>,
  );
}
