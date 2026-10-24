"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Info, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { saveErrorMessage } from "@/lib/formSave";
import Sidebar from "@/components/Sidebar";
import EmptyState from "@/components/EmptyState";
import { useClinic } from "@/lib/ClinicContext";
import { useCurrency } from "@/lib/useCurrency";
import { countedPayments, doctorResolver, loadLedger, sumPaymentsBetween } from "@/lib/ledger";

interface Doctor { id: number; name: string; commission_percent: number | null }
interface Payout { id: string; doctor_name: string; amount: number; paid_on: string; note: string | null }
interface Row { doctor: Doctor; visits: number; registrations: number; collected: number; commission: number; paid: number; balance: number }

const thisMonth = () => new Date().toISOString().slice(0, 7);

/** [start, end) of a 'YYYY-MM' month as ISO date strings */
function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

export default function Commissions() {
  const router = useRouter();
  const { clinicId } = useClinic();
  const { symbol } = useCurrency();
  const money = (n: number) => `${symbol} ${Math.round(n).toLocaleString()}`;

  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [start, end] = monthRange(month);
    const [docs, visits, patients, ledger, pays] = await Promise.all([
      supabase.from("doctors").select("id, name, commission_percent").order("name"),
      supabase.from("visits").select("id, doctor_name"),
      supabase.from("patients").select("id, doctor_name"),
      loadLedger(supabase, { clinicId, select: "id, patient_id, visit_id, status, subtotal, discount, total, amount_paid, created_at, notes" }).catch(() => null),
      supabase.from("doctor_payouts").select("id, doctor_name, amount, paid_on, note").eq("month", month).order("paid_on"),
    ]);
    if (docs.error) {
      setError(docs.error.message.includes("commission_percent")
        ? "Run supabase_clinic_features.sql in Supabase to enable commissions."
        : docs.error.message);
      setLoading(false);
      return;
    }
    if (pays.error) {
      setError("Could not load payouts. Has supabase_clinic_features.sql been run?");
    } else setError("");

    // Collected = payments received this month (ledger), credited to the visit's doctor
    // for visit invoices, otherwise to the doctor the patient is registered with
    const key = (n: string | null | undefined) => (n || "").trim().toLowerCase();
    const doctorOf = doctorResolver(visits.data || [], patients.data || []);
    const visitSum: Record<string, number> = {};
    const regSum: Record<string, number> = {};
    const from = new Date(`${start}T00:00:00Z`), to = new Date(`${end}T00:00:00Z`);
    countedPayments(ledger?.payments || [], ledger?.invoices || []).forEach(p => {
      const amount = sumPaymentsBetween([p], from, to);
      if (!amount) return;
      const d = key(doctorOf(p.invoice));
      const bucket = p.invoice.visit_id != null ? visitSum : regSum;
      bucket[d] = (bucket[d] || 0) + amount;
    });
    const paidSum: Record<string, number> = {};
    (pays.data || []).forEach(p => { paidSum[key(p.doctor_name)] = (paidSum[key(p.doctor_name)] || 0) + (Number(p.amount) || 0); });

    setRows((docs.data as Doctor[]).map(doctor => {
      const k = key(doctor.name);
      const v = visitSum[k] || 0, r = regSum[k] || 0;
      const collected = v + r;
      const commission = (collected * (Number(doctor.commission_percent) || 0)) / 100;
      const paid = paidSum[k] || 0;
      return { doctor, visits: v, registrations: r, collected, commission, paid, balance: commission - paid };
    }));
    setPayouts((pays.data as Payout[]) || []);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => { if (!user) router.push("/"); });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when the month changes
    load();
  }, [load, router]);

  const savePercent = async (doctor: Doctor, value: string) => {
    const pct = Math.min(100, Math.max(0, Number(value) || 0));
    if (pct === (Number(doctor.commission_percent) || 0)) return;
    const { error: e } = await createClient().from("doctors").update({ commission_percent: pct }).eq("id", doctor.id);
    if (e) { setError(e.message); return; }
    load();
  };

  const recordPayout = async () => {
    const amount = Number(payAmount);
    if (!payFor || !(amount > 0)) return;
    setSaving(true);
    const { error: e } = await createClient().from("doctor_payouts").insert([{
      clinic_id: clinicId, doctor_name: payFor, month, amount, note: payNote.trim() || null,
    }]);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setPayFor(null); setPayAmount(""); setPayNote("");
    load();
  };

  const deletePayout = async (p: Payout) => {
    if (!confirm(`Delete the ${money(p.amount)} payout to Dr. ${p.doctor_name}?`)) return;
    const { error } = await createClient().from("doctor_payouts").delete().eq("id", p.id);
    if (error) alert(saveErrorMessage(error, "payout").replace("save", "delete"));
    load();
  };

  const totals = rows.reduce((t, r) => ({ collected: t.collected + r.collected, commission: t.commission + r.commission, paid: t.paid + r.paid, balance: t.balance + r.balance }),
    { collected: 0, commission: 0, paid: 0, balance: 0 });
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800 tracking-tight">Doctor Commission</h2>
            <p className="text-sm text-brand-500 mt-1">Each doctor&apos;s share of fees collected in {monthLabel}</p>
          </div>
          <input type="month" value={month} max={thisMonth()} onChange={e => e.target.value && setMonth(e.target.value)} aria-label="Month"
            className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[["Collected", totals.collected, "text-brand-800"], ["Commission", totals.commission, "text-brand-800"], ["Paid out", totals.paid, "text-green-600"], ["Still to pay", totals.balance, totals.balance > 0 ? "text-orange-600" : "text-brand-800"]].map(([label, value, cls]) => (
            <div key={label as string} className="card-hover bg-white rounded-xl p-3 md:p-5 border border-brand-100">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">{label as string}</p>
              <p className={`text-lg md:text-2xl font-bold ${cls}`}>{money(value as number)}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
          {loading ? (
            <p className="py-16 text-center text-sm text-brand-400">Calculating…</p>
          ) : rows.length === 0 ? (
            <EmptyState icon={HandCoins} title="No doctors yet" hint="Add doctors first, then set each one's commission percentage here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-50 border-b border-brand-100">
                  <tr className="text-left text-xs uppercase tracking-wide text-brand-600">
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3 text-right">Collected</th>
                    <th className="px-4 py-3 text-center">Share %</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.doctor.id} className="border-t border-brand-100 hover:bg-brand-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-800">Dr. {r.doctor.name}</p>
                        <p className="text-[11px] text-brand-500">Visits {money(r.visits)} · Registration &amp; other {money(r.registrations)}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-brand-800">{money(r.collected)}</td>
                      <td className="px-4 py-3 text-center">
                        <input key={`${r.doctor.id}-${r.doctor.commission_percent}`} type="number" min={0} max={100} step="0.5"
                          defaultValue={Number(r.doctor.commission_percent) || 0}
                          onBlur={e => savePercent(r.doctor, e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          aria-label={`Commission percent for Dr. ${r.doctor.name}`}
                          className="w-20 rounded-lg border border-brand-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-800">{money(r.commission)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{money(r.paid)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${r.balance > 0.5 ? "text-orange-600" : "text-brand-500"}`}>{money(r.balance)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setPayFor(r.doctor.name); setPayAmount(r.balance > 0 ? String(Math.round(r.balance)) : ""); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                          <Plus className="h-3.5 w-3.5" /> Payout
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-brand-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Collected = payments received this month on each doctor&apos;s invoices: visit invoices count for the visit&apos;s doctor, registration and other invoices for the patient&apos;s doctor. Draft and cancelled invoices are left out.
          Set a doctor&apos;s share by typing the percentage and leaving the box.
        </p>

        {payFor && (
          <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm" onClick={() => setPayFor(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-lg font-semibold text-brand-800">Record payout</h3>
              <p className="mt-1 text-sm text-brand-500">Dr. {payFor} · {monthLabel}</p>
              <label className="mt-4 block">
                <span className="mb-1 block text-xs text-brand-600">Amount ({symbol})</span>
                <input type="number" min={1} autoFocus value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs text-brand-600">Note</span>
                <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Cash, bank transfer…"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </label>
              <div className="mt-5 flex gap-3">
                <button onClick={recordPayout} disabled={saving || !(Number(payAmount) > 0)} className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {saving ? "Saving…" : "Save payout"}
                </button>
                <button onClick={() => setPayFor(null)} className="flex-1 rounded-lg border border-brand-200 py-2 text-sm text-brand-700">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {payouts.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-brand-100 p-4 md:p-5">
            <h3 className="mb-3 text-sm font-semibold text-brand-800">Payouts for {monthLabel}</h3>
            <ul className="divide-y divide-brand-100">
              {payouts.map(p => (
                <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-24 text-brand-500">{new Date(p.paid_on).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                  <span className="flex-1 text-brand-800">Dr. {p.doctor_name}{p.note ? <span className="text-brand-500"> · {p.note}</span> : null}</span>
                  <span className="font-medium text-green-600">{money(Number(p.amount))}</span>
                  <button onClick={() => deletePayout(p)} aria-label="Delete payout" className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
