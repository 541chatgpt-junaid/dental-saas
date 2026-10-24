/**
 * Shared rules for every form save, so no save can fail silently:
 *  - the main date of a record defaults to today (never sent as "")
 *  - optional dates are sent as null when left empty
 *  - amounts must be valid and not negative
 *  - a database error becomes a message that names the problem
 */

type DbError = { message?: string; code?: string; details?: string | null } | null | undefined;

/** Today as YYYY-MM-DD in the clinic's local time */
export const todayISO = () => new Date().toLocaleDateString("en-CA");

/** The record's main date: today when left empty */
export const dateOrToday = (d: string | null | undefined) => (d || "").trim() || todayISO();

/** An optional date: null when left empty (Postgres rejects "") */
export const dateOrNull = (d: string | null | undefined) => (d || "").trim() || null;

/**
 * Read a money / quantity field. Empty means 0; anything else must be a
 * non-negative number. Returns an error message naming the field otherwise.
 */
export function readAmount(raw: string | number | null | undefined, label: string, opts: { min?: number } = {}) {
  const text = String(raw ?? "").trim();
  if (!text) return { value: 0, error: (opts.min ?? 0) > 0 ? `${label} is required.` : null };
  const value = Number(text);
  if (!Number.isFinite(value)) return { value: 0, error: `${label} must be a number.` };
  if (value < 0) return { value, error: `${label} can't be negative.` };
  if (opts.min != null && value < opts.min) return { value, error: `${label} must be at least ${opts.min}.` };
  return { value, error: null };
}

/** The first error among several field checks, or null */
export const firstError = (...errors: (string | null | undefined | false)[]) => errors.find(Boolean) || null;

const column = (msg: string) => (msg.match(/column "([^"]+)"/) || msg.match(/'([^']+)' column/) || [])[1];
const pretty = (c: string) => c.replace(/_/g, " ");

/** Turn a Supabase / Postgres error into a message that says what went wrong */
export function saveErrorMessage(error: DbError, what: string) {
  if (!error) return "";
  const msg = error.message || "";
  const col = column(msg);
  const head = `Could not save the ${what}:`;
  switch (error.code) {
    case "22007":
    case "22008":
      return `${head} a date is not valid. Pick a date (or leave it empty for today).`;
    case "22P02":
      return `${head} a number field has an invalid value${col ? ` (${pretty(col)})` : ""}.`;
    case "23502":
      return `${head} ${col ? `"${pretty(col)}"` : "a required field"} is missing.`;
    case "23505":
      return `${head} a record with the same details already exists.`;
    case "23514":
      return `${head} a value is out of the allowed range (${msg.match(/constraint "([^"]+)"/)?.[1] || "check failed"}).`;
    case "23503":
      return `${head} it points to a record that no longer exists.`;
    case "42501":
      return `${head} your account is not allowed to change this clinic's data.`;
    case "PGRST204":
      return `${head} the database has no "${col ? pretty(col) : "required"}" column yet. Run the latest SQL file in Supabase.`;
  }
  if (/row-level security/i.test(msg)) return `${head} your account is not allowed to change this clinic's data.`;
  if (/failed to fetch|network/i.test(msg)) return `${head} no connection to the server. Check the internet and try again.`;
  return `${head} ${msg || "the server rejected it."}`;
}
