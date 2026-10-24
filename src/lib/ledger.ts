import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The billing ledger: every money figure in the app is derived from
 * invoices (+ their line items) and payments — never from the fee fields on
 * patients or visits.
 *
 *   total   = SUM(items.quantity × items.unit_price) − discount
 *   paid    = SUM(payments.amount)
 *   balance = total − paid
 *   state   = getInvoiceStatus(): Paid · Partial · Unpaid · Overdue (· Draft · Cancelled)
 *
 * Draft and cancelled invoices (and their payments) are left out of every total.
 * Payment status is never read from a stored column: every screen shows
 * getInvoiceStatus() / getPatientStatus().
 */

export const REGISTRATION_NOTE = "[Registration]";
export const VISIT_NOTE = "[Visit]";

export interface LedgerItemRow { invoice_id: string; quantity: number | null; unit_price: number | null }
export interface LedgerPaymentRow {
  id?: string;
  invoice_id: string;
  amount: number | null;
  payment_date: string | null;
  payment_method?: string | null;
  notes?: string | null;
}
export interface LedgerInvoiceRow {
  id: string;
  patient_id: number | null;
  visit_id?: number | null;
  status: string | null;
  subtotal?: number | null;
  discount?: number | null;
  total?: number | null;
  amount_paid?: number | null;
  balance?: number | null;
  created_at?: string;
  due_date?: string | null;
  notes?: string | null;
}

export type InvoiceStatus = "Paid" | "Partial" | "Unpaid" | "Overdue" | "Draft" | "Cancelled";
export type PatientStatus = "Paid" | "Partial" | "Unpaid" | "Overdue" | "—";

export type Ledgered<T> = T & {
  subtotal: number;
  total: number;
  amount_paid: number;
  balance: number;
  /** The stored lifecycle flag (draft / sent / cancelled …) — never shown as payment status */
  status: string;
  /** Payment status from getInvoiceStatus(); the only status screens may show */
  state: InvoiceStatus;
  /** false for draft / cancelled invoices, which no total or status count includes */
  counted: boolean;
};

export type PatientBilling = { totalBilled: number; totalPaid: number; outstanding: number; status: PatientStatus };
export const NO_BILLS: PatientBilling = { totalBilled: 0, totalPaid: 0, outstanding: 0, status: "—" };

const num = (v: unknown) => Number(v) || 0;
const isExcluded = (status: string | null | undefined) => {
  const s = (status || "").toLowerCase();
  return s === "draft" || s === "cancelled";
};

/** Start of today, local time: an invoice due today is not overdue yet */
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const isPastDue = (due: string | null | undefined, now = startOfToday()) => {
  if (!due) return false;
  const t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(due) ? `${due}T00:00:00` : due).getTime();
  return !isNaN(t) && t < now;
};

/**
 * THE invoice status rule. Every screen shows this; nothing else decides it.
 *   draft / cancelled           → Draft / Cancelled (left out of every count)
 *   balance ≤ 0 and total > 0   → Paid
 *   balance > 0, past due date  → Overdue
 *   paid > 0, balance > 0       → Partial
 *   nothing paid, not yet due   → Unpaid
 */
export function getInvoiceStatus(inv: { status?: string | null; total: number; paid: number; due_date?: string | null }): InvoiceStatus {
  const s = (inv.status || "").toLowerCase();
  if (s === "draft") return "Draft";
  if (s === "cancelled") return "Cancelled";
  const balance = inv.total - inv.paid;
  if (balance <= 0) return "Paid";
  if (isPastDue(inv.due_date)) return "Overdue";
  return inv.paid > 0 ? "Partial" : "Unpaid";
}

/**
 * THE patient status rule, from that patient's counted invoices:
 * none → "—" · any Overdue → Overdue · all Paid → Paid · something paid → Partial · else Unpaid.
 */
export function getPatientStatus(invoices: { state: InvoiceStatus; counted: boolean; amount_paid: number }[]): PatientStatus {
  const counted = invoices.filter(i => i.counted);
  if (!counted.length) return "—";
  if (counted.some(i => i.state === "Overdue")) return "Overdue";
  if (counted.every(i => i.state === "Paid")) return "Paid";
  if (counted.some(i => i.state === "Partial" || i.amount_paid > 0)) return "Partial";
  return "Unpaid";
}

