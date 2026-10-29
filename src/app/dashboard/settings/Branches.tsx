"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil } from "lucide-react";

interface Branch { id: string; name: string; address: string | null; phone: string | null; is_main: boolean; active: boolean }
interface Staff { id: number; name: string; email: string; role: string }
interface Link { staff_id: number; branch_id: string }
const input = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";
const card = "bg-white rounded-xl border border-brand-200 p-5 shadow-sm";
const isOwnerRole = (r: string) => ["admin", "superadmin"].includes(String(r || "").toLowerCase());

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [denied, setDenied] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", address: "", phone: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/branches").catch(() => null);
    if (res?.status === 403) { setDenied(true); return; }
    const j = res ? await res.json().catch(() => null) : null;
    if (j) { setBranches(j.branches); setStaff(j.staff); setLinks(j.links); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const save = async (extra: Partial<Branch> & { id?: string } = {}) => {
    setMsg(null);
    const body = { ...form, id: form.id || undefined, ...extra };
    const res = await fetch("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || j.error) { setMsg({ ok: false, text: j.error || "Could not save." }); return; }
    setMsg({ ok: true, text: "Saved." }); setForm({ id: "", name: "", address: "", phone: "" }); load();
  };
  const assign = async (staffId: number, branchId: string, on: boolean) => {
    const cur = links.filter(l => l.staff_id === staffId).map(l => l.branch_id);
    const next = on ? [...new Set([...cur, branchId])] : cur.filter(x => x !== branchId);
    await fetch("/api/branches/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffId, branchIds: next }) }).catch(() => null);
    load();
  };

  if (denied) return <p className="text-sm text-brand-500">Only the clinic owner can manage branches.</p>;
  const others = staff.filter(s => !isOwnerRole(s.role));
  return (
    <div className="w-full md:max-w-2xl space-y-5">
      <section className={card}>
        <h3 className="text-sm font-semibold text-brand-800">{form.id ? "Edit branch" : "Add a branch"}</h3>
        <p className="mt-1 text-xs text-brand-400">Each branch keeps its own patients, appointments, billing, expenses and stock. Owners see every branch; other staff see only the branches you assign below (with none assigned, the Main branch).</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Branch name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gulberg branch" className={input} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={input} /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={input} /></div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => save()} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium">{form.id ? "Save branch" : "Add branch"}</button>
          {form.id && <button onClick={() => setForm({ id: "", name: "", address: "", phone: "" })} className="text-sm text-brand-500">Cancel</button>}
          {msg && <span role="status" className={`text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</span>}
        </div>
      </section>

      <section className={card}>
        <h3 className="text-sm font-semibold text-brand-800">Branches</h3>
        <ul className="mt-2 divide-y divide-brand-100">
          {branches.map(b => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0"><strong className="text-brand-800">{b.name}</strong>{b.is_main && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-[#8a6d12]">Main</span>}{!b.active && <span className="ml-2 text-xs text-brand-400">switched off</span>}
                <span className="block truncate text-xs text-brand-400">{[b.address, b.phone].filter(Boolean).join(" · ") || "No address yet"}</span></span>
              <span className="flex shrink-0 items-center gap-3">
                <button aria-label={`Edit ${b.name}`} onClick={() => setForm({ id: b.id, name: b.name, address: b.address || "", phone: b.phone || "" })} className="text-brand-500 hover:text-brand-800"><Pencil className="h-4 w-4" /></button>
                {!b.is_main && <button onClick={() => save({ id: b.id, name: b.name, address: b.address ?? "", phone: b.phone ?? "", active: !b.active })} className="text-xs text-brand-500 hover:underline">{b.active ? "Switch off" : "Switch on"}</button>}
              </span>
            </li>))}
        </ul>
      </section>

      {branches.length > 1 && others.length > 0 && (
        <section className={card}>
          <h3 className="text-sm font-semibold text-brand-800">Who works where</h3>
          <p className="mt-1 text-xs text-brand-400">Tick the branches each member of staff may open. Owners and admins always open all branches.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-brand-500"><th className="py-1 pr-3 font-medium">Staff</th>{branches.map(b => <th key={b.id} className="px-2 py-1 font-medium">{b.name}</th>)}</tr></thead>
              <tbody>{others.map(s => (
                <tr key={s.id} className="border-t border-brand-100">
                  <td className="py-2 pr-3 text-brand-800">{s.name}</td>
                  {branches.map(b => {
                    const on = links.some(l => l.staff_id === s.id && l.branch_id === b.id);
                    const none = !links.some(l => l.staff_id === s.id);
                    return <td key={b.id} className="px-2 py-2 text-center"><input type="checkbox" aria-label={`${s.name} at ${b.name}`} checked={on || (none && b.is_main)} onChange={e => assign(s.id, b.id, e.target.checked)} className="h-4 w-4 accent-gold" /></td>;
                  })}
                </tr>))}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
