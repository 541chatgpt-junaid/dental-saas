"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleX, Eraser, LoaderCircle, Lock } from "lucide-react";
import { BLOOD_GROUPS, COMMON_ALLERGIES, COMMON_CONDITIONS, EMPTY_ANSWERS, type HistoryAnswers } from "@/lib/forms/history";

interface Info { kind: "history" | "consent"; submitted: boolean; clinic: { name: string; logo_url: string | null }; firstName: string; template: { title: string; body: string } | null }

const field = "w-full rounded-xl border border-navy/15 bg-white px-3 py-2.5 text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40";
const RELATIONS = ["Myself", "Parent", "Legal guardian", "Other"];

/** A box the patient signs in with a finger or mouse; exports a PNG */
function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);

  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) * (ref.current!.width / r.width), y: (e.clientY - r.top) * (ref.current!.height / r.height) }; };
  const start = (e: React.PointerEvent) => {
    const c = ref.current!, g = c.getContext("2d")!; c.setPointerCapture(e.pointerId); drawing.current = true;
    g.lineWidth = 2.5; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#0f1d3d"; const p = pos(e); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 0.01, p.y + 0.01); g.stroke();
  };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const g = ref.current!.getContext("2d")!; const p = pos(e); g.lineTo(p.x, p.y); g.stroke(); inked.current = true; };
  const end = () => { if (!drawing.current) return; drawing.current = false; if (inked.current) onChange(ref.current!.toDataURL("image/png")); };
  const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); inked.current = false; onChange(null); };

  return (
    <div>
      <canvas ref={ref} width={600} height={200} aria-label="Signature box: draw your signature" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        className="h-40 w-full touch-none cursor-crosshair rounded-xl border-2 border-dashed border-navy/25 bg-white" />
      <button type="button" onClick={clear} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-navy/60 hover:text-gold"><Eraser className="h-3.5 w-3.5" aria-hidden="true" />Clear and sign again</button>
    </div>
  );
}

