"use client";
import { use, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordRules";

const field = "w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40";

export default function PortalJoin({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    const res = await fetch("/api/portal/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, email, password }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || json.error) { setError(json.error || "Could not create your account. Please try again."); setBusy(false); return; }
    // Sign straight in so the patient lands on their portal
    const { error: signErr } = await createClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (signErr) setDone(true); else window.location.assign("/portal");
  };

  return (
    <main className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.15)]">
        <header className="bg-navy px-6 py-6 text-white" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.12) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Patient portal</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Create your login</h1>
        </header>
        <div className="space-y-4 px-6 py-6">
          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15"><Check className="h-8 w-8 text-gold" /></span>
              <h2 className="mt-4 font-display text-2xl font-semibold text-navy">Account created</h2>
              <a href="/portal/login" className="mt-5 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy">Sign in</a>
            </div>
          ) : (
            <>
              <p className="text-sm text-navy/70">Choose an email address and a password. You will use them to see your own appointments and record.</p>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Email</span><input type="email" autoComplete="email" className={field} value={email} onChange={e => setEmail(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Password</span><input type="password" autoComplete="new-password" className={field} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} value={password} onChange={e => setPassword(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Confirm password</span><input type="password" autoComplete="new-password" className={field} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
              {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
              <button onClick={submit} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-navy disabled:opacity-60">
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? "Creating…" : "Create my login"}</button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
