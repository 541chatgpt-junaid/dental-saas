/** Currency codes the app supports and the symbol shown for each (shared by screens and server code) */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "Rs", USD: "$", AED: "AED", GBP: "£",
  EUR: "€", SAR: "SAR", CAD: "CA$", AUD: "A$",
};

export const symbolFor = (code: string | null | undefined) => CURRENCY_SYMBOLS[code || ""] || code || "Rs";

/** Used on the server when a clinic has not chosen a currency (the app's home market) */
export const DEFAULT_CURRENCY = "PKR";
