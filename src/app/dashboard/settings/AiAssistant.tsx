"use client";
import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import AiDraftModal from "@/components/AiDraftModal";
import type { AiStatus } from "@/lib/useAi";

const card = "bg-white rounded-xl border border-brand-200 p-5 shadow-sm";

export default function AiAssistant() {
  const [st, setSt] = useState<AiStatus | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reply, setReply] = useState(false);
  const load = useCallback(async () => { const r = await fetch("/api/ai/status", { cache: "no-store" }).catch(() => null); setSt(r?.ok ? await r.json() : null); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const toggle = async (enabled: boolean) => {
    setMsg(null);
    const res = await fetch("/api/ai/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || j.error) setMsg({ ok: false, text: j.error || "Could not save." }); else setMsg({ ok: true, text: enabled ? "AI drafting is on." : "AI drafting is off." });
    load();
  };

  if (!st) return <p className="text-sm text-brand-400">Loading…</p>;
  return (
    <div className="w-full md:max-w-2xl space-y-5">
      <section className={card}>
        <h3 className="text-sm font-semibold text-brand-800"><Sparkles className="mr-1.5 inline h-4 w-4 align-[-2px] text-gold" aria-hidden="true" />AI assistant {st.ready && <span className="ml-2 text-xs font-normal text-green-700">on</span>}</h3>
        <p className="mt-1 text-xs text-brand-400">Draft recall messages, review requests and replies to reviews, and turn a dictated visit note into a structured note. Every result is a draft that your staff read, edit and approve: nothing is sent or saved on its own, and the AI is given only facts from your records and told to use nothing else.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-brand-600">
          <li>When you use a tool, the facts it needs are sent to the AI service the server is connected to: a patient&apos;s first name, your clinic name and phone, the recall reason and dates, the visit date, or the text you dictate or paste. A patient&apos;s phone number, address, CNIC and medical history are not sent. You can see what was sent under &quot;What the AI was given&quot;.</li>
          <li>Messages are drafted only for patients who agreed to be messaged.</li>
          <li>Dictation uses your browser&apos;s own speech recognition; DentEase does not keep the audio.</li>
        </ul>
        {!st.configured ? (
          <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">AI is not set up on this server yet. {st.owner ? st.help : "Ask the person who runs DentEase."}</p>
        ) : (
          <>
            <p className="mt-3 text-xs text-brand-500">Connected to the {st.provider === "anthropic" ? "Anthropic" : "OpenAI-compatible"} service ({st.model}).</p>
            {st.owner ? (
              <label className="mt-3 flex items-center gap-2 text-sm text-brand-700"><input type="checkbox" checked={st.enabled} onChange={e => toggle(e.target.checked)} className="h-4 w-4 accent-gold" />Switch AI drafting on for this clinic</label>
            ) : <p className="mt-3 text-xs text-brand-400">Only the clinic owner can switch this on or off.</p>}
          </>
        )}
        {msg && <p role="status" className={`mt-2 text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      </section>

      {st.ready && st.owner && (
        <section className={card}>
          <h3 className="text-sm font-semibold text-brand-800">Reply to a Google review</h3>
          <p className="mt-1 text-xs text-brand-400">Paste a review and get a draft public reply. It never says the reviewer is a patient and never mentions treatments, dates or health details.</p>
          <button onClick={() => setReply(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gold/50 bg-gold/10 px-4 py-2 text-sm font-medium text-[#8a6d12] hover:bg-gold/20"><Sparkles className="h-4 w-4" aria-hidden="true" />Draft a reply</button>
        </section>)}
      {reply && <AiDraftModal tool="review_reply" title="Reply to a Google review" onClose={() => setReply(false)} />}
    </div>
  );
}
