/** Trims a value from a public form and caps its length. Returns "" for non-strings. */
export function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
