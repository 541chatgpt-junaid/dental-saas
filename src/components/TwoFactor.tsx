"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Factor = { id: string; status: string };
const input = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

/** Turn two-factor sign-in (authenticator-app codes, provided by the sign-in service) on or off for the signed-in user. */
export default function TwoFactor() {
  const [factor, setFactor] = useState<Factor | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactor((data?.totp || []).find(f => f.status === "verified") || null);
    setLoaded(true);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const start = async () => {
    setBusy(true); setMsg(null);
    const db = createClient();
    // an earlier set-up that was never finished would block a new one
    const { data: list } = await db.auth.mfa.listFactors();
    for (const f of (list?.all || []).filter(f => f.status !== "verified")) await db.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: "DentEase" });
    setBusy(false);
    if (error || !data) { setMsg({ ok: false, text: "Could not start set-up. Please try again." }); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret }); setCode("");
  };
  const confirm = async () => {
    if (!enroll) return;
    setBusy(true); setMsg(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: "That code is not right. Try the next code your app shows." }); return; }
    setEnroll(null); setMsg({ ok: true, text: "Two-factor sign-in is on. You will be asked for a code each time you sign in." }); load();
  };
  const off = async () => {
    if (!factor || !confirm2("Turn off two-factor sign-in for your account?")) return;
    setBusy(true); setMsg(null);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: "Could not turn it off. Sign out and sign in again with your code, then retry." }); return; }
    setMsg({ ok: true, text: "Two-factor sign-in is off." }); load();
  };
  const confirm2 = (t: string) => window.confirm(t);

  return (
    <section className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-800">Two-factor sign-in {loaded && <span className={`ml-2 text-xs font-normal ${factor ? "text-green-700" : "text-brand-400"}`}>{factor ? "on" : "off"}</span>}</h3>
      <p className="mt-1 text-xs text-brand-400">After your password, sign-in asks for a 6-digit code from an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy and similar). The codes are provided by the same sign-in service that holds your password.</p>
      {!enroll && loaded && !factor && <button onClick={start} disabled={busy} className="mt-3 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">Set up two-factor sign-in</button>}
      {!enroll && factor && <button onClick={off} disabled={busy} className="mt-3 border border-red-200 text-red-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60">Turn off</button>}
      {enroll && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-brand-600">1. Scan this code with your authenticator app, or type the key into it.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code for your authenticator app" className="h-44 w-44 rounded-lg border border-brand-100 bg-white p-2" />
          <p className="break-all rounded-lg bg-brand-50 px-3 py-2 font-mono text-xs text-brand-700">Key: {enroll.secret}</p>
          <p className="text-xs text-brand-600">2. Type the 6-digit code the app shows now.</p>
          <div className="flex items-center gap-3">
            <input aria-label="6-digit code" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className={`${input} max-w-[10rem] text-center tracking-widest`} />
            <button onClick={confirm} disabled={busy || code.length !== 6} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">Turn on</button>
            <button onClick={() => setEnroll(null)} className="text-sm text-brand-500">Cancel</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className={`mt-3 text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
