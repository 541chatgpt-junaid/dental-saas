"use client";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

const field = "w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40";

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setBusy(true);
    const { error: err } = await createClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (err) { setError("Wrong email or password."); return; }
    window.location.assign("/portal");
  };

  return (
    <main className="min-h-screen bg-cream px-4 py-10">
      <form onSubmit={submit} className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.15)]">
        <header className="bg-navy px-6 py-6 text-white" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.12) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Patient portal</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Sign in</h1>
        </header>
        <div className="space-y-4 px-6 py-6">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Email</span><input id="pt-email" type="email" autoComplete="email" className={field} value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Password</span><input id="pt-password" type="password" autoComplete="current-password" className={field} value={password} onChange={e => setPassword(e.target.value)} /></label>
          {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-navy disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? "Signing in…" : "Sign in"}</button>
          <p className="text-xs text-navy/50">Your clinic gives you a link to create this login. Clinic staff sign in on the main sign-in page.</p>
        </div>
      </form>
    </main>
  );
}