/** Value kept in the invoices.status column for exports; derived from getInvoiceStatus(), never read back for display */
export function storedStatus(inv: { status?: string | null; total: number; paid: number; due_date?: string | null }) {
  const st = getInvoiceStatus(inv);
  if (st === "Paid") return "paid";
  if (st === "Partial" || (st === "Overdue" && inv.paid > 0)) return "partial";
  if (st === "Draft" || st === "Cancelled") return st.toLowerCase();
  return (inv.status || "").toLowerCase() === "sent" ? "sent" : "unpaid";
}

/** Recompute total / paid / balance / status of each invoice from its items and payments */
export function applyLedger<T extends LedgerInvoiceRow>(invoices: T[], items: LedgerItemRow[], payments: LedgerPaymentRow[]): Ledgered<T>[] {
  const itemSum: Record<string, { sum: number; n: number }> = {};
  items.forEach(i => {
    const k = String(i.invoice_id);
    (itemSum[k] ||= { sum: 0, n: 0 });
    itemSum[k].sum += num(i.quantity ?? 1) * num(i.unit_price);
    itemSum[k].n += 1;
  });
  const paidSum: Record<string, number> = {};
  payments.forEach(p => { const k = String(p.invoice_id); paidSum[k] = (paidSum[k] || 0) + num(p.amount); });

  return invoices.map(inv => {
    const k = String(inv.id);
    const it = itemSum[k];
    // Invoices always carry line items; the stored total is only a fallback for very old rows
    const subtotal = it ? it.sum : num(inv.subtotal ?? inv.total);
    const total = it ? Math.max(0, subtotal - num(inv.discount)) : num(inv.total);
    const paid = paidSum[k] || 0;
    return {
      ...inv, subtotal, total, amount_paid: paid, balance: total - paid, status: (inv.status || "").toLowerCase(),
      state: getInvoiceStatus({ status: inv.status, total, paid, due_date: inv.due_date }), counted: !isExcluded(inv.status),
    };
  });
}

/** Payments that count: those on invoices that are neither draft nor cancelled */
export function countedPayments<P extends LedgerPaymentRow, I extends Ledgered<LedgerInvoiceRow>>(payments: P[], invoices: I[]) {
  const byId = new Map(invoices.map(i => [String(i.id), i]));
  return payments
    .map(p => ({ ...p, invoice: byId.get(String(p.invoice_id)) }))
    .filter((p): p is P & { invoice: I } => !!p.invoice && p.invoice.counted);
}

export function billingOf(invoices: Ledgered<LedgerInvoiceRow>[]): PatientBilling {
  const counted = invoices.filter(i => i.counted);
  if (!counted.length) return NO_BILLS;
  const totalBilled = counted.reduce((s, i) => s + i.total, 0);
  const totalPaid = counted.reduce((s, i) => s + i.amount_paid, 0);
  const outstanding = counted.reduce((s, i) => s + Math.max(0, i.balance), 0);
  return { totalBilled, totalPaid, outstanding, status: getPatientStatus(counted) };
}

export function billingByPatient(invoices: Ledgered<LedgerInvoiceRow>[]): Record<number, PatientBilling> {
  const groups: Record<number, Ledgered<LedgerInvoiceRow>[]> = {};
  invoices.forEach(i => { if (i.patient_id != null) (groups[i.patient_id] ||= []).push(i); });
  return Object.fromEntries(Object.entries(groups).map(([pid, list]) => [pid, billingOf(list)]));
}

/** Sum of payments whose date falls in [start, end) */
export function sumPaymentsBetween(payments: LedgerPaymentRow[], start?: Date | null, end?: Date | null) {
  return payments.reduce((s, p) => {
    const t = p.payment_date ? new Date(p.payment_date).getTime() : NaN;
    if (start && !(t >= start.getTime())) return s;
    if (end && !(t < end.getTime())) return s;
    return s + num(p.amount);
  }, 0);
}

// ── Loading ─────────────────────────────────────────────────

const PAGE = 1000;

/** Supabase returns at most 1000 rows per request; read every page */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

async function byInvoiceIds<T>(supabase: SupabaseClient, table: string, cols: string, ids: string[]) {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    rows.push(...await fetchAll<T>((a, b) => supabase.from(table).select(cols).in("invoice_id", chunk).range(a, b) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>));
  }
  return rows;
}

export interface LoadedLedger<T extends LedgerInvoiceRow = LedgerInvoiceRow & Record<string, unknown>> {
  invoices: Ledgered<T>[];
  /** Every payment, with its invoice; `counted` ones are what totals use */
  payments: (LedgerPaymentRow & { invoice?: Ledgered<T> })[];
}