function Check2({ label, on, toggle }: { label: string; on: boolean; toggle: () => void }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-sm ${on ? "border-gold bg-gold/10 text-navy" : "border-navy/10 text-navy/80"}`}>
      <input type="checkbox" checked={on} onChange={toggle} className="h-4 w-4 accent-gold" />{label}
    </label>
  );
}

export default function FormClient({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [gone, setGone] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [a, setA] = useState<HistoryAnswers>(EMPTY_ANSWERS);
  const [signer, setSigner] = useState("");
  const [relation, setRelation] = useState(RELATIONS[0]);
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/forms/${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) { setGone(true); return; }
    setInfo(await res.json());
  }, [token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the form
  useEffect(() => { load(); }, [load]);

  const toggle = (k: "allergies" | "conditions", v: string) => setA(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));
  const send = async (payload: object) => {
    setBusy(true); setError("");
    const res = await fetch(`/api/forms/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || json.error) setError(json.error || "Could not send. Please check your connection and try again."); else setDone(true);
    setBusy(false);
  };

  const shell = (children: React.ReactNode) => <main className="min-h-screen bg-cream px-4 py-8"><div className="mx-auto max-w-xl">{children}</div></main>;
  if (gone) return shell(
    <div className="rounded-3xl bg-white p-8 text-center shadow-[0_20px_50px_rgba(15,29,61,.10)]">
      <CircleX className="mx-auto h-10 w-10 text-navy/40" aria-hidden="true" />
      <h1 className="mt-4 font-display text-2xl font-semibold text-navy">Link not available</h1>
      <p className="mt-2 text-sm text-navy/60">This form link has expired or was cancelled. Please ask your clinic for a new one.</p>
    </div>,
  );
  if (!info) return shell(<div className="flex items-center justify-center gap-2 py-24 text-sm text-navy/50"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading…</div>);

  const isHistory = info.kind === "history";
  const head = (
    <header className="rounded-t-3xl bg-navy px-6 py-6 text-white" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.12) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}>
      <div className="flex items-center gap-3">
        {info.clinic.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.clinic.logo_url} alt="" className="h-12 w-12 rounded-xl bg-white object-contain p-1" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">{isHistory ? "Medical history" : "Consent form"}</p>
          <h1 className="truncate font-display text-2xl font-semibold">{info.clinic.name}</h1>
        </div>
      </div>
    </header>
  );

  if (done || info.submitted) return shell(
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.15)]">
      {head}
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15"><Check className="h-8 w-8 text-gold" /></span>
        <h2 className="mt-5 font-display text-2xl font-semibold text-navy">{done ? "Thank you" : "Already submitted"}</h2>
        <p className="mt-2 max-w-sm text-sm text-navy/65">{done ? `${info.clinic.name} has received your ${isHistory ? "medical history" : "signed consent"}. You can close this page.` : "This form has already been sent to the clinic."}</p>
      </div>
    </div>,
  );

  return shell(
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.15)]">
      {head}
      <div className="space-y-6 px-6 py-6">
        <p className="text-sm text-navy/70">{info.firstName ? `This form is for ${info.firstName}. ` : ""}Your answers go to {info.clinic.name} and appear on your patient record.</p>

        {isHistory ? (
          <>
            <fieldset><legend className="mb-2 text-sm font-semibold text-navy">Do you have any allergies?</legend>
              <div className="grid gap-2 sm:grid-cols-2">{COMMON_ALLERGIES.map(x => <Check2 key={x} label={x} on={a.allergies.includes(x)} toggle={() => toggle("allergies", x)} />)}</div>
              <input aria-label="Other allergies" className={`${field} mt-2`} placeholder="Any other allergy (separate with commas)" value={a.allergies_other} onChange={e => setA({ ...a, allergies_other: e.target.value })} maxLength={300} />
            </fieldset>
            <fieldset><legend className="mb-2 text-sm font-semibold text-navy">Do you have any of these conditions?</legend>
              <div className="grid gap-2 sm:grid-cols-2">{COMMON_CONDITIONS.map(x => <Check2 key={x} label={x} on={a.conditions.includes(x)} toggle={() => toggle("conditions", x)} />)}</div>
              <input aria-label="Other conditions" className={`${field} mt-2`} placeholder="Any other condition (separate with commas)" value={a.conditions_other} onChange={e => setA({ ...a, conditions_other: e.target.value })} maxLength={300} />
            </fieldset>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Medicines you take now</span>
              <input className={field} placeholder="e.g. Metformin, Aspirin" value={a.medications} onChange={e => setA({ ...a, medications: e.target.value })} maxLength={500} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Previous surgeries</span>
              <input className={field} placeholder="e.g. Appendectomy 2019" value={a.surgeries} onChange={e => setA({ ...a, surgeries: e.target.value })} maxLength={500} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Blood group (if you know it)</span>
              <select className={field} value={a.blood_group} onChange={e => setA({ ...a, blood_group: e.target.value })}><option value="">I do not know</option>{BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Anything else your dentist should know</span>
              <textarea className={field} rows={3} value={a.notes} onChange={e => setA({ ...a, notes: e.target.value })} maxLength={1000} /></label>
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
            <button onClick={() => send({ answers: a })} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-navy disabled:opacity-60">
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? "Sending…" : "Send my medical history"}</button>
          </>
        ) : (
          <>
            <section aria-label={info.template?.title}>
              <h2 className="font-display text-xl font-semibold text-navy">{info.template?.title}</h2>
              <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-navy/10 bg-cream px-4 py-3 text-sm leading-relaxed text-navy/85">{info.template?.body}</div>
            </section>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">Your full name</span>
              <input className={field} autoComplete="name" value={signer} onChange={e => setSigner(e.target.value)} maxLength={100} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy">I am signing as</span>
              <select className={field} value={relation} onChange={e => setRelation(e.target.value)}>{RELATIONS.map(r => <option key={r}>{r}</option>)}</select></label>
            <div><span className="mb-1.5 block text-sm font-semibold text-navy">Sign here</span><SignaturePad onChange={setSignature} /></div>
            <label className="flex items-start gap-3 text-sm text-navy/80"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 accent-gold" />I have read the consent above and I agree to it.</label>
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
            <button onClick={() => send({ signerName: signer, relation, agree, signature })} disabled={busy || !signature || !agree || signer.trim().length < 2}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-navy disabled:opacity-50">
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? "Sending…" : "Sign and send"}</button>
          </>
        )}
        <p className="flex items-start gap-2 text-xs text-navy/50"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Only {info.clinic.name} can see what you send. Your signature is saved with the date and time.</p>
      </div>
    </div>,
  );
}
