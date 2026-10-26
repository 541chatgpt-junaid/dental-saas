/**
 * Appointment status, with No-show derived the same way Step 2 derives payment
 * status: never a stored flag that can go stale. A confirmed (Scheduled)
 * appointment whose date+time has passed with no attendance (not marked
 * Completed, not Cancelled) shows as "No-show" automatically.
 *
 * The codebase had no existing "Missed" term, so the one term is "No-show".
 */
export const NO_SHOW = "No-show";

/** Local now, so "past" matches the clinic's wall clock */
export function isAppointmentPast(date: string, time: string, now: Date = new Date()): boolean {
  if (!date) return false;
  // An appointment with no time is treated as end-of-day for no-show purposes
  const t = /^\d{2}:\d{2}/.test(time || "") ? time.slice(0, 5) : "23:59";
  const when = new Date(`${date}T${t}:00`);
  return !isNaN(when.getTime()) && when.getTime() < now.getTime();
}

/** THE appointment status rule. Completed/Cancelled/Requested keep their stored
 *  value; a past unattended Scheduled becomes No-show. */
export function effectiveApptStatus(
  a: { status: string; date: string; time: string },
  now: Date = new Date(),
): string {
  if (a.status === "Scheduled" && isAppointmentPast(a.date, a.time, now)) return NO_SHOW;
  return a.status;
}
