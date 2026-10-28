"use client";
import { use, useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

type Info = { clinic?: string; subscribed: boolean } | "missing" | null;

export default function StopMessages({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/messages/${encodeURIComponent(token)}`).then(async r => setInfo(r.ok ? await r.json() : "missing")).catch(() => setInfo("missing"));
  }, [token]);

  const stop = async () => {
    setBusy(true); setError("");
    const res = await fetch(`/api/messages/${encodeURIComponent(token)}`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (res?.ok) setDone(true); else setError("Could not save this. Please try again.");
  };

  return (
    <main className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.15)]">
        <header className="bg-navy px-6 py-6 text-white" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.12) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">{info && info !== "missing" && info.clinic ? info.clinic : "DentEase"}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold">Messages from your clinic</h1>
        </header>
        <div className="px-6 py-8 text-center">
          {info === null ? <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-navy/40" /> :
            info === "missing" ? <p className="text-sm text-navy/70">This link is not available.</p> :
            done || !info.subscribed ? (
              <div className="flex flex-col items-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15"><Check className="h-8 w-8 text-gold" /></span>
                <h2 className="mt-4 font-display text-xl font-semibold text-navy">You will not get these messages</h2>
                <p className="mt-2 text-sm text-navy/65">{info.clinic || "The clinic"} will not send you appointment reminders or review requests on WhatsApp. You can ask the clinic if you change your mind.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-navy/70">Stop appointment reminders and review requests from {info.clinic || "this clinic"}?</p>
                {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
                <button onClick={stop} disabled={busy} className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy disabled:opacity-60">
                  {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Stop these messages</button>
              </>
            )}
        </div>
      </div>
    </main>
  );
}
