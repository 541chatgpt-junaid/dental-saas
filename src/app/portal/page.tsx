"use client";
import { useEffect, useState } from "react";
import { CalendarCheck, FileSignature, LoaderCircle, LogOut, Pill, Stethoscope, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/dateFormat";
import { doctorName } from "@/lib/personName";

// The patient's own view. Every query below runs as the patient's own login, so
// the database (row-level security) returns only that patient's rows. Nothing
// here can write anything.

interface Data {
  patient: { name: string; phone: string | null; email: string | null; age: number | null; gender: string | null; dob: string | null; blood_group: string | null };
  clinic: { name: string; phone: string | null; address: string | null } | null;
  appointments: { id: number; date: string; time: string; doctor_name: string | null; treatment: string | null; status: string }[];
  visits: { id: number; visit_date: string; treatment: string | null; tooth_number: string | null; doctor_name: string | null; notes: string | null }[];
  prescriptions: { id: string; medicine: string; dosage: string | null; duration: string | null; notes: string | null }[];
  history: { allergies: string | null; medical_conditions: string | null; current_medications: string | null; previous_surgeries: string | null; blood_group: string | null } | null;
  consents: { id: string; title: string; signer_name: string; signed_at: string; signature_png: string }[];
}

const card = "rounded-2xl border border-navy/10 bg-white p-5 shadow-[0_10px_30px_rgba(15,29,61,.05)]";
const todayISO = () => new Date().toLocaleDateString("en-CA");

export default function Portal() {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/portal/login"); return; }
      const [pat, clinic, appts, visits, rx, hist, cons] = await Promise.all([
        supabase.from("patients").select("name, phone, email, age, gender, dob, blood_group").maybeSingle(),
        supabase.from("clinics").select("name, phone, address").maybeSingle(),
        supabase.from("appointments").select("id, date, time, doctor_name, treatment, status").order("date", { ascending: false }),
        supabase.from("visits").select("id, visit_date, treatment, tooth_number, doctor_name, notes").order("visit_date", { ascending: false }),
        supabase.from("prescriptions").select("id, medicine, dosage, duration, notes").order("created_at", { ascending: false }),
        supabase.from("medical_history").select("allergies, medical_conditions, current_medications, previous_surgeries, blood_group").maybeSingle(),
        supabase.from("consent_records").select("id, title, signer_name, signed_at, signature_png").order("signed_at", { ascending: false }),
      ]);
      if (!pat.data) { setState("denied"); return; } // a login that is not a patient portal account sees nothing
      setData({ patient: pat.data, clinic: clinic.data, appointments: appts.data || [], visits: visits.data || [], prescriptions: rx.data || [], history: hist.data, consents: cons.data || [] });
      setState("ready");
    })();
  }, []);

  const signOut = async () => { await createClient().auth.signOut(); window.location.assign("/portal/login"); };

  if (state === "loading") return <main className="flex min-h-screen items-center justify-center bg-cream text-sm text-navy/50"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Loading…</main>;
  if (state === "denied" || !data) return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className={`${card} max-w-sm text-center`}><h1 className="font-display text-2xl font-semibold text-navy">No portal access</h1><p className="mt-2 text-sm text-navy/60">This login is not linked to a patient record. Ask your clinic for an invitation.</p>
        <button onClick={signOut} className="mt-5 rounded-full border border-navy/15 px-5 py-2 text-sm font-semibold text-navy">Sign out</button></div>
    </main>
  );

  const today = todayISO();
  const upcoming = data.appointments.filter(a => a.date >= today && a.status !== "Cancelled").sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  const past = data.appointments.filter(a => !upcoming.includes(a));
  const h = data.history;
  const alertShown = !!(h?.allergies?.trim() || h?.medical_conditions?.trim());

  return (
    <main className="min-h-screen bg-cream pb-16">
      <header className="bg-navy px-5 pb-16 pt-8 text-white sm:px-8" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.12) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}>
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Patient portal</p>
            <h1 className="mt-1.5 truncate font-display text-3xl font-semibold">{data.patient.name}</h1>
            <p className="mt-1 text-sm text-white/70">{data.clinic?.name}{data.clinic?.phone ? ` · ${data.clinic.phone}` : ""}</p>
          </div>
          <button onClick={signOut} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:border-gold"><LogOut className="h-3.5 w-3.5" aria-hidden="true" />Sign out</button>
        </div>
      </header>

      <div className="mx-auto -mt-10 max-w-3xl space-y-5 px-4">
        {alertShown && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5" aria-label="Medical alert">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700"><TriangleAlert className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Medical alert on your record</p>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-red-800">
              {h?.allergies?.trim() && <span><strong>Allergies:</strong> {h.allergies}</span>}
              {h?.medical_conditions?.trim() && <span><strong>Conditions:</strong> {h.medical_conditions}</span>}
            </div>
          </section>
        )}

        <section className={card} aria-label="Upcoming appointments">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-navy"><CalendarCheck className="h-5 w-5 text-gold" aria-hidden="true" />Appointments</h2>
          {upcoming.length === 0 ? <p className="mt-3 text-sm text-navy/55">No upcoming appointments.</p> : (
            <ul className="mt-3 divide-y divide-navy/10">
              {upcoming.map(a => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span><strong className="text-navy">{formatDate(a.date, { weekday: true })}</strong> at {a.time}{a.treatment ? ` · ${a.treatment}` : ""}{a.doctor_name ? ` · ${doctorName(a.doctor_name)}` : ""}</span>
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-[#8a6d12]">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
          {past.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer text-navy/60">Earlier appointments ({past.length})</summary>
            <ul className="mt-2 space-y-1.5 text-navy/70">{past.map(a => <li key={a.id}>{formatDate(a.date)} {a.time}{a.treatment ? ` · ${a.treatment}` : ""} · {a.status}</li>)}</ul></details>}
        </section>

        <section className={card} aria-label="Visits">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-navy"><Stethoscope className="h-5 w-5 text-gold" aria-hidden="true" />Visits</h2>
          {data.visits.length === 0 ? <p className="mt-3 text-sm text-navy/55">No visits recorded yet.</p> : (
            <ul className="mt-3 divide-y divide-navy/10">{data.visits.map(v => (
              <li key={v.id} className="py-3 text-sm"><strong className="text-navy">{formatDate(v.visit_date)}</strong> · {v.treatment || "Visit"}{v.tooth_number ? ` · Tooth ${v.tooth_number}` : ""}{v.doctor_name ? ` · ${doctorName(v.doctor_name)}` : ""}
                {v.notes && <p className="mt-0.5 text-navy/60">{v.notes}</p>}</li>))}</ul>)}
        </section>

        {data.prescriptions.length > 0 && (
          <section className={card} aria-label="Prescriptions">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-navy"><Pill className="h-5 w-5 text-gold" aria-hidden="true" />Prescriptions</h2>
            <ul className="mt-3 divide-y divide-navy/10">{data.prescriptions.map(r => <li key={r.id} className="py-3 text-sm"><strong className="text-navy">{r.medicine}</strong>{r.dosage ? ` · ${r.dosage}` : ""}{r.duration ? ` · ${r.duration}` : ""}{r.notes ? <span className="text-navy/60"> · {r.notes}</span> : null}</li>)}</ul>
          </section>
        )}

        <section className={card} aria-label="Medical history">
          <h2 className="font-display text-xl font-semibold text-navy">Medical history</h2>
          {!h ? <p className="mt-3 text-sm text-navy/55">Nothing recorded yet.</p> : (
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {([["Allergies", h.allergies], ["Conditions", h.medical_conditions], ["Medicines", h.current_medications], ["Surgeries", h.previous_surgeries], ["Blood group", h.blood_group || data.patient.blood_group]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-xs uppercase tracking-wide text-navy/45">{k}</dt><dd className="text-navy">{v?.trim() || "None recorded"}</dd></div>))}
            </dl>)}
        </section>

        {data.consents.length > 0 && (
          <section className={card} aria-label="Signed consents">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-navy"><FileSignature className="h-5 w-5 text-gold" aria-hidden="true" />Consents you signed</h2>
            <ul className="mt-3 divide-y divide-navy/10">{data.consents.map(c => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span><strong className="text-navy">{c.title}</strong><br /><span className="text-navy/55">Signed by {c.signer_name} on {formatDate(c.signed_at)}, {new Date(c.signed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.signature_png} alt={`Signature of ${c.signer_name}`} className="h-10 w-24 shrink-0 rounded border border-navy/10 bg-white object-contain" />
              </li>))}</ul>
          </section>
        )}
      </div>
    </main>
  );
}
