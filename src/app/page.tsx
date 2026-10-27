"use client";
import { useState, useEffect, useRef, useCallback, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowLeftRight, ArrowRight, BadgeCheck, Building2, CalendarCheck, Check, ChevronDown, ClipboardList,
  Clock, Cloud, FlaskConical, LayoutDashboard, LoaderCircle, Lock, LogIn, Menu, MessageCircle, Phone,
  Quote, Receipt, Send, ShieldCheck, Sparkles, Star, Users, X,
} from "lucide-react";

/* ─── CONTACT ───────────────────────────────────────────── */
const PHONE_DISPLAY = "+92 313 0709941";
const PHONE_TEL = "tel:+923130709941";
const WHATSAPP = "https://wa.me/923130709941";

/* ─── DATA ─────────────────────────────────────────────── */
const NAV = [
  ["#features", "Features"],
  ["#workflow", "Workflow"],
  ["#why", "Why DentEase"],
  ["#reviews", "Reviews"],
  ["#faq", "FAQ"],
] as const;

const FEATURES = [
  { icon: CalendarCheck, title: "Appointment Booking", desc: "Book, reschedule and confirm visits in seconds, with the whole day's chair schedule on one calm screen." },
  { icon: ClipboardList, title: "Patient Records", desc: "Medical history, visit notes, prescriptions and an FDI tooth chart for every patient, searchable instantly." },
  { icon: Receipt, title: "Billing & Receipts", desc: "Record payments, track balances and print professional receipts the moment treatment is complete." },
  { icon: Users, title: "Staff Scheduling", desc: "Add doctors and assistants, assign role-based permissions and control exactly who sees what." },
  { icon: FlaskConical, title: "Lab Case Tracking", desc: "Follow every crown, bridge and aligner from impression to delivery, with due dates you can trust." },
  { icon: LayoutDashboard, title: "Revenue Reports", desc: "Monthly income, expenses and doctor performance charts that show how your practice is really doing." },
];

const PRINCIPLES = [
  { icon: BadgeCheck, title: "Reliable", desc: "Cloud-hosted and always available, so your front desk never waits on a server in the back room. Your schedule is ready the moment the clinic opens." },
  { icon: ShieldCheck, title: "Secure", desc: "Encrypted storage, per-clinic data isolation and staff-level permissions keep patient information where it belongs: with you." },
  { icon: Sparkles, title: "Simple", desc: "Designed around how dental teams actually work. New staff are confident within a day, with no lengthy training or IT setup." },
];

type Testimonial = { name: string; clinic: string; rating: number; text: string };

const FAQS = [
  { q: "Is DentEase really free to start?", a: "Yes. You can create your clinic account and start managing patients, appointments and billing without a credit card or setup fee." },
  { q: "Can multiple doctors and staff use one clinic account?", a: "Absolutely. Add as many team members as you need and give each one role-based permissions, so receptionists, assistants and doctors only see the modules relevant to them." },
  { q: "How is patient data kept secure?", a: "All data is encrypted and stored in the cloud with strict per-clinic isolation. Only the staff you invite, with the permissions you grant, can access your records." },
  { q: "Does DentEase work on phones and tablets?", a: "Yes. DentEase runs in any modern browser on desktop, tablet and mobile, and can be installed as an app on your device without an app store." },
  { q: "Can I move my existing paper records over?", a: "Yes. You can add patients as they visit, or enter historical records at your own pace. Book a demo and we will walk you through the quickest way to migrate." },
];

const PATHS = [
  { id: "free", title: "Start free", desc: "Set up my clinic myself and begin today." },
  { id: "demo", title: "Guided demo", desc: "Walk me through DentEase on a call first." },
  { id: "multi", title: "Multi-branch", desc: "I run more than one location." },
];
const SIZES = ["Solo dentist", "2–5 chairs", "6–10 chairs", "10+ chairs"];
const NEEDS = ["Appointment booking", "Patient records", "Billing & receipts", "Staff scheduling", "Lab case tracking", "Revenue reports"];

