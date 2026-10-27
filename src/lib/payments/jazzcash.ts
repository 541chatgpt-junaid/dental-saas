import { createHmac, timingSafeEqual } from "node:crypto";
import type { Checkout, Order, ProviderConfig } from "./types";

// JazzCash hosted checkout (page redirection): we post a signed form to
// JazzCash, the customer pays there, and JazzCash posts a signed result back to
// our return URL. Amounts are in the smallest unit (paisa).

const host = (cfg: ProviderConfig) =>
  process.env.JAZZCASH_BASE_URL || (cfg.environment === "live" ? "https://payments.jazzcash.com.pk" : "https://sandbox.jazzcash.com.pk");
const PATH = "/CustomerPortal/transactionmanagement/merchantform/";

/** HMAC-SHA256 over "salt&value&value…" with the fields sorted by name, empty ones left out */
export function jazzHash(salt: string, fields: Record<string, string>) {
  const text = [salt, ...Object.keys(fields).filter(k => k !== "pp_SecureHash" && fields[k] !== "" && fields[k] != null).sort().map(k => fields[k])].join("&");
  return createHmac("sha256", salt).update(text).digest("hex").toUpperCase();
}

// Pakistan time (UTC+5, no daylight saving) in JazzCash's yyyyMMddHHmmss format
const stamp = (d: Date) => new Date(d.getTime() + 5 * 3600_000).toISOString().replace(/\D/g, "").slice(0, 14);

export function jazzStart(cfg: ProviderConfig, o: Order): Checkout {
  const now = new Date();
  const fields: Record<string, string> = {
    pp_Version: "1.1", pp_TxnType: "", pp_Language: "EN",
    pp_MerchantID: cfg.values.merchant_id, pp_SubMerchantID: "", pp_Password: cfg.values.password,
    pp_BankID: "TBANK", pp_ProductID: "RETL",
    pp_TxnRefNo: `T${o.ref}`, pp_Amount: String(Math.round(o.amount * 100)), pp_TxnCurrency: "PKR",
    pp_TxnDateTime: stamp(now), pp_BillReference: o.ref, pp_Description: o.description.slice(0, 100),
    pp_TxnExpiryDateTime: stamp(new Date(now.getTime() + 3600_000)), pp_ReturnURL: o.returnUrl,
    ppmpf_1: "", ppmpf_2: "", ppmpf_3: "", ppmpf_4: "", ppmpf_5: "",
  };
  fields.pp_SecureHash = jazzHash(cfg.values.integrity_salt, fields);
  return { kind: "form", action: host(cfg) + PATH, method: "POST", fields };
}

export interface JazzResult { ok: boolean; ref: string | null; amount: number; providerRef: string; code: string; message: string }

/** Verify the signed result JazzCash posts to our return URL */
export function jazzVerify(cfg: ProviderConfig, fields: Record<string, string>): JazzResult | null {
  const sent = (fields.pp_SecureHash || "").toUpperCase();
  const want = jazzHash(cfg.values.integrity_salt, fields);
  const a = Buffer.from(sent), b = Buffer.from(want);
  if (!sent || a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const txn = fields.pp_TxnRefNo || "";
  return {
    ok: fields.pp_ResponseCode === "000",
    ref: txn.startsWith("T") ? txn.slice(1) : null,
    amount: Number(fields.pp_Amount || 0) / 100,
    providerRef: fields.pp_RetreivalReferenceNo || fields.pp_TxnRefNo || "",
    code: fields.pp_ResponseCode || "", message: fields.pp_ResponseMessage || "",
  };
}