/**
 * Load invoices (optionally one patient's), their items and payments, and
 * apply the ledger rules. `select` is the invoice column list (embeds allowed).
 *
 * `clinicId` scopes every query to the caller's clinic in code as well, so
 * isolation never rests on RLS alone (defense in depth). Pass it from
 * ClinicContext on every screen.
 */
export async function loadLedger<T extends LedgerInvoiceRow = LedgerInvoiceRow & Record<string, unknown>>(
  supabase: SupabaseClient,
  opts: { patientId?: number; select?: string; clinicId?: string | null } = {},
): Promise<LoadedLedger<T>> {
  const select = opts.select || "*";
  const clinic = opts.clinicId ?? undefined;
  const invoices = await fetchAll<T>((a, b) => {
    let q = supabase.from("invoices").select(select);
    if (clinic) q = q.eq("clinic_id", clinic);
    if (opts.patientId != null) q = q.eq("patient_id", opts.patientId);
    return q.order("created_at", { ascending: false }).range(a, b) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
  });

  let items: LedgerItemRow[];
  let payments: LedgerPaymentRow[];
  if (opts.patientId != null) {
    const ids = invoices.map(i => String(i.id));
    [items, payments] = await Promise.all([
      byInvoiceIds<LedgerItemRow>(supabase, "invoice_items", "invoice_id, quantity, unit_price", ids),
      byInvoiceIds<LedgerPaymentRow>(supabase, "payments", "*", ids),
    ]);
  } else {
    [items, payments] = await Promise.all([
      fetchAll<LedgerItemRow>((a, b) => { let q = supabase.from("invoice_items").select("invoice_id, quantity, unit_price"); if (clinic) q = q.eq("clinic_id", clinic); return q.range(a, b); }),
      fetchAll<LedgerPaymentRow>((a, b) => { let q = supabase.from("payments").select("*"); if (clinic) q = q.eq("clinic_id", clinic); return q.range(a, b); }),
    ]);
  }
  payments.sort((x, y) => String(x.payment_date).localeCompare(String(y.payment_date)));

  const ledgered = applyLedger(invoices, items, payments);
  const byId = new Map(ledgered.map(i => [String(i.id), i]));
  return { invoices: ledgered, payments: payments.map(p => ({ ...p, invoice: byId.get(String(p.invoice_id)) })) };
}

// ── Writing ─────────────────────────────────────────────────

/** True when an error is only about a column a not-yet-run migration adds */
const missingColumn = (e: { message?: string } | null, col: string) => !!e && (e.message || "").includes(col);

/**
 * Store the derived total / amount_paid / status on the invoice row so older
 * screens and exports agree with the ledger. The ledger itself never trusts them.
 */
export async function syncInvoice(supabase: SupabaseClient, invoiceId: string) {
  const [{ data: inv }, { data: items }, { data: pays }] = await Promise.all([
    supabase.from("invoices").select("id, patient_id, status, subtotal, discount, total, due_date").eq("id", invoiceId).single(),
    supabase.from("invoice_items").select("invoice_id, quantity, unit_price").eq("invoice_id", invoiceId),
    supabase.from("payments").select("invoice_id, amount, payment_date").eq("invoice_id", invoiceId),
  ]);
  if (!inv) return;
  const [l] = applyLedger([inv as LedgerInvoiceRow], items || [], pays || []);
  // Screens never read these stored figures, so a failure here changes nothing shown; still say so
  const { error } = await supabase.from("invoices").update({
    subtotal: l.subtotal, total: l.total, amount_paid: l.amount_paid,
    status: storedStatus({ status: l.status, total: l.total, paid: l.amount_paid, due_date: l.due_date }),
  }).eq("id", invoiceId);
  if (error) console.warn(`Stored invoice figures not updated: ${error.message}`);
}

export async function recordPayment(supabase: SupabaseClient, p: {
  clinicId: string | null; invoiceId: string; patientId: number | null; amount: number;
  method?: string; date?: string; note?: string | null;
}) {
  const row = {
    invoice_id: p.invoiceId, clinic_id: p.clinicId, amount: p.amount,
    payment_method: p.method || "Cash", payment_date: p.date || new Date().toISOString(), notes: p.note || null,
  };
  let { error } = await supabase.from("payments").insert([{ ...row, patient_id: p.patientId }]);
  if (missingColumn(error, "patient_id")) ({ error } = await supabase.from("payments").insert([row]));
  if (error) return error.message;
  await syncInvoice(supabase, p.invoiceId);
  return null;
}