/* ─── HELPERS ───────────────────────────────────────────── */
/** Props that make an element fade up when scrolled into view. */
function rv(delay = 0, kind: "up" | "fade" | "scale" = "up") {
  return { "data-reveal": kind === "up" ? "" : kind, style: { "--d": `${delay}ms` } as CSSProperties };
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] sm:tracking-[0.25em] ${light ? "text-gold-soft" : "text-gold"}`}>
      <span className="h-px w-8 bg-gold" aria-hidden="true" />
      {children}
      <span className="h-px w-8 bg-gold" aria-hidden="true" />
    </div>
  );
}

/* ─── LOGO (SVG mark, stroke draws on in the hero) ───────── */
function LogoMark({ className = "", draw = false }: { className?: string; draw?: boolean }) {
  const drawStyle = (delay: number) =>
    draw ? ({ strokeDasharray: 1, "--dash": 1, animationDelay: `${delay}s` } as CSSProperties) : undefined;
  const cls = draw ? "animate-crown-draw" : "";
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path pathLength={1} className={cls} style={drawStyle(0.3)} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        d="M15 6c-5.5 0-9.5 4.2-9.5 10.2 0 5.6 2.2 8.6 3.2 13.6 1.2 6 2 12.2 6.2 12.2 3.2 0 3.4-5.2 4.4-9 .8-3 2-5 4.7-5s3.9 2 4.7 5c1 3.8 1.2 9 4.4 9 4.2 0 5-6.2 6.2-12.2 1-5 3.2-8 3.2-13.6C42.5 10.2 38.5 6 33 6c-4 0-5.8 2-9 2s-5-2-9-2z" />
      <path pathLength={1} className={cls} style={drawStyle(1.1)} stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        d="M9 21h7.5l2.2-4.5 3.2 9 2.4-4.5H32" />
      <path pathLength={1} className={cls} style={drawStyle(1.6)} stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round"
        d="M32 21h5M30 17.5h4M30 24.5h4" />
    </svg>
  );
}

function Wordmark({ light = true }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={`h-9 w-9 ${light ? "text-white" : "text-navy"}`} />
      <span className={`font-display text-2xl font-semibold tracking-tight ${light ? "text-white" : "text-navy"}`}>
        Dent<span className="text-gold">Ease</span>
      </span>
    </span>
  );
}

/* ─── COUNT-UP STAT ─────────────────────────────────────── */

/* ─── BEFORE / AFTER SLIDER ─────────────────────────────── */
function PaperRecords() {
  const rows = [
    ["9:00", "Mrs. Farah — scaling", true],
    ["9:30", "Ali H. — RCT #36 ??", false],
    ["10:00", "", false],
    ["10:15", "Bilal — crown (lab?)", true],
    ["11:00", "Sana — extraction", false],
    ["11:30", "call back re: bill", false],
  ] as const;
  return (
    <div className="absolute inset-0 bg-[#ece4cf] p-5 sm:p-8">
      <div className="relative h-full rounded-md bg-[#fbf6e6] p-4 shadow-[0_8px_30px_rgba(0,0,0,.12)] sm:p-6" style={{ transform: "rotate(-1.2deg)", backgroundImage: "repeating-linear-gradient(#fbf6e6 0 31px, #c9d6e8 31px 32px)" }}>
        <div className="mb-3 flex items-baseline justify-between border-b-2 border-red-300 pb-2">
          <span className="font-display text-lg italic text-[#4a3f2a] sm:text-xl">Appointment Register</span>
          <span className="text-xs text-[#7a6a48]">Tues ??</span>
        </div>
        <ul className="space-y-[7px] font-[cursive] text-[13px] text-[#3d4a6b] sm:text-sm">
          {rows.map(([t, n, struck]) => (
            <li key={t} className="flex gap-3">
              <span className="w-12 shrink-0 text-[#7a6a48]">{t}</span>
              <span className={struck ? "line-through decoration-red-400" : ""}>{n}</span>
            </li>
          ))}
        </ul>
        <div className="absolute bottom-6 right-4 w-32 rotate-3 bg-[#fde68a] p-3 text-[11px] leading-snug text-[#5b4a12] shadow-md sm:w-40 sm:text-xs" style={{ fontFamily: "cursive" }}>
          Lab called — Bilal&apos;s crown late again. Find his file!
        </div>
        <div className="absolute -top-3 left-1/3 h-6 w-20 rotate-[-4deg] bg-white/60" aria-hidden="true" />
      </div>
    </div>
  );
}

function DashboardView() {
  const appts = [
    ["09:00", "Farah Naveed", "Scaling & polish", "Confirmed"],
    ["09:30", "Ali Hassan", "Root canal · #36", "In chair"],
    ["10:15", "Bilal Ahmed", "Crown fitting", "Lab ready"],
    ["11:00", "Sana Iqbal", "Extraction · #48", "Confirmed"],
  ];
  return (
    <div className="absolute inset-0 bg-navy p-5 sm:p-8">
      <div className="flex h-full flex-col rounded-xl bg-cream-2 p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">Today</p>
            <p className="font-display text-lg font-semibold text-navy sm:text-xl">Clinic Overview</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Synced
          </span>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
          {[["14", "Appointments"], ["3", "Lab cases due"], ["86%", "Chairs booked"]].map(([n, l]) => (
            <div key={l} className="rounded-lg border border-navy/5 bg-white p-2 sm:p-3">
              <p className="font-display text-lg font-bold text-navy sm:text-2xl">{n}</p>
              <p className="text-[9px] text-navy/60 sm:text-[11px]">{l}</p>
            </div>
          ))}
        </div>
        <ul className="flex-1 space-y-1.5 overflow-hidden sm:space-y-2">
          {appts.map(([t, n, p, s]) => (
            <li key={t} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-[11px] sm:text-xs">
              <span className="w-10 font-semibold text-navy">{t}</span>
              <span className="flex-1 truncate"><span className="font-medium text-navy">{n}</span> <span className="text-navy/50">· {p}</span></span>
              <span className="hidden rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-[#8a6d12] sm:inline">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);
  const update = useCallback((clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);
  return (
    <div
      ref={ref}
      className="relative aspect-[4/5] w-full touch-none select-none overflow-hidden rounded-2xl shadow-[0_30px_80px_rgba(15,29,61,.18)] sm:aspect-[16/10]"
      onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); update(e.clientX); }}
      onPointerMove={e => { if (dragging.current) update(e.clientX); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <DashboardView />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <PaperRecords />
      </div>
      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-navy/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">Before</span>
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-navy">With DentEase</span>
      <div className="pointer-events-none absolute inset-y-0 w-[3px] -translate-x-1/2 bg-gold shadow-[0_0_20px_rgba(212,175,55,.7)]" style={{ left: `${pos}%` }} />
      <button
        type="button"
        role="slider"
        aria-label="Compare paper records with the DentEase dashboard"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={e => {
          if (e.key === "ArrowLeft") setPos(p => Math.max(0, p - 5));
          if (e.key === "ArrowRight") setPos(p => Math.min(100, p + 5));
        }}
        className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-white bg-gold text-navy shadow-xl transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/40"
        style={{ left: `${pos}%` }}
      >
        <ArrowLeftRight className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ─── FAQ ITEM (accordion-down / accordion-up) ───────────── */
function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (inner.current) setH(inner.current.scrollHeight); }, [open, a]);
  const anim = !touched ? "" : open ? "animate-accordion-down" : "animate-accordion-up";
  return (
    <div className="border-b border-navy/10 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { setTouched(true); onToggle(); }}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors duration-300 hover:bg-cream-2 sm:px-8"
      >
        <span className="text-[15px] font-semibold text-navy sm:text-base">{q}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${open ? "rotate-180 border-gold bg-gold text-navy" : "border-navy/15 text-navy"}`}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <div
        className={`overflow-hidden ${anim}`}
        style={{ "--accordion-height": `${h}px`, height: touched ? undefined : open ? "auto" : 0 } as CSSProperties}
      >
        <div ref={inner} className="px-6 pb-6 text-[15px] leading-relaxed text-navy/70 sm:px-8">{a}</div>
      </div>
    </div>
  );
}

