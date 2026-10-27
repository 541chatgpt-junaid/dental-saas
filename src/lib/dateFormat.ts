/**
 * The one date format for the whole app: "24 Oct 2026" (day, short month, year).
 * It is the format most screens already used, now shared so no screen formats
 * dates its own way. Date-only strings ("2026-10-24") are read as local dates, so
 * they never shift a day with the viewer's timezone.
 */
export function parseDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const d = typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? new Date(`${input}T00:00:00`)
    : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/** "24 Oct 2026"; with `weekday`, "Sat, 24 Oct 2026". Empty or invalid input gives "—". */
export function formatDate(input: string | number | Date | null | undefined, opts: { weekday?: boolean } = {}): string {
  const d = parseDate(input);
  if (!d) return "—";
  const core = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return opts.weekday ? `${d.toLocaleDateString("en-GB", { weekday: "short" })}, ${core}` : core;
}
