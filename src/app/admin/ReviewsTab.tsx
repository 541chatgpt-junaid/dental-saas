"use client";
import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/dateFormat";
import { Check, EyeOff, Star, Trash2 } from "lucide-react";

type Review = { id: string; name: string; clinic: string | null; rating: number; review: string; is_approved: boolean; created_at: string };


export default function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/reviews");
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data)) setError(data?.error || "Could not load reviews. Has supabase_reviews.sql been run?");
    else { setReviews(data); setError(""); }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
  useEffect(() => { load(); }, [load]);

  const setApproved = async (r: Review, is_approved: boolean) => {
    setReviews(list => list.map(x => (x.id === r.id ? { ...x, is_approved } : x)));
    const res = await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, is_approved }) });
    if (!res.ok) { setError("Update failed. Please try again."); load(); }
  };

  const remove = async (r: Review) => {
    if (!confirm(`Delete the review from ${r.name}?`)) return;
    setReviews(list => list.filter(x => x.id !== r.id));
    const res = await fetch("/api/admin/reviews", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id }) });
    if (!res.ok) { setError("Delete failed. Please try again."); load(); }
  };

  const shown = reviews.filter(r => filter === "all" || (filter === "approved" ? r.is_approved : !r.is_approved));
  const pendingCount = reviews.filter(r => !r.is_approved).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {([["pending", `Pending (${pendingCount})`], ["approved", "Approved"], ["all", "All"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === k ? "bg-brand-700 text-white" : "border border-brand-200 bg-white text-brand-700 hover:border-gold"}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-xs text-brand-500">Approved reviews appear in the testimonials strip on the landing page (latest 20).</p>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading reviews…</p>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-brand-200 bg-white py-16 text-center text-sm text-gray-400">No reviews here yet.</p>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2">
          {shown.map(r => (
            <article key={r.id} className="rounded-xl border border-brand-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-800">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.clinic || "—"} · {formatDate(r.created_at)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.is_approved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {r.is_approved ? "Approved" : "Pending"}
                </span>
              </div>
              <div className="mt-3 flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-gold text-gold" : "text-brand-200"}`} />)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">&ldquo;{r.review}&rdquo;</p>
              <div className="mt-4 flex gap-2 border-t border-brand-100 pt-4">
                {r.is_approved ? (
                  <button onClick={() => setApproved(r, false)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </button>
                ) : (
                  <button onClick={() => setApproved(r, true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                <button onClick={() => remove(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