/* ─── DEMO REQUEST (multi-step + live summary) ───────────── */
function DemoForm() {
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [needs, setNeeds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinic, setClinic] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, hidden from real visitors
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const steps = ["Choose plan", "Clinic size", "Features needed", "Your details"];
  const canNext = [!!path, !!size, needs.length > 0, name.trim().length > 1 && phone.replace(/\D/g, "").length >= 7][step];
  const pathTitle = PATHS.find(p => p.id === path)?.title;

  const submit = async () => {
    if (!canNext || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, clinic, plan: pathTitle, clinicSize: size, features: needs, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send your request. Please try again.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your request. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setStep(0); setPath(null); setSize(null); setNeeds([]);
    setName(""); setPhone(""); setClinic(""); setDone(false); setError("");
  };

  const choice = (active: boolean) =>
    `rounded-xl border-2 p-4 text-left transition-all duration-500 hover:-translate-y-0.5 ${active ? "border-gold bg-gold/10 shadow-[0_10px_30px_rgba(212,175,55,.18)]" : "border-navy/10 bg-white hover:border-navy/25"}`;

  return (
    <div className="grid overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(15,29,61,.12)] lg:grid-cols-[1.5fr_1fr]">
      {done ? (
        <div className="flex animate-scale-in flex-col items-center justify-center p-10 text-center sm:p-14">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
            <Check className="h-8 w-8 text-gold" />
          </span>
          <h3 className="mt-6 font-display text-3xl font-semibold text-navy">Request received</h3>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-navy/65">
            Thank you, {name.trim()}. Our team will contact you on {phone} shortly.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg">
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp now
            </a>
            <button type="button" onClick={reset} className="rounded-full border border-navy/15 px-6 py-3 text-sm font-semibold text-navy transition-colors duration-300 hover:border-gold">
              Send another request
            </button>
          </div>
        </div>
      ) : (
      <div className="relative p-6 sm:p-10">
        {/* Step indicator */}
        <ol className="mb-8 flex flex-wrap gap-x-5 gap-y-2">
          {steps.map((s, i) => (
            <li key={s} className={`flex items-center gap-2 text-xs font-semibold transition-colors duration-500 ${i <= step ? "text-navy" : "text-navy/35"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-all duration-500 ${i < step ? "bg-gold text-navy" : i === step ? "bg-navy text-white" : "bg-navy/10 text-navy/50"}`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        <div key={step} className="animate-fade-up min-h-[230px]">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {PATHS.map(p => (
                <button key={p.id} type="button" onClick={() => setPath(p.id)} className={choice(path === p.id)}>
                  <p className="font-semibold text-navy">{p.title}</p>
                  <p className="mt-1 text-sm text-navy/60">{p.desc}</p>
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {SIZES.map(s => (
                <button key={s} type="button" onClick={() => setSize(s)} className={choice(size === s)}>
                  <Building2 className="mb-2 h-5 w-5 text-gold" />
                  <p className="font-semibold text-navy">{s}</p>
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {NEEDS.map(n => {
                const on = needs.includes(n);
                return (
                  <button key={n} type="button" aria-pressed={on} onClick={() => setNeeds(v => on ? v.filter(x => x !== n) : [...v, n])} className={`${choice(on)} flex items-center gap-3`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-300 ${on ? "border-gold bg-gold text-navy" : "border-navy/20"}`}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="font-medium text-navy">{n}</span>
                  </button>
                );
              })}
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy/60">Your name *</span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Ayesha Malik" className="w-full rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-navy outline-none transition-colors duration-300 focus:border-gold" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy/60">Phone / WhatsApp *</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="+92 300 1234567" className="w-full rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-navy outline-none transition-colors duration-300 focus:border-gold" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy/60">Clinic name</span>
                <input value={clinic} onChange={e => setClinic(e.target.value)} placeholder="Bright Smile Dental" className="w-full rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-navy outline-none transition-colors duration-300 focus:border-gold" />
              </label>
              <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              <p className="text-sm text-navy/60 sm:col-span-2">Our team will contact you on this number to set up your account or demo.</p>
              {error && <p role="alert" className="text-sm font-medium text-red-600 sm:col-span-2">{error}</p>}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="text-sm font-semibold text-navy/60 transition-colors duration-300 hover:text-navy disabled:invisible">
            <ArrowLeft className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden="true" />Back
          </button>
          {step < steps.length - 1 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep(s => s + 1)} className="inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3 text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-30">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={!canNext || sending} onClick={submit} className="btn-gold inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-sm font-semibold text-navy transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(212,175,55,.4)] disabled:cursor-not-allowed disabled:opacity-40">
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending…" : "Send request"}
            </button>
          )}
        </div>
      </div>
      )}

      {/* Live summary */}
      <aside className="relative overflow-hidden bg-navy p-6 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 animate-float-up rounded-full border border-gold/20" aria-hidden="true" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Your summary</p>
        <h3 className="mt-2 font-display text-2xl font-semibold">Tailored for your clinic</h3>
        <dl className="mt-8 space-y-5 text-sm">
          {[
            ["Plan", pathTitle],
            ["Clinic size", size],
            ["Features", needs.length ? needs.join(", ") : null],
            ["Contact", name ? `${name}${clinic ? ` · ${clinic}` : ""}` : null],
          ].map(([k, v]) => (
            <div key={k} className="border-b border-white/10 pb-4">
              <dt className="text-xs uppercase tracking-wider text-white/45">{k}</dt>
              <dd key={v ?? "empty"} className={`mt-1 animate-fade-in ${v ? "text-white" : "text-shimmer"}`}>{v ?? "Waiting for your choice…"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 flex items-center gap-2 text-xs text-white/50"><Clock className="h-3.5 w-3.5 text-gold" /> Our team usually replies within a few hours.</p>
      </aside>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showThankyou, setShowThankyou] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewClinic, setReviewClinic] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewWebsite, setReviewWebsite] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews")
      .then(r => (r.ok ? r.json() : []))
      .then((rows: { name: string; clinic: string | null; rating: number; review: string }[]) => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        setTestimonials(rows.map(r => ({ name: r.name, clinic: r.clinic ?? "", rating: r.rating, text: r.review })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Scroll-triggered reveals for every [data-reveal] element on the page
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.setAttribute("data-shown", ""); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll("[data-reveal]").forEach(el => obs.observe(el));
    return () => { window.removeEventListener("scroll", onScroll); obs.disconnect(); };
  }, []);

  const submitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (reviewSubmitting) return;
    const name = reviewName.trim();
    const text = reviewText.trim();
    if (name.length < 2) { setReviewError("Please enter your name."); return; }
    if (text.length < 10) { setReviewError("Please write at least 10 characters in your review."); return; }
    setReviewError("");
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clinic: reviewClinic.trim(), review: text, rating: reviewRating, website: reviewWebsite }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setReviewError(data.error || "Could not submit your review. Please try again."); return; }
      setShowThankyou(true);
      setReviewName(""); setReviewClinic(""); setReviewText(""); setReviewRating(5);
    } catch {
      setReviewError("Network error. Please check your connection and try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const goldBtn = "btn-gold inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-navy transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(212,175,55,.45)]";
  const ghostBtn = "inline-flex items-center justify-center gap-2 rounded-full border border-white/35 px-7 py-3.5 text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-0.5 hover:border-gold hover:text-gold";
  const sectionHead = "mt-4 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight";

  return (
    <div className="de-landing overflow-x-hidden">
      {/* THANK YOU POPUP */}
      {showThankyou && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm animate-scale-in rounded-3xl bg-white p-10 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
              <Check className="h-8 w-8 text-gold" />
            </div>
            <h3 className="font-display text-3xl font-semibold text-navy">Thank you</h3>
            <p className="mt-3 text-sm leading-relaxed text-navy/65">Your review has been submitted. We truly appreciate you taking the time to share your experience.</p>
            <button onClick={() => setShowThankyou(false)} className="mt-8 rounded-full bg-navy px-8 py-3 text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg">
              Back to page
            </button>
          </div>
        </div>
      )}

      {/* LIVE CHAT / WHATSAPP */}
      <a href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="Chat with DentEase on WhatsApp"
        className="group fixed bottom-5 right-5 z-[999] flex items-center gap-3 rounded-full bg-navy py-2 pl-2 pr-5 text-white shadow-[0_14px_40px_rgba(15,29,61,.35)] ring-1 ring-gold/30 transition-all duration-500 hover:-translate-y-1">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gold text-navy">
          <MessageCircle className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 animate-pulse rounded-full border-2 border-navy bg-emerald-500" />
          </span>
        </span>
        <span className="hidden text-sm font-semibold sm:block">Live support</span>
      </a>

      {/* NAVBAR */}
      <nav aria-label="Main navigation" className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? "bg-navy/95 shadow-[0_10px_30px_rgba(0,0,0,.25)] backdrop-blur-md" : "bg-navy"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="DentEase home"><Wordmark /></Link>
          <div className="hidden items-center gap-9 lg:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="relative text-sm font-medium text-white/75 transition-colors duration-300 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-500 hover:text-white hover:after:scale-x-100">
                {label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors duration-300 hover:text-gold">
              <LogIn className="h-4 w-4" /> Login
            </Link>
            <a href="#demo" className={goldBtn.replace("px-7 py-3.5", "px-5 py-2.5")}>Book a demo</a>
          </div>
          <button type="button" className="text-white lg:hidden" onClick={() => setMobileMenu(v => !v)} aria-label={mobileMenu ? "Close menu" : "Open menu"} aria-expanded={mobileMenu}>
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="animate-fade-in border-t border-white/10 bg-navy px-4 pb-6 pt-2 lg:hidden">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block border-b border-white/5 py-3 text-white/80">{label}</a>
            ))}
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/login" className={ghostBtn}><LogIn className="h-4 w-4" /> Login</Link>
              <a href="#demo" onClick={() => setMobileMenu(false)} className={goldBtn}>Book a demo</a>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* ── HERO ── */}
        <section aria-label="Hero" className="relative flex min-h-[calc(100svh-72px)] items-center overflow-hidden bg-navy">
          <div className="absolute inset-0 animate-fade-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/patient-records.webp" alt="" className="h-full w-full animate-ken-burns object-cover" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,29,61,.82)_0%,rgba(15,29,61,.72)_45%,rgba(15,29,61,.96)_100%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute left-[8%] top-[22%] hidden h-24 w-24 animate-float-up rounded-full border border-gold/30 md:block" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-[18%] right-[10%] hidden h-3 w-3 animate-float-up rounded-full bg-gold md:block" style={{ animationDelay: "1s" }} aria-hidden="true" />

          <div className="relative mx-auto w-full max-w-4xl px-4 py-24 text-center sm:px-6">
            <LogoMark draw className="mx-auto mb-8 h-20 w-20 text-white sm:h-24 sm:w-24" />
            <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <Eyebrow light>Dental clinic management software</Eyebrow>
            </div>
            <h1 className="mt-6 animate-fade-up text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-[1.05] tracking-tight text-white" style={{ animationDelay: "350ms" }}>
              Run your practice with <span className="text-shimmer italic">quiet confidence</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-base font-light leading-relaxed text-white/75 sm:text-lg" style={{ animationDelay: "500ms" }}>
              Appointments, patient records, billing and staff schedules brought together in one elegant, cloud-based workspace, built for the way modern dental clinics operate.
            </p>
            <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "650ms" }}>
              <Link href="/login" className={goldBtn}>Start free today <ArrowRight className="h-4 w-4" /></Link>
              <a href="#demo" className={ghostBtn}>Book a free demo</a>
            </div>
            <div className="mt-12 flex animate-fade-in flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-white/70" style={{ animationDelay: "900ms" }}>
              {[[Cloud, "Cloud-based"], [Lock, "Secure & encrypted"], [CalendarCheck, "Free demo"]].map(([Icon, label], i) => {
                const I = Icon as typeof Cloud;
                return (
                  <span key={label as string} className="flex items-center gap-2">
                    {i > 0 && <span className="mr-4 hidden h-1 w-1 rounded-full bg-gold sm:block" aria-hidden="true" />}
                    <I className="h-4 w-4 text-gold" /> {label as string}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" aria-label="Features" className="scroll-mt-20 bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <div {...rv()}><Eyebrow>Our features</Eyebrow></div>
              <h2 {...rv(100)} className={`${sectionHead} text-navy`}>Everything your clinic needs, beautifully organised</h2>
              <p {...rv(200)} className="mt-5 text-base leading-relaxed text-navy/65">From the first phone call to the final receipt, DentEase keeps every part of the patient journey in one place.</p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <article key={f.title} {...rv(i * 110)} className="group relative overflow-hidden rounded-2xl border border-navy/8 bg-cream-2 p-8 transition-all duration-700 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_24px_60px_rgba(15,29,61,.10)]">
                  <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-gold transition-transform duration-700 group-hover:scale-x-100" aria-hidden="true" />
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-gold transition-transform duration-700 group-hover:-rotate-6 group-hover:scale-110">
                    <f.icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold text-navy">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-navy/65">{f.desc}</p>
                  <a href="#demo" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition-colors duration-300 hover:text-gold">
                    Learn more <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── BEFORE / AFTER ── */}
        <section id="workflow" aria-label="Before and after DentEase" className="scroll-mt-20 bg-cream py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <div {...rv()}><Eyebrow>The transformation</Eyebrow></div>
              <h2 {...rv(100)} className={`${sectionHead} text-navy`}>From paper registers to a clear daily view</h2>
              <p {...rv(200)} className="mt-5 text-base leading-relaxed text-navy/65">
                Lost files, double bookings and sticky-note reminders cost your clinic time every single day. Drag the gold line to see what your front desk looks like once everything lives in DentEase.
              </p>
              <ul className="mt-8 space-y-4">
                {["Every appointment confirmed and visible to the whole team", "Lab cases tracked with clear due dates", "Patient files found in seconds, not minutes"].map((t, i) => (
                  <li key={t} {...rv(280 + i * 90)} className="flex items-start gap-3 text-[15px] text-navy">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-navy"><Check className="h-3 w-3" strokeWidth={3} /></span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div {...rv(150, "scale")}><BeforeAfter /></div>
          </div>
        </section>

        {/* ── WHY DENTEASE ── */}
        <section id="why" aria-label="Why choose DentEase" className="scroll-mt-20 bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <div {...rv()}><Eyebrow>Why choose DentEase</Eyebrow></div>
              <h2 {...rv(100)} className={`${sectionHead} text-navy`}>Built on three simple principles</h2>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {PRINCIPLES.map((p, i) => (
                <article key={p.title} {...rv(i * 140)} className="group rounded-2xl bg-navy p-10 text-white shadow-[0_24px_60px_rgba(15,29,61,.18)] transition-transform duration-700 hover:-translate-y-2">
                  <span className="font-display text-sm text-gold">0{i + 1}</span>
                  <p.icon className="mt-6 h-10 w-10 text-gold transition-transform duration-700 group-hover:scale-110" strokeWidth={1.5} />
                  <h3 className="mt-6 font-display text-2xl font-semibold">{p.title}</h3>
                  <span className="mt-4 block h-px w-12 bg-gold transition-all duration-700 group-hover:w-24" aria-hidden="true" />
                  <p className="mt-5 text-[15px] leading-relaxed text-white/70">{p.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="reviews" aria-label="Reviews" className="scroll-mt-20 overflow-hidden bg-cream-2 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <div {...rv()}><Eyebrow>{testimonials.length > 0 ? "Testimonials" : "Reviews"}</Eyebrow></div>
            <h2 {...rv(100)} className={`${sectionHead} text-navy`}>
              {testimonials.length > 0 ? "Trusted by dental professionals" : "Share your experience"}
            </h2>
          </div>
          {/* Only real, approved reviews from /api/reviews are shown; nothing is rendered until some exist */}
          {testimonials.length > 0 && (
          <div {...rv(200, "fade")} className="relative mt-16 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <div className="marquee-track flex w-max animate-marquee gap-6">
              {/* Repeat an even number of times so the -50% marquee loop is seamless and the strip is never short */}
              {Array.from({ length: 2 * Math.max(2, Math.ceil(6 / testimonials.length)) }, () => testimonials).flat().map((t, i) => (
                <article key={i} aria-hidden={i >= testimonials.length} className="w-[320px] shrink-0 rounded-2xl border border-navy/8 bg-white p-8 shadow-[0_10px_30px_rgba(15,29,61,.06)] sm:w-[380px]">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, s) => <Star key={s} className={`h-4 w-4 ${s < t.rating ? "fill-gold text-gold" : "text-navy/15"}`} />)}
                    </div>
                    <Quote className="h-6 w-6 text-gold/40" />
                  </div>
                  <p className="mt-5 text-[15px] leading-relaxed text-navy/80">&ldquo;{t.text}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-navy/8 pt-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-display text-sm font-semibold text-gold">
                      {t.name.replace(/^Dr\.?\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">{t.name}</p>
                      <p className="text-xs text-navy/55">{t.clinic}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          )}

          {/* Share your experience */}
          <div {...rv(100)} className="mx-auto mt-20 max-w-2xl px-4 sm:px-6">
            <form onSubmit={submitReview} noValidate className="relative rounded-2xl border border-navy/8 bg-white p-6 shadow-[0_10px_30px_rgba(15,29,61,.06)] sm:p-8">
              <h3 className="font-display text-2xl font-semibold text-navy">Share your experience</h3>
              <p className="mt-1 text-sm text-navy/60">Using DentEase in your clinic? We would love to hear from you.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <input value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="Your name *" aria-label="Your name" name="name" required maxLength={80} autoComplete="name" className="rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-sm text-navy outline-none transition-colors duration-300 focus:border-gold" />
                <input value={reviewClinic} onChange={e => setReviewClinic(e.target.value)} placeholder="Clinic name" aria-label="Clinic name" name="clinic" maxLength={120} autoComplete="organization" className="rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-sm text-navy outline-none transition-colors duration-300 focus:border-gold" />
              </div>
              <input type="text" value={reviewWebsite} onChange={e => setReviewWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Your review *" aria-label="Your review" name="review" required maxLength={1000} rows={3} className="mt-3 w-full resize-none rounded-xl border-2 border-navy/10 bg-cream-2 px-4 py-3 text-sm text-navy outline-none transition-colors duration-300 focus:border-gold" />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" role="radio" aria-checked={s === reviewRating} aria-label={`${s} star${s > 1 ? "s" : ""}`} onClick={() => setReviewRating(s)} className="transition-transform duration-300 hover:scale-125">
                      <Star className={`h-6 w-6 ${s <= reviewRating ? "fill-gold text-gold" : "text-navy/20"}`} />
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={reviewSubmitting} className="rounded-full bg-navy px-7 py-3 text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                  {reviewSubmitting ? "Submitting..." : "Submit review"}
                </button>
              </div>
              {reviewError && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{reviewError}</p>}
            </form>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" aria-label="Frequently asked questions" className="scroll-mt-20 bg-cream py-24 sm:py-32">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <div {...rv()}><Eyebrow>FAQ</Eyebrow></div>
              <h2 {...rv(100)} className={`${sectionHead} text-navy`}>Questions, answered</h2>
            </div>
            <div {...rv(200)} className="mt-14 overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,29,61,.08)]">
              {FAQS.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* ── DEMO / CTA ── */}
        <section id="demo" aria-label="Book a demo" className="relative scroll-mt-20 overflow-hidden bg-white py-24 sm:py-32">
          <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 animate-float-up rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <div {...rv()}><Eyebrow>Get started</Eyebrow></div>
              <h2 {...rv(100)} className={`${sectionHead} text-navy`}>Let&apos;s set up DentEase for your clinic</h2>
              <p {...rv(200)} className="mt-5 text-base leading-relaxed text-navy/65">Answer three quick questions and our team will tailor your onboarding or demo to exactly what your practice needs.</p>
            </div>
            <div {...rv(250, "scale")} className="mt-14"><DemoForm /></div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer aria-label="Footer" className="bg-navy text-white/60">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-20 sm:px-6">
          <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
            <div {...rv()}>
              <Wordmark />
              <p className="mt-5 max-w-xs text-sm leading-relaxed">Elegant, secure clinic management for modern dental practices: appointments, records, billing and staff in one place.</p>
              <div className="mt-6 flex gap-3">
                {[[MessageCircle, WHATSAPP, "WhatsApp"], [Phone, PHONE_TEL, "Call us"]].map(([Icon, href, label]) => {
                  const I = Icon as typeof Phone;
                  return (
                    <a key={label as string} href={href as string} target={(href as string).startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={label as string}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition-all duration-500 hover:-translate-y-0.5 hover:border-gold hover:bg-gold hover:text-navy">
                      <I className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
            <div {...rv(100)}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Product</h4>
              <ul className="mt-5 space-y-3 text-sm">
                {NAV.map(([href, label]) => <li key={href}><a href={href} className="transition-colors duration-300 hover:text-white">{label}</a></li>)}
              </ul>
            </div>
            <div {...rv(200)}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Account</h4>
              <ul className="mt-5 space-y-3 text-sm">
                <li><Link href="/login" className="transition-colors duration-300 hover:text-white">Login</Link></li>
                <li><Link href="/login" className="transition-colors duration-300 hover:text-white">Create free account</Link></li>
                <li><a href="#demo" className="transition-colors duration-300 hover:text-white">Book a demo</a></li>
              </ul>
            </div>
            <div {...rv(300)}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Contact</h4>
              <ul className="mt-5 space-y-4 text-sm">
                <li><a href={PHONE_TEL} className="flex items-center gap-3 transition-colors duration-300 hover:text-white"><Phone className="h-4 w-4 text-gold" /> {PHONE_DISPLAY}</a></li>
                <li><a href={WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-3 transition-colors duration-300 hover:text-white"><MessageCircle className="h-4 w-4 text-gold" /> WhatsApp support</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-xs sm:flex-row">
            <p>© {new Date().getFullYear()} DentEase. All rights reserved.</p>
            <p>Developed by <a href={WHATSAPP} target="_blank" rel="noreferrer" className="text-gold transition-colors duration-300 hover:text-gold-soft">Junaid Mazhar</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
