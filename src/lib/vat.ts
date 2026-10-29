// Value-added tax on invoices (Gulf: 5% is the UAE and Saudi standard rate).
//
//   taxable = items - discount
//   VAT     = taxable x rate / 100, rounded to 2 decimals
//   total   = taxable + VAT
//
// Worked in whole cents so a sum never drifts by a fraction. The rate is stored
// ON the invoice when it is made, so a later change of the clinic's rate never
// alters an invoice that was already issued. Amounts stay in the clinic's own
// currency: no exchange rate is ever involved.

export const DEFAULT_VAT_RATE = 5;

/** Round to 2 decimals (whole cents), the precision of every supported currency */
export const round2 = (n: number) => Math.round((Number(n) || 0) * 100 + (n < 0 ? -1e-9 : 1e-9)) / 100;

export function vatOf(taxable: number, ratePercent: number): number {
  const rate = Number(ratePercent) || 0;
  if (rate <= 0 || taxable <= 0) return 0;
  return Math.round(Math.round(taxable * 100) * rate / 100) / 100;
}

export function invoiceTotals(subtotal: number, discount: number, ratePercent: number) {
  const taxable = Math.max(0, round2(subtotal - (Number(discount) || 0)));
  const vat = vatOf(taxable, ratePercent);
  return { subtotal: round2(subtotal), discount: round2(Number(discount) || 0), taxable, vat, total: round2(taxable + vat) };
}

export interface VatConfig { enabled: boolean; rate: number; trn: string }
export const NO_VAT: VatConfig = { enabled: false, rate: DEFAULT_VAT_RATE, trn: "" };

/** A clinic's VAT configuration out of its settings row (a row from before the VAT migration reads as "off") */
export function vatConfigOf(row: { vat_enabled?: boolean | null; vat_rate?: number | string | null; vat_trn?: string | null } | null | undefined): VatConfig {
  const rate = Number(row?.vat_rate);
  return {
    enabled: row?.vat_enabled === true,
    rate: Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : DEFAULT_VAT_RATE,
    trn: (row?.vat_trn || "").trim(),
  };
}

/** The rate a NEW invoice should carry: the clinic's rate when VAT is on, otherwise 0 */
export const rateForNewInvoice = (c: VatConfig) => (c.enabled ? c.rate : 0);

/** Optional registration number: letters, digits, spaces, dashes and slashes, up to 30 characters */
export function validTrn(v: string): boolean {
  return v === "" || /^[A-Za-z0-9][A-Za-z0-9 \-/]{3,29}$/.test(v);
}

/** An amount for display. With VAT in play every figure on the invoice shows 2 decimals, so lines add up to the total on sight. */
export const fmtMoney = (n: number, withDecimals = false) =>
  (Number(n) || 0).toLocaleString(undefined, withDecimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 });
