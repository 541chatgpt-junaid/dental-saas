// Pure scheduling rules for reminders, no-show follow-ups and review requests.
// Appointment date/time are the clinic's wall clock ("2026-10-28", "14:30"), so
// every moment below is worked out in the clinic's own time zone.

export type Kind = "reminder_day_before" | "reminder_same_day" | "noshow_followup" | "review_request";

export interface Settings {
  enabled: boolean; timezone: string;
  day_before_on: boolean; day_before_time: string;
  same_day_on: boolean; same_day_hours: number;
  noshow_on: boolean; noshow_delay_hours: number;
  review_on: boolean; review_delay_hours: number;
  google_review_url: string | null;
  tpl_reminder: string | null; tpl_noshow: string | null; tpl_review: string | null; tpl_lang: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: false, timezone: "Asia/Karachi",
  day_before_on: true, day_before_time: "18:00", same_day_on: true, same_day_hours: 2,
  noshow_on: true, noshow_delay_hours: 2, review_on: true, review_delay_hours: 2,
  google_review_url: null, tpl_reminder: null, tpl_noshow: null, tpl_review: null, tpl_lang: "en",
};

const HOUR = 3_600_000;
/** Newer appointments only: turning the feature on never messages about old visits */
export const LOOKBACK_MS = 3 * 24 * HOUR;
/** Do not send a reminder this close to (or after) the appointment */
export const TOO_LATE_MS = 30 * 60_000;
/** Ask the same patient for a review at most this often */
export const REVIEW_COOLDOWN_MS = 30 * 24 * HOUR;

export function validTimeZone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

/** Minutes the zone is ahead of UTC at this instant */
function offsetMinutes(at: number, tz: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(at)).map(p => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - (at - (at % 1000))) / 60000);
}

/** The instant a wall-clock date + "HH:MM" happens in `tz` */
export function zonedInstant(date: string, time: string, tz: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || ""); const t = /^(\d{2}):(\d{2})/.exec(time || "");
  if (!d) return null;
  const wall = Date.UTC(+d[1], +d[2] - 1, +d[3], t ? +t[1] : 23, t ? +t[2] : 59);
  let guess = wall - offsetMinutes(wall, tz) * 60000;
  guess = wall - offsetMinutes(guess, tz) * 60000;
  return guess;
}

/** The clinic's calendar date ("YYYY-MM-DD") at this instant */
export function localDate(at: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export interface Appt { id: number; date: string; time: string; status: string }

/** The messages an appointment should get, and when each is due. */
export function plan(a: Appt, s: Settings, now: number): { kind: Kind; due: number }[] {
  const start = zonedInstant(a.date, a.time, s.timezone);
  if (start === null) return [];
  const out: { kind: Kind; due: number }[] = [];
  if (a.status === "Scheduled" && start > now) {
    const sameDay = start - s.same_day_hours * HOUR;
    if (s.same_day_on) out.push({ kind: "reminder_same_day", due: sameDay });
    if (s.day_before_on) {
      const due = zonedInstant(addDays(a.date, -1), s.day_before_time, s.timezone);
      if (due !== null) out.push({ kind: "reminder_day_before", due });
    }
  }
  if ((a.status === "Scheduled" || a.status === "No-show") && start < now && now - start < LOOKBACK_MS && s.noshow_on) out.push({ kind: "noshow_followup", due: start + s.noshow_delay_hours * HOUR });
  if (a.status === "Completed" && now - start < LOOKBACK_MS && s.review_on) out.push({ kind: "review_request", due: start + s.review_delay_hours * HOUR });
  return out;
}

export const slotOf = (a: { date: string; time: string }) => `${a.date} ${a.time || ""}`.trim();
