"use client";
import { useEffect, useState, useCallback } from "react";

export type MasterTreatment = { id: string; name: string; price: number; code?: string };

/**
 * The only way to choose a treatment anywhere in the app: a dropdown backed
 * by the clinic's treatment master list (Settings → Treatment Presets).
 * There is no free-text entry — a treatment that isn't on the list is added
 * to the master list first (via "Add new treatment…"), then selected.
 *
 * Picking an item reports its default fee; the caller may keep or edit it.
 */
export default function TreatmentSelect({
  value, onPick, className, placeholder = "Select treatment", disabled, withFee = true,
}: {
  value: string;
  onPick: (name: string, fee: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** whether to ask for a default fee when adding a new treatment */
  withFee?: boolean;
}) {
  const [list, setList] = useState<MasterTreatment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/presets?type=treatments");
      const json = await res.json().catch(() => ({}));
      setList(Array.isArray(json.data) ? json.data : []);
    } catch { /* leave the list as-is on a network hiccup */ }
    setLoading(false);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial master-list fetch
  useEffect(() => { load(); }, [load]);

  const feeOf = (name: string) => list.find(t => t.name === name)?.price ?? 0;

  const addNew = async () => {
    const name = window.prompt("New treatment name:")?.trim();
    if (!name) return;
    let price = 0;
    if (withFee) {
      const raw = window.prompt(`Default fee for "${name}" (leave blank for 0):`, "")?.trim() || "0";
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) { alert("Please enter a valid fee (0 or more)."); return; }
      price = n;
    }
    const res = await fetch("/api/presets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "treatments", name, price }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 409 = already exists: just select the existing one
      if (res.status === 409) { await load(); onPick(name, feeOf(name) || price); return; }
      alert(json.error || "Could not add the treatment.");
      return;
    }
    await load();
    onPick(name, price);
  };

  // An old value not (yet) on the list is still shown so the record stays readable
  const hasValue = !!value && list.some(t => t.name === value);
  const cls = className ?? "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

  return (
    <select
      value={value}
      disabled={disabled || loading}
      className={cls}
      onChange={e => {
        const v = e.target.value;
        if (v === "__add__") { addNew(); return; }
        onPick(v, feeOf(v));
      }}
    >
      <option value="">{loading ? "Loading…" : placeholder}</option>
      {!hasValue && value && <option value={value}>{value}</option>}
      {list.map(t => (
        <option key={t.id} value={t.name}>{t.name}{t.price > 0 ? ` — Rs ${t.price.toLocaleString()}` : ""}</option>
      ))}
      <option value="__add__">➕ Add new treatment…</option>
    </select>
  );
}
