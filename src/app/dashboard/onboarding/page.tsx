"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, FlaskConical, Stethoscope } from "lucide-react";
import { todayISO } from "@/lib/formSave";
import { WEEKDAYS } from "@/lib/weekdays";

const DAYS = [...WEEKDAYS.slice(1), WEEKDAYS[0]]; // Monday first, like the rest of the app
const CURRENCIES = [["PKR", "Rs — Pakistani Rupee"], ["USD", "$ — US Dollar"], ["AED", "AED — UAE Dirham"], ["GBP", "£ — British Pound"],
  ["EUR", "€ — Euro"], ["SAR", "SAR — Saudi Riyal"], ["CAD", "CA$ — Canadian Dollar"], ["AUD", "A$ — Australian Dollar"]];
const STEPS = [{ title: "Your clinic", icon: Building2 }, { title: "First doctor", icon: Stethoscope }, { title: "Sample data", icon: FlaskConical }];
const input = "w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold";

async function call(method: string, body?: object): Promise<string | null> {
  try {
    const res = await fetch("/api/onboarding", { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    return res.ok && !json.error ? null : json.error || "Something went wrong. Please try again.";
  } catch {
    return "Network error. Please check your connection and try again.";
  }
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clinic, setClinic] = useState({ clinic_name: "", clinic_phone: "", clinic_address: "", currency: "" });
  const [doctor, setDoctor] = useState({ name: "", specialization: "", timing_start: "09:00", timing_end: "17:00" });
  const [days, setDays] = useState<string[]>(DAYS.slice(0, 6));
  const [sample, setSample] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding").then(r => r.json()).then(d => {
      // Not the owner, or already finished: nothing to set up here
      if (!d.needed) { router.replace("/dashboard"); return; }
      setClinic({ clinic_name: d.profile.clinic_name, clinic_phone: d.profile.clinic_phone, clinic_address: d.profile.clinic_address, currency: d.profile.currency });
      setReady(true);
    }).catch(() => router.replace("/dashboard"));
  }, [router]);

  const run = async (fn: () => Promise<string | null>, then: () => void) => {
    setBusy(true); setError("");
    const err = await fn();
    setBusy(false);
    if (err) setError(err); else then();
  };

  const finish = (withSample: boolean) =>
    run(() => call("POST", { step: "finish", sample: withSample, today: todayISO() }), () => router.replace("/dashboard"));

  const saveClinic = () => {
    if (!clinic.clinic_name.trim()) { setError("Clinic name is required."); return; }
    run(() => call("POST", { step: "profile", ...clinic }), () => setStep(1));
  };

  const saveDoctor = () => {
    if (!doctor.name.trim()) { setError("Enter the doctor's name, or skip this step."); return; }
    if (!days.length) { setError("Choose at least one working day."); return; }
    if (doctor.timing_end <= doctor.timing_start) { setError("End time must be after start time."); return; }
    run(() => call("POST", { step: "doctor", ...doctor, working_days: days }), () => setStep(2));
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-brand-50 text-sm text-brand-500">Loading…</div>;

  return (
    <main className="min-h-screen bg-brand-50 px-4 py-8 md:py-14">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-2xl font-semibold text-brand-800 tracking-tight">Welcome to DentEase</h1>
        <p className="mt-1 text-sm text-brand-500">Three quick steps and your clinic is ready.</p>

        <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s.title} aria-current={i === step ? "step" : undefined}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${i === step ? "border-gold bg-white text-brand-800" : i < step ? "border-brand-100 bg-white text-brand-600" : "border-brand-100 text-brand-400"}`}>
              {i < step ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : <s.icon className="h-4 w-4" aria-hidden="true" />}
              <span><span className="block text-[10px] uppercase tracking-wider opacity-60">Step {i + 1}</span>{s.title}</span>
            </li>
          ))}
        </ol>

        <div className="form-panel mt-5 rounded-xl border border-brand-100 bg-white p-4 md:p-6">
          {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {step === 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-brand-800">Confirm your clinic details</h2>
              <p className="text-xs text-brand-500">Filled in from your signup. They appear on receipts and can be changed later in Settings.</p>
              <label className="block"><span className="mb-1 block text-xs text-brand-600">Clinic name *</span>
                <input className={input} value={clinic.clinic_name} onChange={e => setClinic({ ...clinic, clinic_name: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs text-brand-600">Phone number</span>
                <input className={input} type="tel" placeholder="e.g. 0300-1234567" value={clinic.clinic_phone} onChange={e => setClinic({ ...clinic, clinic_phone: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs text-brand-600">Clinic address</span>
                <input className={input} placeholder="e.g. Shop 5, Main Market, Lahore" value={clinic.clinic_address} onChange={e => setClinic({ ...clinic, clinic_address: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs text-brand-600">Currency</span>
                <select className={input} value={clinic.currency} onChange={e => setClinic({ ...clinic, currency: e.target.value })}>
                  <option value="">Detect automatically</option>
                  {CURRENCIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select></label>
              <div className="flex gap-3 pt-2">
                <button onClick={saveClinic} disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{busy ? "Saving…" : "Continue"}</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-brand-800">Add your first doctor</h2>
              <p className="text-xs text-brand-500">Patients can book online only on the days a doctor works. You can add more doctors later.</p>
              <label className="block"><span className="mb-1 block text-xs text-brand-600">Doctor name *</span>
                <input className={input} placeholder="e.g. Ayesha Khan" value={doctor.name} onChange={e => setDoctor({ ...doctor, name: e.target.value })} /></label>
              <label className="block"><span className="mb-1 block text-xs text-brand-600">Specialization</span>
                <input className={input} placeholder="e.g. Orthodontist" value={doctor.specialization} onChange={e => setDoctor({ ...doctor, specialization: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1 block text-xs text-brand-600">Start time</span>
                  <input className={input} type="time" value={doctor.timing_start} onChange={e => setDoctor({ ...doctor, timing_start: e.target.value })} /></label>
                <label className="block"><span className="mb-1 block text-xs text-brand-600">End time</span>
                  <input className={input} type="time" value={doctor.timing_end} onChange={e => setDoctor({ ...doctor, timing_end: e.target.value })} /></label>
              </div>
              <div>
                <p className="mb-2 text-xs text-brand-600">Working days</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => {
                    const on = days.includes(d);
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter(x => x !== d) : [...days, d])}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${on ? "bg-brand-700 text-white" : "border border-brand-200 text-brand-700 hover:border-gold"}`}>{d.slice(0, 3)}</button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={saveDoctor} disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{busy ? "Saving…" : "Continue"}</button>
                <button onClick={() => { setError(""); setStep(2); }} disabled={busy} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Skip for now</button>
                <button onClick={() => { setError(""); setStep(0); }} disabled={busy} className="text-sm text-brand-500 hover:underline">Back</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-brand-800">Start with sample data?</h2>
              <p className="text-xs text-brand-500">Three example patients and three appointments let you try the dashboard, queue and calendar right away. They are clearly marked as samples, create no bills, and one click on the dashboard removes them.</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-100 p-3">
                <input type="checkbox" checked={sample} onChange={e => setSample(e.target.checked)} className="mt-0.5 h-4 w-4 accent-gold" />
                <span className="text-sm text-brand-700">Add sample patients and appointments</span>
              </label>
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={() => finish(sample)} disabled={busy} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{busy ? "Finishing…" : "Finish setup"}</button>
                <button onClick={() => { setError(""); setStep(1); }} disabled={busy} className="text-sm text-brand-500 hover:underline">Back</button>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => finish(false)} disabled={busy} className="mt-4 text-xs text-brand-400 hover:underline">Skip setup and go to the dashboard</button>
      </div>
    </main>
  );
}
