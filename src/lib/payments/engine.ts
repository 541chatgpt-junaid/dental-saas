import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ADVANCE_NOTE, applyLedger, syncInvoice, type LedgerInvoiceRow } from "@/lib/ledger";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { enabledProviders, loadProvider } from "./config";
import { stripeStart } from "./stripe";
import { jazzStart } from "./jazzcash";
import { easypayStart } from "./easypaisa";
import { PROVIDER_META, type Checkout, type Order, type ProviderId } from "./types";

// Online payments never keep a money record of their own. A payment_attempts
// row only tracks "someone started paying"; when a provider confirms, one row
// goes into the Step 1 ledger (payments) and the invoice is re-synced.
// Server only.

/** Service-role client for the payment routes (they authenticate by link token, signature or staff session themselves) */
export const serviceClient = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const METHOD_LABEL: Record<ProviderId, string> = { stripe: "Card (Stripe)", jazzcash: "JazzCash", easypaisa: "EasyPaisa" };

/** Public base URL of this app, for the links we hand to providers */
export function appOrigin(request: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function clinicCurrency(db: SupabaseClient, clinicId: string): Promise<string> {
  const { data } = await db.from("settings").select("currency").eq("clinic_id", clinicId).limit(1).maybeSingle();
  return (data?.currency as string) || DEFAULT_CURRENCY;
}

export interface Due {
  invoice: { id: string; clinic_id: string; patient_id: number | null; invoice_number: string | null; status: string | null; notes: string | null };
  total: number; paid: number; due: number;
  /** counted invoices, and the draft invoice that holds a not-yet-paid advance booking fee */
  payable: boolean;
  advance: boolean;
}

/** What is still owed on an invoice, worked out from its items and payments (never from stored totals) */
export async function invoiceDue(db: SupabaseClient, invoiceId: string): Promise<Due | null> {
  // "*" so the invoice's VAT rate is always included: what a patient is asked to pay must carry the VAT
  const [{ data: inv }, { data: items }, { data: pays }] = await Promise.all([
    db.from("invoices").select("*").eq("id", invoiceId).maybeSingle(),
    db.from("invoice_items").select("invoice_id, quantity, unit_price").eq("invoice_id", invoiceId),
    db.from("payments").select("invoice_id, amount, payment_date").eq("invoice_id", invoiceId),
  ]);
  if (!inv) return null;
  const [l] = applyLedger([inv as LedgerInvoiceRow], items || [], pays || []);
  const advance = String(inv.notes || "").startsWith(ADVANCE_NOTE);
  const draftAdvance = advance && String(inv.status || "").toLowerCase() === "draft";
  return {
    invoice: inv as Due["invoice"], total: l.total, paid: l.amount_paid, due: Math.max(0, l.balance),
    payable: (l.counted || draftAdvance) && l.total > 0, advance,
  };
}

const token = () => randomBytes(24).toString("base64url");

/** One shareable link per invoice: reuse the live one, otherwise make a new one */
export async function linkForInvoice(db: SupabaseClient, p: { clinicId: string; invoiceId: string; userId: string | null; hours?: number }) {
  const now = new Date().toISOString();
  const { data: live } = await db.from("payment_links").select("id, token, expires_at")
    .eq("invoice_id", p.invoiceId).eq("clinic_id", p.clinicId).eq("revoked", false).gt("expires_at", now).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (live) return live as { id: string; token: string; expires_at: string };
  const expires = new Date(Date.now() + (p.hours ?? 24 * 14) * 3600_000).toISOString();
  const { data, error } = await db.from("payment_links").insert([{ clinic_id: p.clinicId, invoice_id: p.invoiceId, token: token(), created_by: p.userId, expires_at: expires }]).select("id, token, expires_at").single();
  if (error || !data) throw new Error("Could not create the payment link.");
  return data as { id: string; token: string; expires_at: string };
}

export async function loadLink(db: SupabaseClient, tok: string) {
  const { data } = await db.from("payment_links").select("id, clinic_id, invoice_id, token, expires_at, revoked").eq("token", tok).maybeSingle();
  if (!data || data.revoked || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as { id: string; clinic_id: string; invoice_id: string; token: string; expires_at: string; revoked: boolean };
}

/** Create a pending attempt for what is owed right now and ask the provider for a checkout */
export async function startAttempt(db: SupabaseClient, p: {
  link: { id: string; clinic_id: string; invoice_id: string; token: string }; provider: ProviderId; origin: string;
}): Promise<{ error: string } | { attemptRef: string; checkout: Checkout }> {
  const due = await invoiceDue(db, p.link.invoice_id);
  if (!due || !due.payable) return { error: "This invoice cannot be paid online." };
  if (due.due <= 0) return { error: "This invoice is already paid." };
  const currency = await clinicCurrency(db, p.link.clinic_id);
  const meta = PROVIDER_META[p.provider];
  if (meta.currencies && !meta.currencies.includes(currency)) return { error: `${meta.label} is not available for ${currency}.` };
  if (!(await enabledProviders(db, p.link.clinic_id, currency)).includes(p.provider)) return { error: `${meta.label} is not available for this clinic.` };
  const prov = await loadProvider(db, p.link.clinic_id, p.provider);
  if (!prov) return { error: `${meta.label} is not available for this clinic.` };

  const ref = randomBytes(8).toString("hex");
  const { error: insErr } = await db.from("payment_attempts").insert([{
    ref, clinic_id: p.link.clinic_id, invoice_id: p.link.invoice_id, link_id: p.link.id, provider: p.provider, amount: due.due, currency, status: "pending",
  }]);
  if (insErr) return { error: "Could not start the payment. Please try again." };

  const { data: clinic } = await db.from("clinics").select("name").eq("id", p.link.clinic_id).maybeSingle();
  const what = due.advance ? "Advance booking fee" : `Invoice ${due.invoice.invoice_number ?? ""}`.trim();
  const order: Order = {
    ref, amount: due.due, currency, description: `${what}${clinic?.name ? ` · ${clinic.name}` : ""}`,
    returnUrl: "", cancelUrl: `${p.origin}/pay/${p.link.token}?cancelled=1`,
    webhookUrl: `${p.origin}/api/payments/webhook/stripe/${p.link.clinic_id}`,
  };
  try {
    if (p.provider === "stripe") {
      const s = await stripeStart(prov.config, { ...order, returnUrl: `${p.origin}/pay/${p.link.token}?ref=${ref}` });
      await db.from("payment_attempts").update({ provider_ref: s.providerRef }).eq("ref", ref);
      return { attemptRef: ref, checkout: s };
    }
    if (p.provider === "jazzcash") return { attemptRef: ref, checkout: jazzStart(prov.config, { ...order, returnUrl: `${p.origin}/api/payments/jazzcash/return/${p.link.clinic_id}` }) };
    return { attemptRef: ref, checkout: easypayStart(prov.config, { ...order, returnUrl: `${p.origin}/api/payments/easypaisa/return/${p.link.clinic_id}/${ref}` }) };
  } catch (e) {
    await db.from("payment_attempts").update({ status: "failed" }).eq("ref", ref);
    console.error(`${p.provider} checkout failed:`, e instanceof Error ? e.message : e);
    return { error: `Could not reach ${meta.label}. Please try again.` };
  }
}

export type SettleResult = { ok: true; alreadyPaid: boolean; invoiceId: string } | { ok: false; reason: "unknown_reference" | "wrong_provider" | "amount_mismatch" | "ledger_error" };

/**
 * A provider has confirmed this attempt. Record exactly one payment in the
 * ledger (idempotent: a second confirmation, or a replayed webhook, changes
 * nothing) and re-sync the invoice.
 */
export async function settleAttempt(db: SupabaseClient, ref: string, p: { provider: ProviderId; providerRef: string; amount: number; currency?: string | null; clinicId?: string }): Promise<SettleResult> {
  const { data: att } = await db.from("payment_attempts").select("id, ref, clinic_id, invoice_id, provider, amount, currency, status").eq("ref", ref).maybeSingle();
  if (!att || (p.clinicId && att.clinic_id !== p.clinicId)) return { ok: false, reason: "unknown_reference" };
  if (att.provider !== p.provider) return { ok: false, reason: "wrong_provider" };
  if (att.status === "paid") return { ok: true, alreadyPaid: true, invoiceId: att.invoice_id };
  // What the provider says was charged must be what we asked for
  if (Math.abs(Number(att.amount) - p.amount) > 0.009 || (p.currency && p.currency.toUpperCase() !== String(att.currency).toUpperCase())) {
    await db.from("payment_attempts").update({ status: "mismatch", provider_ref: p.providerRef }).eq("id", att.id);
    return { ok: false, reason: "amount_mismatch" };
  }
  // Only one caller wins the pending -> paid switch
  const { data: claimed } = await db.from("payment_attempts").update({ status: "paid", provider_ref: p.providerRef, completed_at: new Date().toISOString() })
    .eq("id", att.id).neq("status", "paid").select("id");
  if (!claimed?.length) return { ok: true, alreadyPaid: true, invoiceId: att.invoice_id };

  const { data: inv } = await db.from("invoices").select("id, clinic_id, patient_id, status, notes").eq("id", att.invoice_id).maybeSingle();
  if (!inv) { await db.from("payment_attempts").update({ status: "pending" }).eq("id", att.id); return { ok: false, reason: "ledger_error" }; }
  // An advance booking fee invoice stays hidden (draft) until it is actually paid
  if (String(inv.status || "").toLowerCase() === "draft" && String(inv.notes || "").startsWith(ADVANCE_NOTE)) {
    await db.from("invoices").update({ status: "unpaid" }).eq("id", inv.id);
  }
  const row = {
    invoice_id: inv.id, clinic_id: inv.clinic_id, patient_id: inv.patient_id, amount: att.amount, payment_method: METHOD_LABEL[p.provider],
    payment_date: new Date().toISOString(), notes: `Online payment · ${p.providerRef}`, source: "online", provider: p.provider, provider_ref: p.providerRef,
  };
  const { error } = await db.from("payments").insert([row]);
  if (error && error.code !== "23505") { // 23505 = this provider reference is already in the ledger
    await db.from("payment_attempts").update({ status: "pending" }).eq("id", att.id);
    console.error("Could not record online payment:", error.message);
    return { ok: false, reason: "ledger_error" };
  }
  await syncInvoice(db, inv.id);
  return { ok: true, alreadyPaid: false, invoiceId: inv.id };
}
