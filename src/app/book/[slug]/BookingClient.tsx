"use client";
import { useEffect, useMemo, useState } from "react";
import { doctorName } from "@/lib/personName";
import { formatDate } from "@/lib/dateFormat";
import Link from "next/link";
import { CalendarCheck, Check, Clock, LoaderCircle, MapPin, MessageCircle, Phone, Stethoscope, UserRound } from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { WEEKDAYS, opensOn, worksOn } from "@/lib/weekdays";

interface Info {
  clinic: { name: string; phone: string | null; address: string | null };
  doctors: { name: string; specialization: string | null; working_days: string | null }[];
  settings: { slot_minutes: number; days_ahead: number; working_days: string; note: string | null };
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = (t: string) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };
const fmtDate = (iso: string) => formatDate(iso, { weekday: true });

function Tooth({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        d="M15 6c-5.5 0-9.5 4.2-9.5 10.2 0 5.6 2.2 8.6 3.2 13.6 1.2 6 2 12.2 6.2 12.2 3.2 0 3.4-5.2 4.4-9 .8-3 2-5 4.7-5s3.9 2 4.7 5c1 3.8 1.2 9 4.4 9 4.2 0 5-6.2 6.2-12.2 1-5 3.2-8 3.2-13.6C42.5 10.2 38.5 6 33 6c-4 0-5.8 2-9 2s-5-2-9-2z" />
      <path stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M9 21h7.5l2.2-4.5 3.2 9 2.4-4.5H32" />
    </svg>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="animate-fade-up border-t border-navy/10 px-5 py-6 first:border-t-0 sm:px-8">
      <h2 className="mb-4 flex items-center gap-3 font-display text-lg font-semibold text-navy">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-gold text-navy" : "bg-navy text-white"}`}>
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function BookingClient({ slug }: { slug: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [doctor, setDoctor] = useState<string | null>(null); // "" = any
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", reason: "", website: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<{ date: string; time: string; doctor: string | null } | null>(null);

  useEffect(() => {
    fetch(`/api/public/booking/${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: Info) => { setInfo(d); if (d.doctors.length <= 1) setDoctor(d.doctors[0]?.name ?? ""); })
      .catch(() => setNotFound(true));
  }, [slug]);

  const days = useMemo(() => {
    if (!info) return [];
    // The chosen doctor, or (for "any doctor") at least one doctor, must work that day: a day the
    // clinic is open but nobody is scheduled stays greyed out instead of showing an empty list
    const chosen = doctor ? info.doctors.filter(d => d.name === doctor) : info.doctors;
    return Array.from({ length: info.settings.days_ahead }, (_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
      const wd = WEEKDAYS[d.getDay()];
      const staffed = !chosen.length || chosen.some(x => worksOn(x.working_days, wd));
      return { iso: isoOf(d), d, open: opensOn(info.settings.working_days, wd) && staffed };
    });
  }, [info, doctor]);

  useEffect(() => {
    if (date === null || doctor === null) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset while the new day's slots load
    setSlots(null);
    fetch(`/api/public/booking/${encodeURIComponent(slug)}/slots?date=${date}&doctor=${encodeURIComponent(doctor)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const now = new Date();
        const minNow = date === isoOf(now) ? now.getHours() * 60 + now.getMinutes() + 30 : -1; // no slots in the next 30 min
        setSlots((d.slots as string[] || []).filter(t => { const [h, m] = t.split(":").map(Number); return h * 60 + m > minNow; }));
      })
      .catch(() => !cancelled && setSlots([]));
    return () => { cancelled = true; };
  }, [date, doctor, slug]);

  const submit = async () => {
    if (!date || !time || doctor === null) return;
    if (form.name.trim().length < 2) { setError("Please enter your name."); return; }
    if (form.phone.replace(/\D/g, "").length < 7) { setError("Please enter a valid phone number."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/public/booking/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, doctor, date, time }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not book. Please try again.");
        if (res.status === 409) { setTime(null); setSlots(s => s?.filter(x => x !== time) ?? null); }
        return;
      }
      setBooked({ date: data.date, time: data.time, doctor: data.doctor });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream p-6 text-center">
        <div>
          <Tooth className="mx-auto mb-4 h-14 w-14 text-navy" />
          <h1 className="font-display text-2xl font-semibold text-navy">Booking page not found</h1>
          <p className="mt-2 text-sm text-navy/60">This link may be incorrect, or the clinic has turned off online booking.</p>
        </div>
      </main>
    );
  }

  const groups = slots ? [
    ["Morning", slots.filter(t => Number(t.slice(0, 2)) < 12)],
    ["Afternoon", slots.filter(t => Number(t.slice(0, 2)) >= 12 && Number(t.slice(0, 2)) < 17)],
    ["Evening", slots.filter(t => Number(t.slice(0, 2)) >= 17)],
  ] as const : [];

  return (
    <main className="min-h-screen bg-cream pb-16">
      <header className="bg-navy px-5 pb-24 pt-10 text-white sm:px-8" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.12) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}>
        <div className="mx-auto max-w-2xl animate-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Book an appointment</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{info?.clinic.name ?? <span className="inline-block h-9 w-56 animate-pulse rounded bg-white/10" />}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
            {info?.clinic.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gold" />{info.clinic.address}</span>}
            {info?.clinic.phone && <a href={`tel:${info.clinic.phone}`} className="inline-flex items-center gap-1.5 hover:text-gold"><Phone className="h-4 w-4 text-gold" />{info.clinic.phone}</a>}
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-16 max-w-2xl px-4">
        <div className="animate-scale-in overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.15)]">
          {!info ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-navy/50"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading…</div>
          ) : booked ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex h-16 w-16 animate-scale-in items-center justify-center rounded-full bg-gold/15"><Check className="h-8 w-8 text-gold" /></span>
              <h2 className="mt-5 font-display text-2xl font-semibold text-navy">Request sent</h2>
              <p className="mt-2 max-w-sm text-sm text-navy/65">
                {info.clinic.name} has received your request for <strong>{fmtDate(booked.date)}</strong> at <strong>{fmtTime(booked.time)}</strong>
                {booked.doctor ? <> with <strong>Dr. {booked.doctor}</strong></> : null}. They will contact you on {form.phone} to confirm.
              </p>
              {info.clinic.phone && (
                <a href={waLink(info.clinic.phone, `Assalam o Alaikum, I just requested an appointment online for ${fmtDate(booked.date)} at ${fmtTime(booked.time)}. My name is ${form.name}.`)}
                  target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white">
                  <MessageCircle className="h-4 w-4" /> Message the clinic
                </a>
              )}
            </div>
          ) : (
            <>
              {info.settings.note && <p className="border-b border-navy/10 bg-gold/10 px-5 py-3 text-sm text-navy sm:px-8">{info.settings.note}</p>}

              {info.doctors.length > 1 && (
                <Step n={1} title="Choose a doctor" done={doctor !== null}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[{ name: "", specialization: "First available" }, ...info.doctors].map(d => (
                      <button key={d.name || "any"} onClick={() => { setDoctor(d.name); setTime(null); }}
                        className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-300 ${doctor === d.name ? "border-gold bg-gold/10" : "border-navy/10 hover:border-navy/25"}`}>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-gold">
                          {d.name ? <Stethoscope className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                        </span>
                        <span>
                          <span className="block font-semibold text-navy">{d.name ? doctorName(d.name) : "Any doctor"}</span>
                          <span className="block text-xs text-navy/55">{d.specialization || "Dentist"}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Step>
              )}

              {doctor !== null && (
                <Step n={info.doctors.length > 1 ? 2 : 1} title="Pick a day" done={!!date}>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                    {days.map(d => (
                      <button key={d.iso} disabled={!d.open} onClick={() => { setDate(d.iso); setTime(null); }}
                        className={`flex w-16 shrink-0 flex-col items-center rounded-xl border-2 py-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35 ${date === d.iso ? "border-gold bg-gold/10" : "border-navy/10 hover:border-navy/25"}`}>
                        <span className="text-[11px] uppercase text-navy/55">{d.d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                        <span className="font-display text-xl font-semibold text-navy">{d.d.getDate()}</span>
                        <span className="text-[10px] text-navy/50">{d.d.toLocaleDateString("en-GB", { month: "short" })}</span>
                      </button>
                    ))}
                  </div>
                </Step>
              )}

              {date && (
                <Step n={info.doctors.length > 1 ? 3 : 2} title="Pick a time" done={!!time}>
                  {slots === null ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <span key={i} className="h-10 animate-pulse rounded-lg bg-navy/5" />)}</div>
                  ) : slots.length === 0 ? (
                    <p className="flex items-center gap-2 rounded-xl bg-cream px-4 py-4 text-sm text-navy/65"><Clock className="h-4 w-4 text-gold" /> No free times on this day. Please try another day.</p>
                  ) : (
                    <div className="space-y-4">
                      {groups.filter(([, list]) => list.length).map(([label, list]) => (
                        <div key={label}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy/45">{label}</p>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {list.map(t => (
                              <button key={t} onClick={() => setTime(t)}
                                className={`rounded-lg border-2 py-2 text-sm font-medium transition-all duration-300 ${time === t ? "border-gold bg-gold text-navy" : "border-navy/10 text-navy hover:border-gold"}`}>
                                {fmtTime(t)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Step>
              )}

              {time && date && (
                <Step n={info.doctors.length > 1 ? 4 : 3} title="Your details">
                  <p className="mb-4 flex items-center gap-2 rounded-xl bg-cream px-4 py-3 text-sm text-navy">
                    <CalendarCheck className="h-4 w-4 text-gold" /> {fmtDate(date)} · {fmtTime(time)}{doctor ? ` · ${doctorName(doctor)}` : ""}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-navy/70">Full name *</span>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name"
                        className="w-full rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-navy outline-none transition-colors focus:border-gold" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-navy/70">Phone / WhatsApp *</span>
                      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567"
                        className="w-full rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-navy outline-none transition-colors focus:border-gold" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-semibold text-navy/70">Reason for visit</span>
                      <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Toothache, check-up, cleaning"
                        className="w-full rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-navy outline-none transition-colors focus:border-gold" />
                    </label>
                    <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                  </div>
                  {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
                  <button onClick={submit} disabled={submitting}
                    className="btn-gold mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-semibold text-navy transition-all duration-500 hover:-translate-y-0.5 disabled:opacity-60">
                    {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                    {submitting ? "Sending…" : "Request appointment"}
                  </button>
                  <p className="mt-2 text-center text-xs text-navy/50">The clinic will confirm your appointment by phone or WhatsApp. Your name and phone number are shared with this clinic; see the <Link href="/privacy" className="underline hover:text-gold">Privacy Policy</Link>.</p>
                </Step>
              )}
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-navy/45">Online booking by <Link href="/" className="font-semibold text-navy/60 hover:text-gold">Dent<span className="text-gold">Ease</span></Link></p>
      </div>
    </main>
  );
}
