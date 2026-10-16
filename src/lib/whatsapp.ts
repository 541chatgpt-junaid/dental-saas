/** Normalises a phone number for wa.me links: "0300 1234567" → "923001234567". */
export function waNumber(phone: string | null | undefined): string {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^00/, "");
  return d.startsWith("0") ? `92${d.slice(1)}` : d;
}

/** wa.me link with a prefilled message; without a number WhatsApp lets the user pick the chat. */
export function waLink(phone: string | null | undefined, text: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}
