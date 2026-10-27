import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by the public booking API routes (service-role client, server only).

export interface BookingSettings {
  clinic_id: string;
  slug: string;
  enabled: boolean;
  slot_minutes: number;
  open_time: string;
  close_time: string;
  working_days: string;
  days_ahead: number;
  note: string | null;
}
export interface BookingDoctor {
  name: string;
  specialization: string | null;
  timing_start: string | null;
  timing_end: string | null;
  working_days: string | null;
}
export interface BookingContext {
  settings: BookingSettings;
  clinic: { name: string; phone: string | null; address: string | null };
  doctors: BookingDoctor[];
}

import { WEEKDAYS, opensOn, worksOn } from "@/lib/weekdays";
export { WEEKDAYS };

const toMin = (t: string | null | undefined) => {
  const [h, m] = (t || "").split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
};
const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

export const isISODate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const weekdayOf = (iso: string) => WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];

export async function loadBookingContext(admin: SupabaseClient, slug: string): Promise<BookingContext | null> {
  const { data: settings } = await admin.from("booking_settings").select("*").eq("slug", slug.toLowerCase()).maybeSingle();
  if (!settings || !settings.enabled) return null;
  const [{ data: clinic }, { data: doctors }] = await Promise.all([
    admin.from("clinics").select("name, phone, address, is_active").eq("id", settings.clinic_id).maybeSingle(),
    admin.from("doctors").select("name, specialization, timing_start, timing_end, working_days")
      .eq("clinic_id", settings.clinic_id).eq("status", "Active").order("name"),
  ]);
  if (!clinic || clinic.is_active === false) return null;
  return {
    settings: settings as BookingSettings,
    clinic: { name: clinic.name, phone: clinic.phone, address: clinic.address },
    doctors: (doctors || []) as BookingDoctor[],
  };
}

/** Booking window in days, with a day of slack either side so the patient's time zone can't lock them out */
export function dateInWindow(ctx: BookingContext, iso: string) {
  const day = Date.parse(`${iso}T00:00:00Z`);
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return day >= today - 86400000 && day <= today + (ctx.settings.days_ahead + 1) * 86400000;
}

/** Doctors who work on this date (all doctors if their working days aren't set) */
function doctorsOn(ctx: BookingContext, iso: string) {
  const wd = weekdayOf(iso);
  return ctx.doctors.filter(d => worksOn(d.working_days, wd));
}

function hoursFor(ctx: BookingContext, doctor?: BookingDoctor) {
  const open = toMin(doctor?.timing_start) ?? toMin(ctx.settings.open_time) ?? 600;
  const close = toMin(doctor?.timing_end) ?? toMin(ctx.settings.close_time) ?? 1200;
  return close > open ? [open, close] : [toMin(ctx.settings.open_time) ?? 600, toMin(ctx.settings.close_time) ?? 1200];
}

/**
 * Free start times on `date`, each with the doctor it would be booked with.
 * doctorName "" = any available doctor. Appointments that aren't cancelled block their slot.
 */
export async function availableSlots(admin: SupabaseClient, ctx: BookingContext, date: string, doctorName: string) {
  const { settings } = ctx;
  if (!dateInWindow(ctx, date)) return [];
  if (!opensOn(settings.working_days, weekdayOf(date))) return [];

  const step = settings.slot_minutes;
  const { data: appts } = await admin.from("appointments").select("doctor_name, time, status")
    .eq("clinic_id", settings.clinic_id).eq("date", date);
  const taken = new Map<string, Set<number>>(); // doctor → busy slot starts
  (appts || []).filter(a => a.status !== "Cancelled").forEach(a => {
    const m = toMin(a.time);
    if (m === null) return;
    const k = norm(a.doctor_name);
    if (!taken.has(k)) taken.set(k, new Set());
    taken.get(k)!.add(Math.floor(m / step) * step);
  });

  const candidates = ctx.doctors.length
    ? doctorsOn(ctx, date).filter(d => !doctorName || norm(d.name) === norm(doctorName))
    : [undefined];
  const result = new Map<string, string>(); // time → doctor
  for (const doc of candidates) {
    const [open, close] = hoursFor(ctx, doc);
    const busy = taken.get(norm(doc?.name)) ?? new Set<number>();
    for (let m = Math.ceil(open / step) * step; m + step <= close; m += step) {
      const t = toTime(m);
      if (!busy.has(m) && !result.has(t)) result.set(t, doc?.name ?? "");
    }
  }
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, doctor]) => ({ time, doctor }));
}
