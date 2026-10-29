"use client";
import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Mic, Sparkles, Square, TriangleAlert } from "lucide-react";

interface Section { key: string; label: string; text: string; evidence: string[] }
interface NoteDraft { sections: Section[]; teeth: { number: string; evidence: string }[]; treatment: { name: string; evidence: string } | null; leftOut: string[] }
export interface ScribeResult { notes: string; treatment: string | null; teeth: number[] }

// The browser's own speech recognition (Chrome, Edge, Safari). DentEase does not record or store audio.
type Rec = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: RecEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
type RecEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
const recognition = (): (new () => Rec) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

const field = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

/**
 * AI scribe: dictate (or type) a visit note, get a structured DRAFT whose every part is backed by words you said.
 * Approving it only fills the visit form on screen; the visit is saved by the usual Save button.
 */
export default function ScribePanel({ patientId, onApply }: { patientId: number; onApply: (r: ScribeResult) => void }) {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lang, setLang] = useState("en-GB");
  const [listening, setListening] = useState(false);
  const [canDictate, setCanDictate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{ id: string; note: NoteDraft } | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const rec = useRef<Rec | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCanDictate(!!recognition()); }, []);
  useEffect(() => () => rec.current?.stop(), []);

  const start = () => {
    const R = recognition(); if (!R) return;
    const r = new R(); r.lang = lang; r.continuous = true; r.interimResults = false;
    r.onresult = e => { let add = ""; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) add += e.results[i][0].transcript + " "; if (add) setTranscript(t => (t + " " + add).trim()); };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };
  const stop = () => { rec.current?.stop(); setListening(false); };

  const generate = async () => {
    stop(); setBusy(true); setError(""); setDraft(null);
    const res = await fetch("/api/ai/scribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, patientId }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok || j.error) { setError(j.error || "Could not draft the note. Please try again."); return; }
    setDraft({ id: j.draftId, note: j.draft }); setEdited(Object.fromEntries((j.draft.sections as Section[]).map(s => [s.key, s.text])));
  };
  const approve = async () => {
    if (!draft) return;
    const parts = draft.note.sections.map(s => ({ label: s.label, text: (edited[s.key] ?? s.text).trim() })).filter(p => p.text);
    const teeth = draft.note.teeth.map(t => Number(t.number));
    const notes = [...parts.map(p => `${p.label}: ${p.text}`), ...(teeth.length ? [`Teeth: ${teeth.join(", ")}`] : [])].join("\n");
    if (!notes) { setError("There is nothing to add."); return; }
    setBusy(true); setError("");
    const res = await fetch("/api/ai/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: draft.id, text: notes }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok || j.error) { setError(j.error || "Could not approve. Please try again."); return; }
    onApply({ notes, treatment: draft.note.treatment?.name ?? null, teeth });
    setOpen(false); setDraft(null); setTranscript("");
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs font-medium text-[#8a6d12] hover:bg-gold/20"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />AI scribe (dictate the note)</button>;
  return (
    <section aria-label="AI scribe" className="rounded-xl border border-gold/40 bg-gold/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-brand-800"><Sparkles className="mr-1.5 inline h-4 w-4 align-[-2px] text-gold" aria-hidden="true" />AI scribe</h4>
        <button type="button" onClick={() => { stop(); setOpen(false); }} className="text-xs text-brand-500 hover:underline">Close</button>
      </div>
      <p className="mt-1 text-xs text-brand-500">Say what happened in the visit. The AI sorts it into a note using only your words; you check and approve it before it goes into the form. {canDictate ? "Dictation uses your browser's speech recognition; DentEase does not keep the audio." : "Dictation is not available in this browser: type or paste the note."}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canDictate && (listening
          ? <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white"><Square className="h-3.5 w-3.5" aria-hidden="true" />Stop</button>
          : <button type="button" onClick={start} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"><Mic className="h-3.5 w-3.5" aria-hidden="true" />Start dictating</button>)}
        {canDictate && <select aria-label="Dictation language" value={lang} onChange={e => setLang(e.target.value)} disabled={listening} className="border border-brand-200 rounded-lg px-2 py-1.5 text-xs"><option value="en-GB">English (UK)</option><option value="en-US">English (US)</option><option value="en-IN">English (India)</option><option value="ur-PK">Urdu (Pakistan)</option></select>}
        {listening && <span className="text-xs font-medium text-red-600">Listening…</span>}
      </div>
      <textarea aria-label="What you said" rows={4} value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="e.g. Patient came with pain in the lower right molar, tooth 46. Deep caries found. Did a composite filling…" className={`${field} mt-2`} />
      <button type="button" onClick={generate} disabled={busy || transcript.trim().length < 15} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
        {busy && !draft ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy && !draft ? "Drafting…" : "Draft the note"}</button>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{error}</p>}

      {draft && (
        <div className="mt-4 space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#8a6d12]"><Sparkles className="h-3 w-3" aria-hidden="true" />AI draft · not saved</p>
          {draft.note.sections.length === 0 && <p className="text-sm text-brand-600">Nothing in what you said could be placed in a note section.</p>}
          {draft.note.sections.map(s => (
            <div key={s.key}>
              <label className="mb-1 block text-xs font-semibold text-brand-700">{s.label}</label>
              <textarea aria-label={s.label} rows={2} value={edited[s.key] ?? s.text} onChange={e => setEdited({ ...edited, [s.key]: e.target.value })} className={field} />
              <p className="mt-0.5 text-[11px] italic text-brand-400">You said: {s.evidence.map(e => `“${e}”`).join(" · ")}</p>
            </div>))}
          {draft.note.teeth.length > 0 && <p className="text-xs text-brand-600"><strong>Teeth:</strong> {draft.note.teeth.map(t => t.number).join(", ")}</p>}
          {draft.note.treatment && <p className="text-xs text-brand-600"><strong>Treatment:</strong> {draft.note.treatment.name} <span className="italic text-brand-400">(you said: “{draft.note.treatment.evidence}”)</span></p>}
          {draft.note.leftOut.length > 0 && (
            <div className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
              <p className="flex items-center gap-1.5 font-medium"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />Left out because it was not in what you said:</p>
              <ul className="mt-1 list-disc pl-5">{draft.note.leftOut.map(x => <li key={x}>{x}</li>)}</ul></div>)}
          <button type="button" onClick={approve} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"><Check className="h-4 w-4" />Approve and add to the visit form</button>
          <p className="text-xs text-brand-400">This only fills the form. The visit is saved when you press Save.</p>
        </div>)}
    </section>
  );
}
