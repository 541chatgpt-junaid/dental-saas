"use client";
import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";

interface Backup { id: string; kind: string; size_bytes: number; row_counts: Record<string, number>; created_at: string }
const card = "bg-white rounded-xl border border-brand-200 p-5 shadow-sm";
const btn = "rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-medium text-brand-700 hover:border-gold disabled:opacity-60";
const when = (iso: string) => `${formatDate(iso)} ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function BackupsExport() {
  const [list, setList] = useState<Backup[]>([]);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/backups").catch(() => null);
    if (res?.status === 403) { setDenied(true); return; }
    const j = res ? await res.json().catch(() => null) : null;
    setList(j?.backups || []);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); setOrigin(window.location.origin); }, [load]);

  const act = async (body: Record<string, string>, what: string) => {
    setBusy(what); setMsg(null);
    const res = await fetch("/api/backups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy("");
    if (!res?.ok || j.error) { setMsg({ ok: false, text: j.error || "That did not work. Please try again." }); return; }
    setMsg({ ok: true, text: body.action === "restore" ? (j.total ? `Put back ${j.total} deleted record${j.total === 1 ? "" : "s"}.` : "Nothing to put back: every record in that backup is still here.") : "Backup taken." });
    load();
  };
  const restore = (b: Backup) => {
    if (!confirm(`Put back records deleted since ${when(b.created_at)}? Records that still exist are not changed.`)) return;
    act({ action: "restore", id: b.id }, b.id);
  };

  if (denied) return <p className="text-sm text-brand-500">Only the clinic owner can manage backups and exports.</p>;
  return (
    <div className="w-full md:max-w-2xl space-y-5">
      <section className={card}>
        <h3 className="text-sm font-semibold text-brand-800">Export all your data</h3>
        <p className="mt-1 text-xs text-brand-400">Everything DentEase keeps for your clinic: patients, appointments, visits, prescriptions, billing, expenses, stock, staff, settings and the audit log, one sheet per kind of record. Payment and WhatsApp credentials and secret links are never included.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/export/full" className={btn}><Download className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Excel (all data)</a>
          <a href="/api/export/full?format=json" className={btn}><Download className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />JSON (all data, with signatures)</a>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-brand-800">Backups</h3>
          <button onClick={() => act({ action: "backup" }, "now")} disabled={!!busy} className={btn}>{busy === "now" ? "Backing up…" : "Back up now"}</button>
        </div>
        <p className="mt-1 text-xs text-brand-400">A snapshot of your clinic&apos;s data is taken automatically about once a day and the latest 30 are kept. To get back records that were deleted by mistake, choose &quot;Restore&quot; on a snapshot: deleted records are put back, and records that still exist are left exactly as they are.</p>
        {msg && <p role="status" className={`mt-2 text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
        {list.length === 0 ? <p className="mt-3 text-xs text-brand-400">No backup yet. The first one is taken at the next scheduled run, or press &quot;Back up now&quot;.</p> : (
          <ul className="mt-3 divide-y divide-brand-100 text-sm">
            {list.map(b => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-brand-800">{when(b.created_at)} <span className="text-xs text-brand-400">· {b.kind === "auto" ? "automatic" : "by hand"} · {kb(b.size_bytes)} · {b.row_counts?.patients ?? 0} patients</span></span>
                <span className="flex items-center gap-2">
                  <a href={`/api/backups?download=${b.id}`} className={btn}>Download</a>
                  <button onClick={() => restore(b)} disabled={!!busy} className={btn}>{busy === b.id ? "Restoring…" : "Restore"}</button>
                </span>
              </li>))}
          </ul>)}
      </section>

      <section className={card}>
        <h3 className="text-sm font-semibold text-brand-800">Scheduler and your database provider&apos;s backups</h3>
        <p className="mt-1 text-xs text-brand-400">Snapshots are taken when this address is called, so set a job to call it every 15 minutes (it takes a few clinics at a time and skips any with a snapshot from the last 20 hours). Send the server&apos;s <code>CRON_SECRET</code> as <code>Authorization: Bearer &lt;secret&gt;</code>.</p>
        <p className="mt-2 break-all rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">{origin}/api/cron/backups</p>
        <p className="mt-3 text-xs text-brand-400">These snapshots are a second layer. To recover a whole lost database, use your database provider&apos;s own backups (Supabase: daily backups on paid plans, point-in-time recovery as an add-on; see Database &gt; Backups in your Supabase dashboard).</p>
      </section>
    </div>
  );
}
