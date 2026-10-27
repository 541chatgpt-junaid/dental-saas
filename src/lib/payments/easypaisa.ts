import { createCipheriv } from "node:crypto";
import type { Checkout, Order, ProviderConfig } from "./types";

// Easypaisa "Easypay" hosted checkout. The customer is redirected to Easypay
// with a signed request (query string AES-encrypted with the store's hash key).
// Easypay returns the customer to us, but we never trust that redirect: every
// payment is confirmed by asking Easypaisa's inquiry service directly.

const host = (cfg: ProviderConfig) =>
  process.env.EASYPAISA_BASE_URL || (cfg.environment === "live" ? "https://easypay.easypaisa.com.pk" : "https://easypaystg.easypaisa.com.pk");

export const easypayAmount = (n: number) => { const s = (Math.round(n * 100) / 100).toString(); return s.includes(".") ? s : `${s}.0`; };

/** AES-128-ECB (PKCS7) of the alphabetically ordered "key=value&…" string, base64 */
export function easypayHash(hashKey: string, params: Record<string, string>) {
  const text = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const c = createCipheriv("aes-128-ecb", Buffer.from(hashKey, "utf8"), null);
  return Buffer.concat([c.update(text, "utf8"), c.final()]).toString("base64");
}

// yyyyMMdd HHmmss in Pakistan time, one hour ahead, as Easypay expects ("20301231 235959")
const expiry = () => { const d = new Date(Date.now() + 5 * 3600_000 + 3600_000).toISOString().replace(/\D/g, "").slice(0, 14); return `${d.slice(0, 8)} ${d.slice(8)}`; };

export function easypayStart(cfg: ProviderConfig, o: Order): Checkout {
  const params: Record<string, string> = {
    amount: easypayAmount(o.amount), autoRedirect: "1", expiryDate: expiry(), orderRefNum: o.ref,
    paymentMethod: "InitialRequest", postBackURL: o.returnUrl, storeId: cfg.values.store_id,
  };
  const q = new URLSearchParams({ ...params, merchantHashedReq: easypayHash(cfg.values.hash_key, params) });
  return { kind: "redirect", url: `${host(cfg)}/easypay/Index.jsf?${q.toString()}` };
}

/** The form the browser posts to Easypay to finish a payment (carries the auth token Easypay gave us) */
export function easypayConfirmForm(cfg: ProviderConfig, authToken: string, postBackUrl: string) {
  return { action: `${host(cfg)}/easypay/Confirm.jsf`, fields: { auth_token: authToken, postBackURL: postBackUrl, storeId: cfg.values.store_id } };
}

export interface EasypayResult { paid: boolean; amount: number; providerRef: string; status: string }

/** Ask Easypaisa whether this order was paid. The amount comes from Easypaisa, never from the redirect. */
export async function easypayInquire(cfg: ProviderConfig, orderRef: string): Promise<EasypayResult | null> {
  const res = await fetch(`${host(cfg)}/easypay-service/rest/v4/inquire-transaction`, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Credentials: Buffer.from(`${cfg.values.username}:${cfg.values.password}`).toString("base64") },
    body: JSON.stringify({ orderId: orderRef, storeId: cfg.values.store_id, accountNum: cfg.values.account_num }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j) return null;
  const status = String(j.transactionStatus || "").toUpperCase();
  return { paid: status === "PAID", amount: Number(j.transactionAmount ?? 0), providerRef: String(j.transactionId || orderRef), status };
}
