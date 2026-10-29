"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { doctorName } from "@/lib/personName";
import { formatDate } from "@/lib/dateFormat";
import { useRouter } from "next/navigation";
import TreatmentSelect from "@/components/TreatmentSelect";
import {
  CheckCircle2, ChevronDown, ClipboardList, FileText, MessageCircle, Pencil, Plus, Printer, Trash2, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { loadVatConfig } from "@/lib/ledger";
import { invoiceTotals, rateForNewInvoice } from "@/lib/vat";
import { firstError, readAmount, saveErrorMessage } from "@/lib/formSave";
import Sidebar from "@/components/Sidebar";
import EmptyState from "@/components/EmptyState";
import { useClinic } from "@/lib/ClinicContext";
import { useCurrency } from "@/lib/useCurrency";
import { waLink } from "@/lib/whatsapp";

type Status = "proposed" | "accepted" | "in_progress" | "completed" | "declined";

interface PlanItem { id?: string; tooth: string; procedure: string; fee: number; done: boolean; position?: number }
interface Plan {
  id: string;
  patient_id: number | null;
  patient_name: string;
  doctor_name: string | null;
  title: string;
  status: Status;
  discount: number;
  notes: string | null;
  invoice_id: string | null;
  created_at: string;
  treatment_plan_items: PlanItem[];
}
interface Patient { id: number; name: string; phone: string | null }

const STATUS: Record<Status, { label: string; cls: string }> = {
  proposed: { label: "Proposed", cls: "bg-gold/15 text-[#8a6d12]" },
  accepted: { label: "Accepted", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In progress", cls: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-700" },
  declined: { label: "Declined", cls: "bg-red-100 text-red-700" },
};


const emptyItem = (): PlanItem => ({ tooth: "", procedure: "", fee: 0, done: false });
const planTotal = (p: { treatment_plan_items: PlanItem[]; discount: number }) =>
  Math.max(0, p.treatment_plan_items.reduce((s, i) => s + (Number(i.fee) || 0), 0) - (Number(p.discount) || 0));

export default function TreatmentPlans() {
  const router = useRouter();
  const { clinicId, clinicName } = useClinic();
  const { symbol } = useCurrency();
  const money = (n: number) => `${symbol} ${Math.round(n).toLocaleString()}`;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ patient_id: "", doctor_name: "", title: "", discount: "", notes: "" });
  const [items, setItems] = useState<PlanItem[]>([emptyItem()]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: plansData, error: plansErr }, { data: pts }, { data: docs }] = await Promise.all([
      supabase.from("treatment_plans").select("*, treatment_plan_items(*)").order("created_at", { ascending: false }),
      supabase.from("patients").select("id, name, phone").order("name"),
      supabase.from("doctors").select("name").eq("status", "Active"),
    ]);
    if (plansErr) setError("Could not load treatment plans. Has supabase_clinic_features.sql been run?");
    else {
      setError("");
      setPlans((plansData as Plan[]).map(p => ({
        ...p,
        treatment_plan_items: [...(p.treatment_plan_items || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      })));
    }
    if (pts) setPatients(pts as Patient[]);
    if (docs) setDoctors(docs.map(d => d.name as string));
    setLoading(false);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => { if (!user) router.push("/"); });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load, router]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ patient_id: "", doctor_name: "", title: "", discount: "", notes: "" });
    setItems([emptyItem()]);
  };

  const openEdit = (p: Plan) => {
    setEditingId(p.id);
    setForm({
      patient_id: p.patient_id ? String(p.patient_id) : "",
      doctor_name: p.doctor_name || "",
      title: p.title,
      discount: p.discount ? String(p.discount) : "",
      notes: p.notes || "",
    });
    setItems(p.treatment_plan_items.length ? p.treatment_plan_items.map(i => ({ ...i })) : [emptyItem()]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formItems = items.filter(i => i.procedure.trim());
  const formSubtotal = formItems.reduce((s, i) => s + (Number(i.fee) || 0), 0);
  const formTotal = Math.max(0, formSubtotal - (Number(form.discount) || 0));

  const savePlan = async () => {
    const patient = patients.find(p => String(p.id) === form.patient_id);
    if (!patient) { setError("Please select a patient."); return; }
    if (!formItems.length) { setError("Add at least one procedure."); return; }
    const invalid = firstError(
      readAmount(form.discount, "Discount").error,
      ...formItems.map(i => readAmount(i.fee, `Fee for ${i.procedure.trim()}`).error),
      (Number(form.discount) || 0) > formSubtotal && "Discount can't be more than the plan total.",
    );
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError("");
    const supabase = createClient();
    const row = {
      clinic_id: clinicId,
      patient_id: patient.id,
      patient_name: patient.name,
      doctor_name: form.doctor_name || null,
      title: form.title.trim() || formItems.map(i => i.procedure).slice(0, 2).join(" + "),
      discount: Number(form.discount) || 0,
      notes: form.notes.trim() || null,
    };
    let planId = editingId;
    if (editingId) {
      const { error: e } = await supabase.from("treatment_plans").update(row).eq("id", editingId);
      if (e) { setError(saveErrorMessage(e, "treatment plan")); setBusy(false); return; }
      const { error: delErr } = await supabase.from("treatment_plan_items").delete().eq("plan_id", editingId);
      if (delErr) { setError(saveErrorMessage(delErr, "treatment plan")); setBusy(false); return; }
    } else {
      const { data, error: e } = await supabase.from("treatment_plans").insert([row]).select("id").single();
      if (e || !data) { setError(saveErrorMessage(e || { message: "no record came back" }, "treatment plan")); setBusy(false); return; }
      planId = data.id;
    }
    const { error: itemsErr } = await supabase.from("treatment_plan_items").insert(
      formItems.map((i, idx) => ({
        plan_id: planId, clinic_id: clinicId, tooth: i.tooth.trim() || null,
        procedure: i.procedure.trim(), fee: Number(i.fee) || 0, done: i.done, position: idx,
      }))
    );
    if (itemsErr) { setError(saveErrorMessage(itemsErr, "treatment plan procedures")); setBusy(false); return; }
    setBusy(false);
    resetForm();
    load();
  };

  const setStatus = async (p: Plan, status: Status) => {
    setPlans(list => list.map(x => (x.id === p.id ? { ...x, status } : x)));
    const { error: e } = await createClient().from("treatment_plans").update({ status }).eq("id", p.id);
    if (e) { setError(saveErrorMessage(e, "plan status")); load(); }
  };

  const toggleItem = async (p: Plan, item: PlanItem) => {
    if (!item.id) return;
    const done = !item.done;
    const nextItems = p.treatment_plan_items.map(i => (i.id === item.id ? { ...i, done } : i));
    const allDone = nextItems.every(i => i.done);
    const status: Status = allDone ? "completed" : p.status === "proposed" || p.status === "accepted" || p.status === "completed" ? "in_progress" : p.status;
    setPlans(list => list.map(x => (x.id === p.id ? { ...x, status, treatment_plan_items: nextItems } : x)));
    const supabase = createClient();
    let { error: e } = await supabase.from("treatment_plan_items").update({ done }).eq("id", item.id);
    if (!e && status !== p.status) ({ error: e } = await supabase.from("treatment_plans").update({ status }).eq("id", p.id));
    // The list was updated optimistically: on failure say so and reload the real state
    if (e) { setError(saveErrorMessage(e, "procedure")); load(); }
  };

  const deletePlan = async (p: Plan) => {
    if (!confirm(`Delete the plan "${p.title}" for ${p.patient_name}?`)) return;
    setPlans(list => list.filter(x => x.id !== p.id));
    const { error: e } = await createClient().from("treatment_plans").delete().eq("id", p.id);
    if (e) { setError(saveErrorMessage(e, "treatment plan").replace("save", "delete")); load(); }
  };

  const createInvoice = async (p: Plan) => {
    if (!p.patient_id) { setError("This plan has no linked patient, so an invoice cannot be created."); return; }
    setBusy(true);
    setError("");
    const supabase = createClient();
    const subtotal = p.treatment_plan_items.reduce((s, i) => s + (Number(i.fee) || 0), 0);
    // VAT (when the clinic charges it) is added on top of the plan, at the invoice
    const vatRate = rateForNewInvoice(await loadVatConfig(supabase, clinicId));
    const t = invoiceTotals(subtotal, Number(p.discount) || 0, vatRate);
    const { data: invNum } = await supabase.rpc("generate_invoice_number", { p_clinic_id: clinicId });
    const { data: invoice, error: invErr } = await supabase.from("invoices").insert([{
      clinic_id: clinicId,
      patient_id: p.patient_id,
      invoice_number: invNum,
      status: "unpaid",
      subtotal,
      discount: Number(p.discount) || 0,
      total: t.total,
      ...(vatRate > 0 ? { vat_rate: vatRate, vat_amount: t.vat } : {}),
      amount_paid: 0,
      notes: `Treatment plan: ${p.title}`,
    }]).select().single();
    if (invErr || !invoice) { setError(invErr?.message || "Could not create the invoice."); setBusy(false); return; }
    const { error: itemsErr } = await supabase.from("invoice_items").insert(
      p.treatment_plan_items.map(i => ({
        invoice_id: invoice.id, clinic_id: clinicId,
        description: i.tooth ? `${i.procedure} (tooth ${i.tooth})` : i.procedure,
        quantity: 1, unit_price: Number(i.fee) || 0,
      }))
    );
    if (itemsErr) { setError(itemsErr.message); setBusy(false); return; }
    const { error: linkErr } = await supabase.from("treatment_plans").update({
      invoice_id: String(invoice.id),
      status: p.status === "proposed" ? "accepted" : p.status,
    }).eq("id", p.id);
    if (linkErr) alert(`Invoice ${invoice.invoice_number} was created, but ${saveErrorMessage(linkErr, "link to this plan").replace(/^C/, "c")}`);
    router.push(`/dashboard/billing/${invoice.id}`);
  };

  const estimateText = (p: Plan) => {
    const lines = p.treatment_plan_items.map((i, n) =>
      `${n + 1}. ${i.procedure}${i.tooth ? ` (tooth ${i.tooth})` : ""}: ${money(Number(i.fee) || 0)}`);
    return [
      `Assalam o Alaikum ${p.patient_name},`,
      `Here is your treatment estimate${clinicName ? ` from ${clinicName}` : ""}:`,
      "",
      `*${p.title}*`,
      ...lines,
      ...(Number(p.discount) ? [`Discount: -${money(Number(p.discount))}`] : []),
      `*Total: ${money(planTotal(p))}*`,
      "",
      "Please let us know if you have any questions.",
    ].join("\n");
  };

  const printPlan = (p: Plan) => {
    setExpanded(p.id);
    document.body.dataset.printPlan = p.id;
    setTimeout(() => {
      window.print();
      delete document.body.dataset.printPlan;
    }, 50);
  };

  const shown = useMemo(() => plans.filter(p => filter === "all" || p.status === filter), [plans, filter]);
  const phoneOf = (p: Plan) => patients.find(x => x.id === p.patient_id)?.phone;
  const inputCls = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-800 tracking-tight">Treatment Plans</h2>
            <p className="text-sm text-brand-500 mt-1">Multi-visit plans, estimates and progress</p>
          </div>
          <button onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "Close" : "New Plan"}
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {showForm && (
          <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
            <h3 className="text-sm font-semibold text-brand-800 mb-4">{editingId ? "Edit Treatment Plan" : "New Treatment Plan"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Patient *</span>
                <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} className={inputCls}>
                  <option value="">Select patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Doctor</span>
                <select value={form.doctor_name} onChange={e => setForm({ ...form, doctor_name: e.target.value })} className={inputCls}>
                  <option value="">Select doctor</option>
                  {doctors.map(d => <option key={d} value={d}>{doctorName(d)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Plan title</span>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Full mouth rehabilitation" className={inputCls} />
              </label>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">Procedures</p>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[70px_1fr_110px_32px] md:grid-cols-[90px_1fr_140px_36px] gap-2 items-center">
                  <input value={it.tooth} onChange={e => setItems(v => v.map((x, i) => (i === idx ? { ...x, tooth: e.target.value } : x)))}
                    placeholder="Tooth" aria-label="Tooth number" className={inputCls} />
                  <TreatmentSelect value={it.procedure} placeholder="Procedure"
                    onPick={(name, fee) => setItems(v => v.map((x, i) => (i === idx ? { ...x, procedure: name, fee: x.fee || fee } : x)))} />
                  <input type="number" min={0} value={it.fee || ""} onChange={e => setItems(v => v.map((x, i) => (i === idx ? { ...x, fee: Number(e.target.value) } : x)))}
                    placeholder="Fee" aria-label="Fee" className={inputCls} />
                  <button type="button" onClick={() => setItems(v => (v.length > 1 ? v.filter((_, i) => i !== idx) : [emptyItem()]))}
                    aria-label="Remove procedure" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems(v => [...v, emptyItem()])}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-gold">
              <Plus className="h-4 w-4" /> Add procedure
            </button>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">
              <label className="block">
                <span className="mb-1 block text-xs text-brand-600">Notes</span>
                <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Sequence, alternatives, things the patient should know" className={`${inputCls} resize-none`} />
              </label>
              <div className="rounded-xl bg-brand-50 p-4 text-sm">
                <div className="flex justify-between text-brand-600"><span>Subtotal</span><span>{money(formSubtotal)}</span></div>
                <label className="mt-2 flex items-center justify-between gap-3 text-brand-600">
                  <span>Discount</span>
                  <input type="number" min={0} value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })}
                    className="w-28 rounded-lg border border-brand-200 bg-white px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-gold/50" />
                </label>
                <div className="mt-3 flex justify-between border-t border-brand-200 pt-3 font-semibold text-brand-800"><span>Total</span><span>{money(formTotal)}</span></div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={savePlan} disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {busy ? "Saving…" : editingId ? "Save changes" : "Save plan"}
              </button>
              <button onClick={resetForm} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "proposed", "accepted", "in_progress", "completed", "declined"] as const).map(k => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === k ? "bg-brand-700 text-white" : "border border-brand-200 bg-white text-brand-700 hover:border-gold"}`}>
              {k === "all" ? `All (${plans.length})` : `${STATUS[k].label} (${plans.filter(p => p.status === k).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-brand-400">Loading treatment plans…</p>
        ) : shown.length === 0 ? (
          <div className="rounded-xl border border-brand-100 bg-white">
            <EmptyState icon={ClipboardList} title={plans.length ? "No plans with this status" : "No treatment plans yet"}
              hint={plans.length ? "Try another filter." : "Create a plan to give patients a clear estimate and track multi-visit work."} />
          </div>
        ) : (
          <div className="stagger space-y-3">
            {shown.map(p => {
              const doneCount = p.treatment_plan_items.filter(i => i.done).length;
              const pct = p.treatment_plan_items.length ? Math.round((doneCount / p.treatment_plan_items.length) * 100) : 0;
              const open = expanded === p.id;
              return (
                <article key={p.id} data-plan={p.id} className="plan-card bg-white rounded-xl border border-brand-100 overflow-hidden">
                  <button onClick={() => setExpanded(open ? null : p.id)} aria-expanded={open}
                    className="no-print flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left md:p-5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brand-800">{p.title}</p>
                      <p className="text-xs text-brand-500">{p.patient_name}{p.doctor_name ? ` · ${doctorName(p.doctor_name)}` : ""} · {formatDate(p.created_at)}</p>
                    </div>
                    <div className="w-32">
                      <div className="h-1.5 overflow-hidden rounded-full bg-brand-100">
                        <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-brand-500">{doneCount}/{p.treatment_plan_items.length} done</p>
                    </div>
                    <p className="w-28 text-right font-semibold text-brand-800">{money(planTotal(p))}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                    <ChevronDown className={`h-4 w-4 text-brand-400 transition-transform duration-500 ${open ? "rotate-180" : ""}`} />
                  </button>

                  {open && (
                    <div className="animate-fade-in border-t border-brand-100 p-4 md:p-5">
                      <div className="print-only mb-4">
                        <h1 className="text-2xl font-semibold">{clinicName || "Dental Clinic"}</h1>
                        <p className="text-sm">Treatment estimate for {p.patient_name}{p.doctor_name ? ` · ${doctorName(p.doctor_name)}` : ""} · {formatDate(new Date())}</p>
                        <h2 className="mt-3 text-lg font-semibold">{p.title}</h2>
                      </div>
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-brand-500">
                            <th className="no-print w-10 pb-2"></th>
                            <th className="pb-2">Tooth</th>
                            <th className="pb-2">Procedure</th>
                            <th className="pb-2 text-right">Fee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.treatment_plan_items.map(i => (
                            <tr key={i.id} className="border-t border-brand-100">
                              <td className="no-print py-2">
                                <button onClick={() => toggleItem(p, i)} aria-label={i.done ? "Mark as not done" : "Mark as done"}
                                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${i.done ? "border-green-500 bg-green-500 text-white" : "border-brand-200 text-transparent hover:border-gold"}`}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              </td>
                              <td className="py-2 text-brand-600">{i.tooth || "—"}</td>
                              <td className={`py-2 ${i.done ? "text-brand-400 line-through" : "text-brand-800"}`}>{i.procedure}</td>
                              <td className="py-2 text-right text-brand-800">{money(Number(i.fee) || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          {Number(p.discount) > 0 && (
                            <tr className="border-t border-brand-100 text-brand-600"><td className="no-print"></td><td colSpan={2} className="py-2">Discount</td><td className="py-2 text-right">− {money(Number(p.discount))}</td></tr>
                          )}
                          <tr className="border-t-2 border-brand-200 font-semibold text-brand-800"><td className="no-print"></td><td colSpan={2} className="py-2">Total</td><td className="py-2 text-right">{money(planTotal(p))}</td></tr>
                        </tfoot>
                      </table>
                      </div>
                      {p.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-brand-50 p-3 text-sm text-brand-600">{p.notes}</p>}

                      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
                        <select value={p.status} onChange={e => setStatus(p, e.target.value as Status)} aria-label="Plan status"
                          className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-xs text-brand-700 focus:outline-none focus:ring-2 focus:ring-gold/50">
                          {(Object.keys(STATUS) as Status[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                        </select>
                        <a href={waLink(phoneOf(p), estimateText(p))} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                          <MessageCircle className="h-3.5 w-3.5" /> Send estimate
                        </a>
                        <button onClick={() => printPlan(p)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                          <Printer className="h-3.5 w-3.5" /> Print
                        </button>
                        {p.invoice_id ? (
                          <button onClick={() => router.push(`/dashboard/billing/${p.invoice_id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                            <FileText className="h-3.5 w-3.5" /> View invoice
                          </button>
                        ) : (
                          <button onClick={() => createInvoice(p)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                            <FileText className="h-3.5 w-3.5" /> Create invoice
                          </button>
                        )}
                        <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => deletePlan(p)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
