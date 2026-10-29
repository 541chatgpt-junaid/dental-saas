"use client";
import { useCallback, useEffect, useState } from "react";
import TwoFactor from "@/components/TwoFactor";

interface Row { id: number; name: string; email: string; twoFactor: boolean }

export default function SecurityTab() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const load = useCallback(async () => {
    const res = await fetch("/api/security/mfa").catch(() => null);
    const j = res?.ok ? await res.json().catch(() => null) : null;
    setRows(j?.staff ?? null);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  const reset = async (r: Row) => {
    if (!confirm(`Reset two-factor sign-in for ${r.name}? They will sign in with their password only and can set it up again.`)) return;
    await fetch(`/api/security/mfa?staffId=${r.id}`, { method: "DELETE" }).catch(() => null);
    load();
  };
  return (
    <div className="w-full md:max-w-2xl space-y-5">
      <TwoFactor />
      {rows && (
        <section className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-800">Two-factor sign-in across your staff</h3>
          <p className="mt-1 text-xs text-brand-400">If someone loses their phone, reset their two-factor sign-in here so they can get back in.</p>
          <ul className="mt-2 divide-y divide-brand-100 text-sm">
            {rows.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-brand-800">{r.name}<span className="ml-2 text-xs text-brand-400">{r.email}</span></span>
                <span className="flex items-center gap-3 text-xs">
                  <span className={r.twoFactor ? "text-green-700" : "text-brand-400"}>{r.twoFactor ? "On" : "Off"}</span>
                  {r.twoFactor && <button onClick={() => reset(r)} className="text-red-600 hover:underline">Reset</button>}
                </span>
              </li>))}
          </ul>
        </section>
      )}
    </div>
  );
}
