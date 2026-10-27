/** Capitalise each word of a name: "ayesha MALIK" -> "Ayesha Malik" (also after - ' .) */
export function titleCase(name: string | null | undefined): string {
  return (name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-'’.])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * How every doctor is shown: "Dr. " prefix + capitalised name, whatever was typed.
 * "ayesha khan", "DR AYESHA KHAN" and "Dr. ayesha khan" all give "Dr. Ayesha Khan".
 * Empty input gives "" so callers can fall back ("Any doctor", "—").
 */
export function doctorName(name: string | null | undefined): string {
  const bare = (name ?? "").trim().replace(/^(dr|doctor)\b\.?\s*/i, "");
  const cased = titleCase(bare);
  return cased ? `Dr. ${cased}` : "";
}