export async function createInvoice(supabase: SupabaseClient, p: {
  clinicId: string | null; patientId: number; visitId?: number | null; notes: string;
  items: { description: string; quantity: number; unit_price: number }[];
}) {
  const { data: invNum } = await supabase.rpc("generate_invoice_number", { p_clinic_id: p.clinicId });
  const subtotal = p.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const { data: invoice, error } = await supabase.from("invoices").insert([{
    clinic_id: p.clinicId, patient_id: p.patientId, visit_id: p.visitId ?? null, invoice_number: invNum,
    status: subtotal > 0 ? "unpaid" : "paid", subtotal, discount: 0, total: subtotal, amount_paid: 0, notes: p.notes,
  }]).select("id").single();
  if (error || !invoice) return { id: null, error: error?.message || "Could not create the invoice." };
  const { error: itemsErr } = await supabase.from("invoice_items").insert(
    p.items.map(i => ({ invoice_id: invoice.id, clinic_id: p.clinicId, ...i })),
  );
  if (itemsErr) return { id: invoice.id as string, error: itemsErr.message };
  return { id: invoice.id as string, error: null };
}

/** Set the single line item of a registration / visit invoice to a new amount; returns an error message or null */
export async function setSingleItem(supabase: SupabaseClient, clinicId: string | null, invoiceId: string, description: string, amount: number) {
  const { data: items, error: readErr } = await supabase.from("invoice_items").select("id").eq("invoice_id", invoiceId);
  if (readErr) return readErr.message;
  let error: { message: string } | null = null;
  if (items && items.length) {
    ({ error } = await supabase.from("invoice_items").update({ description, quantity: 1, unit_price: amount }).eq("id", items[0].id));
    if (!error && items.length > 1) ({ error } = await supabase.from("invoice_items").delete().in("id", items.slice(1).map(i => i.id)));
  } else {
    ({ error } = await supabase.from("invoice_items").insert([{ invoice_id: invoiceId, clinic_id: clinicId, description, quantity: 1, unit_price: amount }]));
  }
  if (error) return error.message;
  await syncInvoice(supabase, invoiceId);
  return null;
}

/** Mark a patient / visit row as already in the ledger so the one-time migration skips it */
export async function markMigrated(supabase: SupabaseClient, table: "patients" | "visits", id: number) {
  const { error } = await supabase.from(table).update({ ledger_migrated_at: new Date().toISOString() }).eq("id", id);
  if (error && !missingColumn(error, "ledger_migrated_at")) console.warn(error.message);
}

/**
 * Spread one payment over a patient's open invoices, oldest first, so
 * installments land as separate payment rows on the invoices they settle.
 */
export async function payPatientBalance(supabase: SupabaseClient, p: {
  clinicId: string | null; patientId: number; amount: number; method: string; note?: string | null;
}) {
  const { invoices } = await loadLedger(supabase, { patientId: p.patientId });
  const open = invoices.filter(i => i.counted && i.balance > 0)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const outstanding = open.reduce((s, i) => s + i.balance, 0);
  if (!open.length) return "This patient has no unpaid invoice.";
  if (p.amount > outstanding + 0.005) return `Amount is more than the balance due (${outstanding.toLocaleString()}).`;
  let left = p.amount;
  for (const inv of open) {
    if (left <= 0) break;
    const part = Math.min(left, inv.balance);
    const err = await recordPayment(supabase, { clinicId: p.clinicId, invoiceId: String(inv.id), patientId: p.patientId, amount: part, method: p.method, note: p.note });
    if (err) return err;
    left -= part;
  }
  return null;
}

/**
 * Which doctor a payment belongs to: the visit's doctor for visit invoices,
 * otherwise the doctor the patient is registered with.
 */
export function doctorResolver(
  visits: { id: number; doctor_name: string | null }[],
  patients: { id: number; doctor_name: string | null }[],
) {
  const visitDoc = new Map(visits.map(v => [Number(v.id), v.doctor_name || ""]));
  const patientDoc = new Map(patients.map(p => [Number(p.id), p.doctor_name || ""]));
  return (inv: { visit_id?: number | null; patient_id: number | null }) =>
    (inv.visit_id != null && visitDoc.get(Number(inv.visit_id))) || (inv.patient_id != null && patientDoc.get(Number(inv.patient_id))) || "";
}
