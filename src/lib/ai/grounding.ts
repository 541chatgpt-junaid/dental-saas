// Checks that AI output stays inside the record. The model is told to use only the
// facts it is given; these checks do not take its word for it.

/** Lower-case letters and digits only, single spaces: so quotes compare regardless of punctuation or case */
export const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** True when `quote` really appears in `source` (ignoring case and punctuation) */
export function quoteFound(quote: string, source: string): boolean {
  const q = norm(quote);
  return q.length >= 3 && norm(source).includes(q);
}

const digitsOf = (s: string) => new Set((s.match(/\d+/g) || []).map(d => d.replace(/^0+(?=\d)/, "")));

/**
 * Numbers (dates, times, amounts, phone numbers) and links in `text` that are not in `allowed`.
 * An empty list means every figure and link in the text came from the record.
 */
export function ungrounded(text: string, allowed: string): string[] {
  const ok = digitsOf(allowed);
  const out: string[] = [];
  for (const m of text.match(/\d+/g) || []) {
    const d = m.replace(/^0+(?=\d)/, "");
    if (!ok.has(d)) out.push(m);
  }
  for (const u of text.match(/https?:\/\/[^\s)]+/g) || []) if (!allowed.includes(u.replace(/[.,;]+$/, ""))) out.push(u);
  return [...new Set(out)];
}

/** FDI tooth numbers (two-digit notation, permanent and primary teeth) */
export const validTooth = (n: string) => /^(1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])$/.test(n);
