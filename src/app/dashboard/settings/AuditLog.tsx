"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/dateFormat";

interface Entry { id: number; actor_name: string | null; actor_email: string | null; action: string; table_name: string; record_id: string | null; summary: string | null; changes: Record<string, unknown> | null; created_at: string }
const PAGE = 50;
const LABEL: Record<string, string> = {
  patients: "Patient", medical_history: "Medical history", visits: "Visit", prescriptions: "Prescription", appointments: "Appointment", invoices: "Invoice", invoice_items: "Invoice item",
  payments: "Payment", expenses: "Expense", purchases: "Purchase", materials: "Stock item", labs: "Lab case", doctors: "Doctor", doctor_payouts: "Commission payout", treatment_plans: "Treatment plan",
  staff: "Staff", settings: "Clinic settings", branches: "Branch", staff_branches: "Branch access", booking_settings: "Booking settings", patient_portal_users: "Portal login", consent_records: "Signed consent", patient_files: "Patient file",
};
const VERB: Record<string, string> = { create: "created", update: "changed", delete: "deleted" };
const when = (iso: string) => `${formatDate(iso)} ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
const show = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Who created, changed or deleted sensitive records, and when. Written by the database; readable only by clinic admins. */
export default function AuditLog() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [table, setTable] = useState("");
  const [more, setMore] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (offset: number, t: string) => {
    let q = createClient().from("audit_log").select("id, actor_name, actor_email, action, table_name, record_id, summary, changes, created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + PAGE);
    if (t) q = q.eq("table_name", t);
    const { data } = await q;
    const list = (data as Entry[]) || [];
    setMore(list.length > PAGE);
    setRows(prev => (offset === 0 ? list.slice(0, PAGE) : [...prev, ...list.slice(0, PAGE)]));
    setLoaded(true);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(0, table); }, [load, table]);

  return (
    <div className="w-full md:max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-brand-400">Who created, changed or deleted records, and when. Only admins can see this, and nobody can edit it. Viewing a record is not logged.</p>
        <select aria-label="Filter by record type" value={table} onChange={e => { setTable(e.target.value); setLoaded(false); }} className="border border-brand-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All record types</option>
          {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {loaded && rows.length === 0 ? <p className="text-sm text-brand-500">Nothing recorded yet, or you are not an admin.</p> : (
        <ul className="divide-y divide-brand-100 rounded-xl border border-brand-200 bg-white shadow-sm">
          {rows.map(r => (
            <li key={r.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-brand-800"><strong>{r.actor_name || r.actor_email || "System"}</strong> {VERB[r.action] || r.action} {LABEL[r.table_name] || r.table_name}{r.summary ? ` “${r.summary}”` : ""}{r.record_id ? <span className="text-brand-400"> #{r.record_id.slice(0, 8)}</span> : null}</span>
                <span className="text-xs text-brand-400">{when(r.created_at)}</span>
              </div>
              {r.changes && Object.keys(r.changes).length > 0 && (
                <details className="mt-1 text-xs text-brand-500">
                  <summary className="cursor-pointer">{r.action === "update" ? `Changed: ${Object.keys(r.changes).join(", ")}` : "Details"}</summary>
                  <ul className="mt-1 space-y-0.5">{Object.entries(r.changes).map(([k, v]) => (
                    <li key={k}><span className="font-medium">{k}</span>: {r.action === "update" && Array.isArray(v) ? <>{show(v[0])} → {show(v[1])}</> : show(v)}</li>))}</ul>
                </details>)}
            </li>))}
        </ul>)}
      {more && <button onClick={() => load(rows.length, table)} className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm text-brand-700 hover:border-gold">Load more</button>}
    </div>
  );
}
