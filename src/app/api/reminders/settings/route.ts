import { NextResponse } from "next/server";
import { clinicOwner, staffContext } from "@/lib/serverUser";
import { loadSettings } from "@/lib/reminders/engine";
import { validTimeZone } from "@/lib/reminders/schedule";
import { describeConnection } from "@/lib/reminders/whatsapp";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const int = (v: unknown, min: number, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };
const tplName = (v: unknown) => { const s = typeof v === "string" ? v.trim() : ""; return s === "" ? null : /^[a-z0-9_]{1,200}$/.test(s) ? s : undefined; };

export async function GET() {
  const s = await staffContext();
  if (!s) return fail("Not signed in.", 401);
  return NextResponse.json({ settings: await loadSettings(s.db, s.clinicId), whatsapp: s.owner ? await describeConnection(s.db, s.clinicId) : null, owner: s.owner });
}

export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can change reminder settings.", 403);
  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object") return fail("Invalid request.");
  const tz = typeof b.timezone === "string" ? b.timezone : "";
  if (!validTimeZone(tz)) return fail("Choose a valid time zone.");
  const hhmm = typeof b.day_before_time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(b.day_before_time) ? b.day_before_time : null;
  if (!hhmm) return fail("Enter the day-before time as HH:MM (24-hour).");
  const sameDay = int(b.same_day_hours, 1, 12), noshow = int(b.noshow_delay_hours, 1, 72), review = int(b.review_delay_hours, 1, 72);
  if (!sameDay || !noshow || !review) return fail("Check the hours: same-day 1-12, follow-up and review 1-72.");
  let url: string | null = typeof b.google_review_url === "string" ? b.google_review_url.trim() : "";
  if (url) { try { const u = new URL(url); if (u.protocol !== "https:") throw new Error(); url = u.toString().slice(0, 500); } catch { return fail("The Google review link must be a full https:// address."); } } else url = null;
  const tpls = [tplName(b.tpl_reminder), tplName(b.tpl_noshow), tplName(b.tpl_review)];
  if (tpls.includes(undefined)) return fail("Template names use lowercase letters, numbers and underscores only.");
  const lang = typeof b.tpl_lang === "string" && /^[a-z]{2}(_[A-Z]{2})?$/.test(b.tpl_lang) ? b.tpl_lang : "en";
  const row = {
    clinic_id: o.clinicId, enabled: b.enabled === true, timezone: tz,
    day_before_on: b.day_before_on !== false, day_before_time: hhmm, same_day_on: b.same_day_on !== false, same_day_hours: sameDay,
    noshow_on: b.noshow_on !== false, noshow_delay_hours: noshow, review_on: b.review_on !== false, review_delay_hours: review,
    google_review_url: url, tpl_reminder: tpls[0], tpl_noshow: tpls[1], tpl_review: tpls[2], tpl_lang: lang, updated_at: new Date().toISOString(),
  };
  const { error } = await o.db.from("reminder_settings").upsert(row);
  if (error) return fail("Could not save. Please try again.", 500);
  return NextResponse.json({ success: true, settings: await loadSettings(o.db, o.clinicId) });
}
