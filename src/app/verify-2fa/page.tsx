"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";

/** Second step of sign-in for a user who turned on two-factor login: the 6-digit code from their authenticator app. */
export default function Verify2FA() {
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) { window.location.replace("/login"); return; }
      const { data } = await db.auth.mfa.listFactors();
      const f = data?.totp?.[0];
      if (!f) { window.location.replace("/dashboard/patients"); return; }
      setFactorId(f.id); setReady(true);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setBusy(true);
    const { error: err } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (err) { setError("That code is not right. Check the code in your authenticator app and try again."); setCode(""); return; }
    window.location.assign("/dashboard/patients");
  };
  const signOut = async () => { await createClient().auth.signOut(); window.location.assign("/login"); };

  return (
    <main className="min-h-screen bg-cream px-4 py-10">
      <form onSubmit={submit} className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.15)]">
        <header className="bg-navy px-6 py-6 text-white" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.12) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Two-factor sign-in</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Enter your code</h1>
        </header>
        <div className="space-y-4 px-6 py-6">
          <p className="flex items-start gap-2 text-sm text-navy/70"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />Open your authenticator app and type the 6-digit code for DentEase.</p>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">6-digit code</span>
            <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} disabled={!ready}
              className="w-full rounded-xl border border-navy/15 bg-white px-3 py-3 text-center text-2xl tracking-[0.4em] text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40" /></label>
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
          <button type="submit" disabled={busy || !ready || code.length !== 6} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-navy disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? "Checking…" : "Verify and continue"}</button>
          <button type="button" onClick={signOut} className="w-full text-center text-xs text-navy/50 hover:text-gold">Sign out</button>
          <p className="text-xs text-navy/45">Lost your phone? Ask your clinic owner to reset two-factor sign-in for your account.</p>
        </div>
      </form>
    </main>
  );
}
