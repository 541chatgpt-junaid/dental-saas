import { formatDate } from "@/lib/dateFormat";
import type { Kind, Settings } from "./schedule";

// The wording of each message. It only ever states what is true of that
// appointment: a no-show is never asked for a review, and a review request never
// mentions anything but the visit.

export interface Ctx { name: string; clinic: string; clinicPhone: string | null; date: string; time: string; doctor: string | null; reviewUrl: string | null; rebookUrl: string | null; optOutUrl: string }

const tail = (c: Ctx) => `To stop these messages: ${c.optOutUrl}`;

export function messageBody(kind: Kind, c: Ctx): string {
  const when = `${formatDate(c.date, { weekday: true })}${c.time ? ` at ${c.time}` : ""}`;
  switch (kind) {
    case "reminder_day_before":
    case "reminder_same_day":
      return `Assalam o Alaikum ${c.name}, this is a reminder of your appointment at ${c.clinic} on ${when}${c.doctor ? ` with ${c.doctor}` : ""}. ${tail(c)}`;
    case "noshow_followup":
      return `Assalam o Alaikum ${c.name}, we missed you at ${c.clinic} on ${formatDate(c.date)}. Let's find you a new time: ${c.rebookUrl || (c.clinicPhone ? `please call us on ${c.clinicPhone}` : "please contact the clinic")}. ${tail(c)}`;
    case "review_request":
      return `Assalam o Alaikum ${c.name}, thank you for visiting ${c.clinic}. If you were happy with your care, would you share a short Google review? ${c.reviewUrl} ${tail(c)}`;
  }
}

/** WhatsApp template parameters, in the order the clinic's template placeholders use */
export function templateParams(kind: Kind, c: Ctx): string[] {
  switch (kind) {
    case "reminder_day_before":
    case "reminder_same_day": return [c.name, c.clinic, formatDate(c.date, { weekday: true }), c.time || "", c.optOutUrl];
    case "noshow_followup": return [c.name, c.clinic, c.rebookUrl || c.clinicPhone || c.clinic, c.optOutUrl];
    case "review_request": return [c.name, c.clinic, c.reviewUrl || "", c.optOutUrl];
  }
}

export function templateName(kind: Kind, s: Settings): string | null {
  const n = kind === "noshow_followup" ? s.tpl_noshow : kind === "review_request" ? s.tpl_review : s.tpl_reminder;
  return n || null;
}
