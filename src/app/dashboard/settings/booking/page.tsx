"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Globe, LoaderCircle, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { useClinic } from "@/lib/ClinicContext";
import { waLink } from "@/lib/whatsapp";
import { fullDayNames, worksOn } from "@/lib/weekdays";
import Link from "next/link";
import { useCurrency } from "@/lib/useCurrency";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export default function OnlineBookingSettings() {
  const router = useRouter();
  const { clinicId, clinicName } = useClinic();
  const { symbol } = useCurrency();
  const [loaded, setLoaded] = useState(false);
  const [exists, setExists] = useState(false);
  const [doctorDays, setDoctorDays] = useState<(string | null)[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [form, setForm] = useState({
    slug: "", enabled: true, slot_minutes: 30, open_time: "10:00", close_time: "20:00",
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], days_ahead: 14, note: "", advance_fee: "",
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once on mount
    setOrigin(window.location.origin);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => { if (!user) router.push("/"); });
  }, [router]);

  useEffect(() => {
    if (!clinicId) return;
    // Active doctors' working days, to warn about open days nobody is scheduled on
    createClient().from("doctors").select("working_days").eq("clinic_id", clinicId).eq("status", "Active")
      .then(({ data }) => setDoctorDays((data || []).map(d => d.working_days)));
    createClient().from("booking_settings").select("*").eq("clinic_id", clinicId).maybeSingle().then(({ data, error: e }) => {
      if (e) setError("Could not load booking settings. Has supabase_online_booking.sql been run?");
      if (data) {
        setExists(true);
        setForm({
          slug: data.slug, enabled: data.enabled, slot_minutes: data.slot_minutes, open_time: data.open_time, close_time: data.close_time,
          working_days: fullDayNames(String(data.working_days), DAYS),
          days_ahead: data.days_ahead, note: data.note || "", advance_fee: data.advance_fee ? String(Number(data.advance_fee)) : "",
        });
      } else if (clinicName) {
        setForm(f => ({ ...f, slug: slugify(clinicName) }));
      }
      setLoaded(true);
    });
  }, [clinicId, clinicName]);

  const save = async () => {
    const slug = slugify(form.slug);
    if (!SLUG_RE.test(slug)) { setError("The link name needs 3–40 letters, numbers or dashes."); return; }
    if (!form.working_days.length) { setError("Choose at least one working day."); return; }
    if (form.close_time <= form.open_time) { setError("Closing time must be after opening time."); return; }
    const fee = form.advance_fee.trim() === "" ? null : Number(form.advance_fee);
    if (fee !== null && (!Number.isFinite(fee) || fee < 0 || fee > 10_000_000)) { setError("Enter the advance booking fee as an amount of 0 or more, or leave it empty."); return; }
    setSaving(true);
    setError("");
    const { error: e } = await createClient().from("booking_settings").upsert({
      clinic_id: clinicId, slug, enabled: form.enabled, slot_minutes: form.slot_minutes,
      open_time: form.open_time, close_time: form.close_time,
      working_days: DAYS.filter(d => form.working_days.includes(d)).join(", "),
      days_ahead: form.days_ahead, note: form.note.trim() || null, advance_fee: fee && fee > 0 ? fee : null, updated_at: new Date().toISOString(),
    }, { onConflict: "clinic_id" });
    setSaving(false);
    if (e) {
      setError(e.code === "23505" || /duplicate|unique/i.test(e.message) ? "That link name is already used by another clinic. Please choose another." : e.message);
      return;
    }
    setForm(f => ({ ...f, slug }));
    setExists(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const unstaffed = doctorDays.length ? DAYS.filter(d => form.working_days.includes(d) && !doctorDays.some(w => worksOn(w, d))) : [];
  const link = `${origin}/book/${form.slug}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  const inputCls = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-brand-800 tracking-tight">Online Booking</h2>
          <p className="text-sm text-brand-500 mt-1">A public page where patients pick a time themselves. Requests appear in Appointments for you to confirm.</p>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {exists && form.enabled && (
          <div className="card-hover mb-6 rounded-xl border border-gold/40 bg-white p-4 md:p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">Your booking link</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{link}</code>
              <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-medium text-brand-700 hover:border-gold">
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2 text-xs font-medium text-brand-700 hover:border-gold">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
              <a href={waLink("", `Book your appointment at ${clinicName || "our clinic"} online: ${link}`)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-medium text-white hover:opacity-90">
                <MessageCircle className="h-3.5 w-3.5" /> Share
              </a>
            </div>
            <p className="mt-2 text-[11px] text-brand-500">Put it in your WhatsApp Business profile, Instagram bio, Google Maps listing or a QR code at reception.</p>
          </div>
        )}

        <div className="form-panel bg-white rounded-xl border border-brand-100 p-4 md:p-6">
          {!loaded ? (
            <p className="flex items-center gap-2 py-8 text-sm text-brand-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : (
            <>
              <label className="mb-5 flex items-center gap-3">
                <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 accent-gold" />
                <span className="text-sm font-medium text-brand-800">Accept online bookings</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs text-brand-600">Link name</span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-brand-200 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/50">
                    <span className="hidden bg-brand-50 px-3 py-2 text-sm text-brand-500 sm:block"><Globe className="mr-1 inline h-3.5 w-3.5" />{origin.replace(/^https?:\/\//, "")}/book/</span>
                    <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "") })}
                      onBlur={() => setForm(f => ({ ...f, slug: slugify(f.slug) }))} placeholder="smile-dental"
                      className="min-w-0 flex-1 border-0 px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-brand-600">Opening time</span>
                  <input type="time" value={form.open_time} onChange={e => setForm({ ...form, open_time: e.target.value })} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-brand-600">Closing time</span>
                  <input type="time" value={form.close_time} onChange={e => setForm({ ...form, close_time: e.target.value })} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-brand-600">Appointment length</span>
                  <select value={form.slot_minutes} onChange={e => setForm({ ...form, slot_minutes: Number(e.target.value) })} className={inputCls}>
                    {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-brand-600">Patients can book up to</span>
                  <select value={form.days_ahead} onChange={e => setForm({ ...form, days_ahead: Number(e.target.value) })} className={inputCls}>
                    {[7, 14, 21, 30, 60, 90].map(d => <option key={d} value={d}>{d} days ahead</option>)}
                  </select>
                </label>
              </div>

              <p className="mb-2 mt-5 text-xs text-brand-600">Working days</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => {
                  const on = form.working_days.includes(d);
                  return (
                    <button key={d} type="button" aria-pressed={on}
                      onClick={() => setForm({ ...form, working_days: on ? form.working_days.filter(x => x !== d) : [...form.working_days, d] })}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${on ? "bg-brand-700 text-white" : "border border-brand-200 text-brand-700 hover:border-gold"}`}>
                      {d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              {unstaffed.length > 0 && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No doctor is scheduled on {unstaffed.join(", ")}, so patients cannot book {unstaffed.length > 1 ? "those days" : "that day"} yet.
                  Add {unstaffed.length > 1 ? "them" : "it"} to a doctor&apos;s working days on the <Link href="/dashboard/doctors" className="font-medium underline">Doctors page</Link>.
                </p>
              )}

              <label className="mt-5 block">
                <span className="mb-1 block text-xs text-brand-600">Advance booking fee (optional)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-brand-600">{symbol}</span>
                  <input type="number" min="0" step="1" inputMode="decimal" value={form.advance_fee} placeholder="No advance fee"
                    onChange={e => setForm({ ...form, advance_fee: e.target.value })} className={inputCls} />
                </div>
                <span className="mt-1 block text-xs text-brand-400">Patients pay this online when they book. It is added to their record as a payment and deducted from their treatment invoice later. Leave empty to charge nothing. It only applies once you have connected a payment provider in Settings &gt; Online payments.</span>
              </label>

              <label className="mt-5 block">
                <span className="mb-1 block text-xs text-brand-600">Note for patients (optional)</span>
                <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Please arrive 10 minutes early. Friday 1–3 PM closed for prayers."
                  className={inputCls} />
              </label>

              <p className="mt-4 text-[11px] text-brand-500">
                Doctors&apos; own timings and working days (from the Doctors page) are used when they are set; otherwise the hours above apply.
                Times that already have an appointment are hidden automatically.
              </p>

              <button onClick={save} disabled={saving || !clinicId}
                className="mt-5 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
                {saving ? "Saving…" : saved ? "Saved" : exists ? "Save changes" : "Create booking page"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
