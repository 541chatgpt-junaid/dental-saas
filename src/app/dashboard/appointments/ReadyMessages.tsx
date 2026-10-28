"use client";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { waLink } from "@/lib/whatsapp";

interface Row { id: string; kind: string; to_phone: string | null; body: string | null; patients: { name: string } | null }
const KIND: Record<string, string> = { reminder_day_before: "Reminder", reminder_same_day: "Reminder", noshow_followup: "Rebooking follow-up", review_request: "Review request" };

/** Messages the scheduler has prepared for a clinic without a WhatsApp API connection: one tap sends each. */
export default function ReadyMessages() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(async () => {
    const { data } = await createClient().from("message_outbox").select("id, kind, to_phone, body, patients(name)").eq("status", "ready").order("due_at").limit(30);
    setRows((data as unknown as Row[]) || []);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  if (rows.length === 0) return null;

  const sent = async (id: string) => { await fetch("/api/reminders/outbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null); load(); };
  return (
    <section aria-label="Messages ready to send" className="mb-5 rounded-xl border border-gold/50 bg-gold/10 p-4">
      <h2 className="text-sm font-semibold text-brand-800"><MessageCircle className="mr-1.5 inline h-4 w-4 align-[-3px] text-[#128C7E]" aria-hidden="true" />Messages ready to send ({rows.length})</h2>
      <ul className="mt-2 divide-y divide-gold/30">
        {rows.map(r => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-brand-700">
            <span><strong>{r.patients?.name || "Patient"}</strong> · {KIND[r.kind] || r.kind}</span>
            <a href={waLink(r.to_phone, r.body || "")} target="_blank" rel="noreferrer" onClick={() => sent(r.id)} className="rounded-lg bg-[#128C7E] px-3 py-1.5 text-xs font-semibold text-white">Send on WhatsApp</a>
          </li>))}
      </ul>
    </section>
  );
}
