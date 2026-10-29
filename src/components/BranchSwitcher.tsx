"use client";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { activeBranch, setActiveBranch } from "@/lib/branch";

interface Branch { id: string; name: string; is_main: boolean; active: boolean }

/** Lets staff of a clinic with more than one branch choose the branch they are working in. Hidden for one-branch clinics. */
export default function BranchSwitcher({ light = true }: { light?: boolean }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [admin, setAdmin] = useState(false);
  const [current, setCurrent] = useState<string>("");

  useEffect(() => {
    (async () => {
      const db = createClient();
      const [{ data: rows }, { data: { user } }] = await Promise.all([
        db.from("branches").select("id, name, is_main, active").order("is_main", { ascending: false }).order("name"),
        db.auth.getUser(),
      ]);
      const list = ((rows as Branch[]) || []).filter(b => b.active);
      let isAdmin = false;
      if (user) { const { data: me } = await db.from("staff").select("role").eq("user_id", user.id).maybeSingle(); isAdmin = ["admin", "superadmin"].includes(String(me?.role || "").toLowerCase()); }
      setAdmin(isAdmin); setBranches(list);
      const saved = activeBranch();
      if (saved && list.some(b => b.id === saved)) setCurrent(saved);
      else if (!isAdmin && list.length > 1) { setActiveBranch(list[0].id); setCurrent(list[0].id); window.location.reload(); }
      else { if (saved) setActiveBranch(null); setCurrent(""); }
    })();
  }, []);

  if (branches.length < 2) return null;
  const change = (id: string) => { setActiveBranch(id || null); setCurrent(id); window.location.reload(); };
  return (
    <label className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${light ? "bg-white/5 text-white/70" : "bg-brand-50 text-brand-700"}`}>
      <Building2 className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
      <span className="sr-only">Branch</span>
      <select aria-label="Branch" value={current} onChange={e => change(e.target.value)} className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium outline-none [&>option]:text-navy">
        {admin && <option value="">All branches</option>}
        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </label>
  );
}
