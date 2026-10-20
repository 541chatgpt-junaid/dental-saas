"use client";
import { useMemo } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

export interface CalAppointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  time: string;
  treatment: string;
  status: string;
}

const SLOT_MIN = 30;
const ROW_H = 46;

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => new Date(`${s}T00:00:00`);
const minutesOf = (t: string) => {
  const [h, m] = (t || "").split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
};
const label = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
};
const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

/** Key used to detect double bookings: same doctor, same day, same 30-minute slot */
export const slotKey = (a: { doctor_name: string; date: string; time: string }) => {
  const m = minutesOf(a.time);
  return m === null ? null : `${norm(a.doctor_name)}|${a.date}|${Math.floor(m / SLOT_MIN)}`;
};

const STATUS_CLS: Record<string, string> = {
  Scheduled: "border-l-blue-500 bg-blue-50",
  Completed: "border-l-green-500 bg-green-50",
  Cancelled: "border-l-red-400 bg-red-50 opacity-60",
};

export default function AppointmentCalendar({
  view, date, onDateChange, appointments, doctors, onSelect, onNew,
}: {
  view: "day" | "week";
  date: string;
  onDateChange: (d: string) => void;
  appointments: CalAppointment[];
  doctors: string[];
  onSelect: (a: CalAppointment) => void;
  onNew: (date: string, time: string, doctor: string) => void;
}) {
  const days = useMemo(() => {
    if (view === "day") return [date];
    const d = fromISO(date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(monday); x.setDate(monday.getDate() + i); return toISO(x); });
  }, [view, date]);

  const visible = appointments.filter(a => days.includes(a.date));

  // Day view: one column per doctor (plus any doctor names only found on appointments)
  const doctorCols = useMemo(() => {
    const names = [...doctors];
    visible.forEach(a => { if (a.doctor_name && !names.some(n => norm(n) === norm(a.doctor_name))) names.push(a.doctor_name); });
    if (visible.some(a => !a.doctor_name)) names.push("");
    return names.length ? names : [""];
  }, [doctors, visible]);

  const columns = view === "day"
    ? doctorCols.map(doc => ({ key: `doc-${doc}`, title: doc ? `Dr. ${doc}` : "Unassigned", date, doctor: doc }))
    : days.map(d => ({ key: d, title: fromISO(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }), date: d, doctor: "" }));

  // Hours shown: 8 AM – 9 PM, stretched to include any appointment outside that
  const mins = visible.map(a => minutesOf(a.time)).filter((m): m is number => m !== null);
  const startMin = Math.min(8 * 60, ...mins.map(m => Math.floor(m / 60) * 60));
  const endMin = Math.max(21 * 60, ...mins.map(m => (Math.floor(m / 60) + 1) * 60));
  const slots = Array.from({ length: (endMin - startMin) / SLOT_MIN }, (_, i) => startMin + i * SLOT_MIN);

  // Double bookings among scheduled appointments
  const clashes = useMemo(() => {
    const count: Record<string, number> = {};
    appointments.filter(a => a.status === "Scheduled").forEach(a => { const k = slotKey(a); if (k) count[k] = (count[k] || 0) + 1; });
    return new Set(Object.entries(count).filter(([, n]) => n > 1).map(([k]) => k));
  }, [appointments]);
  const clashCount = visible.filter(a => a.status === "Scheduled" && clashes.has(slotKey(a) ?? "")).length;

  const shift = (n: number) => { const d = fromISO(date); d.setDate(d.getDate() + n * (view === "day" ? 1 : 7)); onDateChange(toISO(d)); };
  const today = toISO(new Date());
  const heading = view === "day"
    ? fromISO(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : `${fromISO(days[0]).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${fromISO(days[6]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 p-3">
        <button onClick={() => shift(-1)} aria-label="Previous" className="rounded-lg border border-brand-200 p-1.5 text-brand-700 hover:border-gold"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={() => onDateChange(today)} className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold">Today</button>
        <button onClick={() => shift(1)} aria-label="Next" className="rounded-lg border border-brand-200 p-1.5 text-brand-700 hover:border-gold"><ChevronRight className="h-4 w-4" /></button>
        <p className="ml-1 font-display text-base font-semibold text-brand-800">{heading}</p>
        <input type="date" value={date} onChange={e => e.target.value && onDateChange(e.target.value)} aria-label="Go to date"
          className="ml-auto rounded-lg border border-brand-200 px-2 py-1 text-xs text-brand-700 focus:outline-none focus:ring-2 focus:ring-gold/50" />
      </div>

      {clashCount > 0 && (
        <p className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
          <AlertTriangle className="h-4 w-4" /> {clashCount} appointments are double-booked (same doctor, same time). They are outlined in red.
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(140px, 1fr))` }}>
          {/* Header */}
          <div className="sticky left-0 z-10 border-b border-brand-100 bg-white" />
          {columns.map(c => (
            <div key={c.key} className={`border-b border-l border-brand-100 px-2 py-2 text-center text-xs font-semibold ${c.date === today && view === "week" ? "bg-gold/10 text-brand-800" : "text-brand-700"}`}>{c.title}</div>
          ))}

          {/* Time rail */}
          <div className="sticky left-0 z-10 bg-white">
            {slots.map(s => (
              <div key={s} style={{ height: ROW_H }} className="border-b border-brand-100 pr-2 pt-1 text-right text-[10px] text-brand-400">{s % 60 === 0 ? label(s) : ""}</div>
            ))}
          </div>

          {/* Columns */}
          {columns.map(c => {
            const colAppts = visible.filter(a => a.date === c.date && (view === "week" || norm(a.doctor_name) === norm(c.doctor)));
            return (
              <div key={c.key} className="relative border-l border-brand-100">
                {slots.map(s => (
                  <button key={s} type="button" style={{ height: ROW_H }} aria-label={`New appointment ${c.title} ${label(s)}`}
                    onClick={() => onNew(c.date, `${pad(Math.floor(s / 60))}:${pad(s % 60)}`, c.doctor)}
                    className="block w-full border-b border-brand-100 hover:bg-gold/5" />
                ))}
                {Object.values(colAppts.reduce<Record<number, CalAppointment[]>>((acc, a) => {
                  const m = minutesOf(a.time) ?? startMin;
                  const slot = Math.floor((m - startMin) / SLOT_MIN);
                  (acc[slot] ||= []).push(a);
                  return acc;
                }, {})).map(group => group.map((a, i) => {
                  const m = minutesOf(a.time) ?? startMin;
                  const slot = Math.floor((m - startMin) / SLOT_MIN);
                  const clash = a.status === "Scheduled" && clashes.has(slotKey(a) ?? "");
                  const width = 100 / group.length;
                  return (
                    <button key={a.id} type="button" onClick={() => onSelect(a)}
                      title={`${a.time} · ${a.patient_name}${a.treatment ? ` · ${a.treatment}` : ""}${a.doctor_name ? ` · Dr. ${a.doctor_name}` : ""}`}
                      style={{ top: slot * ROW_H + 2, height: ROW_H - 4, left: `calc(${i * width}% + 3px)`, width: `calc(${width}% - 6px)` }}
                      className={`absolute z-[1] animate-scale-in overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left shadow-sm transition-transform hover:z-[2] hover:scale-[1.02] ${STATUS_CLS[a.status] || STATUS_CLS.Scheduled} ${clash ? "ring-2 ring-red-500" : ""}`}>
                      <p className="truncate text-[11px] font-semibold text-brand-800">{clash && "⚠ "}{a.time?.slice(0, 5)} {a.patient_name}</p>
                      <p className="truncate text-[10px] text-brand-500">{view === "week" && a.doctor_name ? `Dr. ${a.doctor_name}` : a.treatment}</p>
                    </button>
                  );
                }))}
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-brand-100 px-4 py-2 text-[11px] text-brand-500">Click an empty slot to book it, or an appointment to edit it.</p>
    </div>
  );
}
