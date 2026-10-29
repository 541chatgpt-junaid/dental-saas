"use client";
import { useState } from "react";
import { Check, Copy, LoaderCircle, MessageCircle, Sparkles, TriangleAlert, X } from "lucide-react";
import { waLink } from "@/lib/whatsapp";

export type AiTool = "recall" | "review_request" | "review_reply";
interface Queued { id: string; to: string; body: string }

const field = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

/**
 * Draft a recall message, a review request or a reply to a review with AI. Always a DRAFT:
 * it is written from the record, shown for editing, and only an explicit Approve lets it
 * leave this window (queued for a one-tap send, or copied). Nothing is sent automatically.
 */
export default function AiDraftModal({ tool, refId, title, onClose, onSent }: { tool: AiTool; refId?: string | number; title: string; onClose: () => void; onSent?: () => void }) {
  const [language, setLanguage] = useState<"English" | "Roman Urdu">("English");
  const [review, setReview] = useState({ name: "", rating: "5", text: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{ id: string; warnings: string[]; template: boolean; sent: Record<string, unknown> } | null>(null);
  const [text, setText] = useState("");
  const [done, setDone] = useState<{ queued: Queued | null; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setBusy(true); setError(""); setDraft(null); setDone(null);
    const body: Record<string, unknown> = { tool, language };
    if (tool === "recall") body.recallId = refId; else if (tool === "review_request") body.appointmentId = refId;
    else Object.assign(body, { reviewerName: review.name, rating: Number(review.rating), reviewText: review.text });
    const res = await fetch("/api/ai/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok || j.error) { setError(j.error || "Could not draft that. Please try again."); return; }
    setDraft({ id: j.draftId, warnings: j.warnings || [], template: !!j.usedTemplate, sent: j.sent || {} }); setText(j.message);
  };
  const approve = async () => {
    if (!draft) return;
    setBusy(true); setError("");
    const res = await fetch("/api/ai/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: draft.id, text }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok || j.error) { setError(j.error || "Could not approve. Please try again."); return; }
    setDone({ queued: j.queued, text: j.text });
  };
  const sentByHand = async (q: Queued) => {
    await fetch("/api/reminders/outbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: q.id }) }).catch(() => null);
    onSent?.();
  };
  const copy = async () => { try { await navigator.clipboard.writeText(done?.text || ""); setCopied(true); } catch { /* the text is selectable */ } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-brand-800"><Sparkles className="mr-1.5 inline h-4 w-4 align-[-2px] text-gold" aria-hidden="true" />{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-brand-400 hover:text-brand-700"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-xs text-brand-400">The AI writes from this record only. You read and edit the draft, and nothing is sent until you approve it.</p>

        {tool === "review_reply" && !draft && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label htmlFor="ai-rv-name" className="mb-1 block text-xs font-medium text-gray-600">Reviewer&apos;s name (as shown)</label><input id="ai-rv-name" value={review.name} onChange={e => setReview({ ...review, name: e.target.value })} className={field} /></div>
              <div><label htmlFor="ai-rv-stars" className="mb-1 block text-xs font-medium text-gray-600">Stars</label>
                <select id="ai-rv-stars" value={review.rating} onChange={e => setReview({ ...review, rating: e.target.value })} className={field}>{[5, 4, 3, 2, 1].map(n => <option key={n}>{n}</option>)}</select></div>
            </div>
            <div><label htmlFor="ai-rv-text" className="mb-1 block text-xs font-medium text-gray-600">The review (paste it here)</label><textarea id="ai-rv-text" rows={4} value={review.text} onChange={e => setReview({ ...review, text: e.target.value })} className={field} /></div>
          </div>
        )}

        {!draft && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {tool !== "review_reply" && (
              <label className="flex items-center gap-2 text-xs text-brand-600">Language
                <select value={language} onChange={e => setLanguage(e.target.value as "English" | "Roman Urdu")} className="border border-brand-200 rounded-lg px-2 py-1.5 text-sm"><option>English</option><option>Roman Urdu</option></select></label>)}
            <button onClick={generate} disabled={busy || (tool === "review_reply" && review.text.trim().length < 10)} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? "Drafting…" : "Draft with AI"}</button>
          </div>)}

        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        {draft && !done && (
          <div className="mt-3 space-y-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#8a6d12]"><Sparkles className="h-3 w-3" aria-hidden="true" />AI draft · not sent · not saved</p>
            {draft.warnings.map(w => <p key={w} className="flex gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{w}</p>)}
            <textarea aria-label="Draft message" rows={7} value={text} onChange={e => setText(e.target.value)} className={field} />
            <details className="text-xs text-brand-500"><summary className="cursor-pointer">What the AI was given</summary>
              <ul className="mt-1 space-y-0.5">{Object.entries(draft.sent).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => <li key={k}><span className="font-medium">{k.replace(/_/g, " ")}</span>: {String(v)}</li>)}</ul></details>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={approve} disabled={busy || !text.trim()} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Approve this message</button>
              <button onClick={generate} disabled={busy} className="text-sm text-brand-500 hover:underline">Draft again</button>
            </div>
          </div>)}

        {done && (
          <div className="mt-3 space-y-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700"><Check className="h-3 w-3" aria-hidden="true" />Approved by you</p>
            <p className="whitespace-pre-line rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{done.queued?.body || done.text}</p>
            <div className="flex flex-wrap items-center gap-3">
              {done.queued ? (
                <a href={waLink(done.queued.to, done.queued.body)} target="_blank" rel="noreferrer" onClick={() => sentByHand(done.queued!)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:opacity-90"><MessageCircle className="h-4 w-4" aria-hidden="true" />Send on WhatsApp</a>
              ) : (
                <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:border-gold"><Copy className="h-4 w-4" aria-hidden="true" />{copied ? "Copied" : "Copy reply"}</button>)}
              <button onClick={onClose} className="text-sm text-brand-500 hover:underline">Close</button>
            </div>
            {done.queued && <p className="text-xs text-brand-400">Queued with a stop link. It stays in &quot;Messages ready to send&quot; on the Appointments page until you send it.</p>}
          </div>)}
      </div>
    </div>
  );
}
