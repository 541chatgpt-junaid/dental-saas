"use client";
import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/dateFormat";
import { MessageCircle, Phone } from "lucide-react";
import { waLink } from "@/lib/whatsapp";

type DemoRequest = {
  id: string; name: string; phone: string; clinic: string | null; plan: string;
  clinic_size: string; features: string[]; status: "new" | "contacted" | "done"; created_at: string;
};

const STATUS_STYLE: Record<DemoRequest["status"], string> = {
  new: "bg-gold/15 text-[#8a6d12]",
  contacted: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};


export default function DemoRequestsTab() {
  const [rows, setRows] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/demo-requests");
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data)) setError(data?.error || "Could not load demo requests. Has supabase_demo_requests.sql been run?");
    else { setRows(data); setError(""); }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
  useEffect(() => { load(); }, [load]);

  const setStatus = async (r: DemoRequest, status: DemoRequest["status"]) => {
    setRows(list => list.map(x => (x.id === r.id ? { ...x, status } : x)));
    const res = await fetch("/api/admin/demo-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, status }) });
    if (!res.ok) { setError("Update failed. Please try again."); load(); }
  };

  if (loading) return <p className="py-16 text-center text-sm text-gray-400">Loading demo requests…</p>;

  return (
    <div>
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {rows.length === 0 && !error ? (
        <p className="rounded-xl border border-brand-200 bg-white py-16 text-center text-sm text-gray-400">No demo requests yet.</p>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(r => {
            const msg = `Assalam o Alaikum ${r.name}, thank you for your interest in DentEase! When would be a good time to set up your clinic?`;
            return (
              <article key={r.id} className="flex flex-col rounded-xl border border-brand-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-800">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.clinic || "—"} · {formatDate(r.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status] ?? STATUS_STYLE.new}`}>{r.status}</span>
                </div>
                <dl className="mb-4 mt-4 space-y-1.5 text-sm">
                  <div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-500">Plan</dt><dd className="text-brand-800">{r.plan}</dd></div>
                  <div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-500">Size</dt><dd className="text-brand-800">{r.clinic_size}</dd></div>
                  <div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-500">Wants</dt><dd className="text-brand-800">{r.features.join(", ")}</dd></div>
                  <div className="flex gap-2"><dt className="w-20 shrink-0 text-gray-500">Phone</dt><dd className="text-brand-800">{r.phone}</dd></div>
                </dl>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-brand-100 pt-4">
                  <a href={waLink(r.phone, msg)} target="_blank" rel="noreferrer"
                    onClick={() => r.status === "new" && setStatus(r, "contacted")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                  <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                  <select value={r.status} onChange={e => setStatus(r, e.target.value as DemoRequest["status"])} aria-label="Status"
                    className="ml-auto rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-xs text-brand-700 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/50">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
