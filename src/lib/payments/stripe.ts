import { createHmac, timingSafeEqual } from "node:crypto";
import type { Checkout, Order, ProviderConfig } from "./types";

// Stripe Checkout (hosted page). The customer pays on Stripe; we learn about it
// from a signed webhook, and can also ask Stripe directly when they return.

const base = () => process.env.STRIPE_API_BASE || "https://api.stripe.com";
const minor = (amount: number) => Math.round(amount * 100); // all currencies the app supports have 2 decimals

async function api(cfg: ProviderConfig, path: string, init: RequestInit = {}) {
  const res = await fetch(base() + path, {
    ...init,
    headers: { Authorization: `Bearer ${cfg.values.secret_key}`, ...(init.headers || {}) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

export async function stripeStart(cfg: ProviderConfig, o: Order): Promise<Checkout & { providerRef: string }> {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("client_reference_id", o.ref);
  body.set("success_url", `${o.returnUrl}${o.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", o.cancelUrl);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", o.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(minor(o.amount)));
  body.set("line_items[0][price_data][product_data][name]", o.description);
  body.set("metadata[ref]", o.ref);
  body.set("payment_intent_data[metadata][ref]", o.ref);
  const s = await api(cfg, "/v1/checkout/sessions", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!s.url || !s.id) throw new Error("Stripe did not return a payment page.");
  return { kind: "redirect", url: s.url, providerRef: s.id };
}

export interface StripeResult { paid: boolean; ref: string | null; sessionId: string; amount: number; currency: string; paymentIntent: string | null }

const fromSession = (s: Record<string, unknown>): StripeResult => ({
  paid: s.payment_status === "paid",
  ref: (s.client_reference_id as string) || ((s.metadata as Record<string, string> | undefined)?.ref ?? null),
  sessionId: String(s.id),
  amount: Number(s.amount_total ?? 0) / 100,
  currency: String(s.currency || "").toUpperCase(),
  paymentIntent: (s.payment_intent as string) || null,
});

/** Ask Stripe about a session (used when the customer returns, in case the webhook is late) */
export async function stripeRetrieve(cfg: ProviderConfig, sessionId: string): Promise<StripeResult> {
  return fromSession(await api(cfg, `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`));
}

/** Check Stripe's signature header on a webhook body; returns the event or null */
export function stripeVerifyWebhook(cfg: ProviderConfig, rawBody: string, header: string | null, toleranceSec = 300): { type: string; data: { object: Record<string, unknown> } } | null {
  const secret = cfg.values.webhook_secret;
  if (!secret || !header) return null;
  const parts = Object.fromEntries(header.split(",").map(p => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; }));
  const t = Number(parts.t);
  const sigs = header.split(",").filter(p => p.startsWith("v1=")).map(p => p.slice(3));
  if (!Number.isFinite(t) || !sigs.length || Math.abs(Date.now() / 1000 - t) > toleranceSec) return null;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
  const ok = sigs.some(s => { const b = Buffer.from(s, "hex"); return b.length === expected.length && timingSafeEqual(b, expected); });
  if (!ok) return null;
  try { return JSON.parse(rawBody); } catch { return null; }
}

export const stripeFromEvent = (obj: Record<string, unknown>) => fromSession(obj);
