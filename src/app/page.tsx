"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ─── DATA ─────────────────────────────────────────────── */
const FEATURES = [
  { title: "Patient Records", desc: "Complete patient history, visit records, medical notes and FDI tooth chart — all searchable instantly.", img: "/images/patient-records.webp", tag: "Complete history" },
  { title: "Smart Appointments", desc: "Book, reschedule and track appointments easily. See today's full schedule at a glance.", img: "/images/appointments.webp", tag: "Auto scheduling" },
  { title: "Lab Records & FDI Chart", desc: "Track lab work with interactive FDI tooth chart, delivery dates and material types.", img: "/images/lab-records.webp", tag: "FDI standard" },
  { title: "Revenue & Reports", desc: "Monthly income charts, doctor performance tracking and expense management.", img: "/images/revenue-reports.webp", tag: "Visual analytics" },
  { title: "Staff Management", desc: "Add doctors, set role-based permissions and manage login access for your whole team.", img: "/images/staff-management.webp", tag: "Role permissions" },
  { title: "WhatsApp Reminders", desc: "Send appointment confirmations and payment reminders directly via WhatsApp.", img: "/images/whatsapp-reminders.webp", tag: "Coming soon" },
];

const FAQS = [
  { q: "Is DentEase really free?", a: "Yes! DentEase is completely free to use. No hidden charges, no credit card required." },
  { q: "Can multiple doctors use the same account?", a: "Yes, you can add multiple staff members with different role-based permissions." },
  { q: "Is my patient data secure?", a: "Absolutely. Your data is encrypted and stored securely. Only your clinic can access it." },
  { q: "Does it work on mobile and desktop?", a: "Yes, DentEase works on all devices — desktop, tablet, and mobile browsers." },
  { q: "Can I install it as an app?", a: "Yes! DentEase can be installed as a PWA on your phone or desktop — no app store needed." },
];

const STATS = [
  { num: 500, suffix: "+", label: "Clinics using DentEase" },
  { num: 50000, suffix: "+", label: "Patients managed" },
  { num: 99, suffix: ".9%", label: "Uptime guaranteed" },
  { num: 100, suffix: "%", label: "Free forever" },
];

/* ─── HOOKS ─────────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(target: number, active: boolean, duration = 1800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return val;
}

/* ─── ANIMATED SECTION WRAPPER ─────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0px)" : "translateY(40px)",
      transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ─── ANIMATED WORD ─────────────────────────────────────── */
function AnimatedWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIndex(p => (p + 1) % words.length); setVisible(true); }, 300);
    }, 2500);
    return () => clearInterval(t);
  }, [words]);
  return (
    <span style={{
      color: "#6366F1", fontStyle: "italic",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      display: "inline-block",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    }}>
      {words[index]}
    </span>
  );
}

/* ─── WAVE BACKGROUND ───────────────────────────────────── */
function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let id: number, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener("mousemove", onMouse);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.007;
      const mx = mouseRef.current.x;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.5);
        for (let x = 0; x <= canvas.width; x += 4) {
          const y = canvas.height * 0.5
            + Math.sin(x * 0.003 + t + i * 0.8) * (55 + i * 18 + mx * 20)
            + Math.sin(x * 0.007 + t * 1.3 + i) * 28;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height); ctx.closePath();
        ctx.fillStyle = `rgba(99,102,241,${0.035 + i * 0.018})`; ctx.fill();
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMouse); };
  }, []);
  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ─── MOUSE PARALLAX BACKGROUND ────────────────────────── */
function MouseParallaxBg() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 24;
      const y = (e.clientY / window.innerHeight - 0.5) * 24;
      ref.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <div aria-hidden="true" ref={ref} style={{ position: "absolute", inset: "-40px", transition: "transform 0.12s ease-out", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: "15%", left: "10%", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: "50%", right: "8%", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(147,197,253,0.18) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "35%", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(196,181,253,0.15) 0%, transparent 70%)" }} />
    </div>
  );
}

/* ─── FEATURE SLIDER ────────────────────────────────────── */
function FeatureSlider() {
  const [active, setActive] = useState(0);
  const total = FEATURES.length;
  const prev = () => setActive(i => (i - 1 + total) % total);
  const next = () => setActive(i => (i + 1) % total);
  const gi = (o: number) => (active + o + total) % total;

  return (
    <div>
      {/* Mobile */}
      <div className="md:hidden">
        <div style={{ borderRadius: "20px", overflow: "hidden", boxShadow: "0 12px 40px rgba(10,22,40,0.12)", background: "#fff", marginBottom: "20px", transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
          <div style={{ height: "220px", overflow: "hidden", position: "relative" }}>
            <img src={FEATURES[active].img} alt={FEATURES[active].title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1)", transform: "scale(1.04)" }} loading="lazy" />
            <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(255,255,255,0.92)", borderRadius: "999px", padding: "5px 12px", fontSize: "11px", fontWeight: 600, color: "#0A1628" }}>{FEATURES[active].tag}</div>
          </div>
          <div style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0A1628", marginBottom: "8px" }}>{FEATURES[active].title}</h3>
            <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.7 }}>{FEATURES[active].desc}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px" }}>
          <button onClick={prev} aria-label="Previous" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1.5px solid rgba(10,22,40,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <div style={{ display: "flex", gap: "6px" }}>
            {FEATURES.map((_, i) => <button key={i} onClick={() => setActive(i)} aria-label={`Slide ${i + 1}`} style={{ width: i === active ? "20px" : "7px", height: "7px", borderRadius: "999px", border: "none", background: i === active ? "#0A1628" : "rgba(10,22,40,0.2)", cursor: "pointer", transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)", padding: 0 }} />)}
          </div>
          <button onClick={next} aria-label="Next" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1.5px solid rgba(10,22,40,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "420px" }}>
          {/* Left */}
          <div onClick={prev} style={{ width: "200px", height: "300px", borderRadius: "20px", overflow: "hidden", cursor: "pointer", opacity: 0.45, transform: "scale(0.88) translateX(10px)", transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)", flexShrink: 0, position: "relative" }}
            onMouseOver={e => { e.currentTarget.style.opacity = "0.65"; e.currentTarget.style.transform = "scale(0.91) translateX(10px)"; }}
            onMouseOut={e => { e.currentTarget.style.opacity = "0.45"; e.currentTarget.style.transform = "scale(0.88) translateX(10px)"; }}>
            <img src={FEATURES[gi(-1)].img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
            <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.25)" }} />
          </div>
          {/* Center */}
          <div style={{ width: "390px", borderRadius: "24px", overflow: "hidden", boxShadow: "0 28px 70px rgba(10,22,40,0.18)", transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)", flexShrink: 0, background: "#fff" }}>
            <div style={{ height: "250px", overflow: "hidden", position: "relative" }}>
              <img src={FEATURES[active].img} alt={FEATURES[active].title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1)", transform: "scale(1.06)" }} loading="lazy" />
              <div style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderRadius: "999px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, color: "#0A1628" }}>{FEATURES[active].tag}</div>
            </div>
            <div style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0A1628", marginBottom: "10px", letterSpacing: "-0.5px" }}>{FEATURES[active].title}</h3>
              <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.7 }}>{FEATURES[active].desc}</p>
            </div>
          </div>
          {/* Right */}
          <div onClick={next} style={{ width: "200px", height: "300px", borderRadius: "20px", overflow: "hidden", cursor: "pointer", opacity: 0.45, transform: "scale(0.88) translateX(-10px)", transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)", flexShrink: 0, position: "relative" }}
            onMouseOver={e => { e.currentTarget.style.opacity = "0.65"; e.currentTarget.style.transform = "scale(0.91) translateX(-10px)"; }}
            onMouseOut={e => { e.currentTarget.style.opacity = "0.45"; e.currentTarget.style.transform = "scale(0.88) translateX(-10px)"; }}>
            <img src={FEATURES[gi(1)].img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
            <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.25)" }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "32px" }}>
          <button onClick={prev} aria-label="Previous"
            style={{ width: "44px", height: "44px", borderRadius: "50%", border: "1.5px solid rgba(10,22,40,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s" }}
            onMouseOver={e => { e.currentTarget.style.background = "#0A1628"; (e.currentTarget.querySelector("svg") as SVGSVGElement)?.setAttribute("stroke", "#fff"); }}
            onMouseOut={e => { e.currentTarget.style.background = "#fff"; (e.currentTarget.querySelector("svg") as SVGSVGElement)?.setAttribute("stroke", "#0A1628"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <div style={{ display: "flex", gap: "6px" }}>
            {FEATURES.map((_, i) => <button key={i} onClick={() => setActive(i)} aria-label={`Slide ${i + 1}`} style={{ width: i === active ? "24px" : "8px", height: "8px", borderRadius: "999px", border: "none", background: i === active ? "#0A1628" : "rgba(10,22,40,0.2)", cursor: "pointer", transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)", padding: 0 }} />)}
          </div>
          <button onClick={next} aria-label="Next"
            style={{ width: "44px", height: "44px", borderRadius: "50%", border: "1.5px solid rgba(10,22,40,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s" }}
            onMouseOver={e => { e.currentTarget.style.background = "#0A1628"; (e.currentTarget.querySelector("svg") as SVGSVGElement)?.setAttribute("stroke", "#fff"); }}
            onMouseOut={e => { e.currentTarget.style.background = "#fff"; (e.currentTarget.querySelector("svg") as SVGSVGElement)?.setAttribute("stroke", "#0A1628"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
        <p style={{ textAlign: "center", marginTop: "14px", fontSize: "13px", color: "#9CA3AF" }}>{active + 1} / {total} — {FEATURES[active].title}</p>
      </div>
    </div>
  );
}

/* ─── STAT CARD ─────────────────────────────────────────── */
function StatCard({ num, suffix, label, active }: { num: number; suffix: string; label: string; active: boolean }) {
  const val = useCountUp(num, active);
  return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "16px 18px", border: "1px solid rgba(99,102,241,0.1)", transition: "transform 0.3s ease, box-shadow 0.3s ease" }}
      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(10,22,40,0.1)"; }}
      onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ fontSize: "24px", fontWeight: 800, color: "#0A1628", letterSpacing: "-1px" }}>
        {num >= 1000 ? Math.floor(val / 1000) + "K" : val}{suffix}
      </div>
      <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "3px" }}>{label}</div>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────── */
export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showThankyou, setShowThankyou] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewClinic, setReviewClinic] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsActive, setStatsActive] = useState(false);

  useEffect(() => {
    // Hero entrance
    const t1 = setTimeout(() => setHeroReady(true), 80);
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    // Stats observer
    const statsEl = statsRef.current;
    if (statsEl) {
      const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsActive(true); obs.disconnect(); } }, { threshold: 0.3 });
      obs.observe(statsEl);
      return () => { clearTimeout(t1); window.removeEventListener("scroll", onScroll); obs.disconnect(); };
    }
    return () => { clearTimeout(t1); window.removeEventListener("scroll", onScroll); };
  }, []);

  const submitReview = () => {
    if (!reviewName || !reviewText) return;
    setShowThankyou(true);
    setReviewName(""); setReviewClinic(""); setReviewText(""); setReviewRating(5);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:'Plus Jakarta Sans',sans-serif;background:#EEF2FF;color:#0A1628;overflow-x:hidden;}
        .nav-link{color:#0A1628;font-size:14px;font-weight:500;text-decoration:none;transition:opacity 0.2s;}
        .nav-link:hover{opacity:0.55;}
        .faq-border{border-bottom:1px solid rgba(10,22,40,0.07);}
        .faq-border:last-child{border-bottom:none;}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(32px);}to{opacity:1;transform:translateY(0);}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes imgZoom{from{transform:scale(1.12);}to{transform:scale(1.04);}}
        .hero-img{animation:imgZoom 1.2s cubic-bezier(0.22,1,0.36,1) forwards;}
        .scale-in{animation:scaleIn 0.32s cubic-bezier(0.22,1,0.36,1) forwards;}
        @media(max-width:767px){
          .hide-mobile{display:none!important;}
          .mobile-grid-1{grid-template-columns:1fr!important;}
          .md\\:hidden{display:block!important;}
          .hidden.md\\:block{display:none!important;}
        }
        @media(min-width:768px){
          .md\\:hidden{display:none!important;}
          .hidden.md\\:block{display:block!important;}
        }
        .cta-btn{background:#0A1628;color:#fff;border-radius:999px;padding:16px 36px;font-size:16px;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:all 0.3s cubic-bezier(0.22,1,0.36,1);box-shadow:0 4px 24px rgba(10,22,40,0.15);}
        .cta-btn:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 18px 48px rgba(10,22,40,0.28);}
        .cta-btn-white{background:#fff;color:#0A1628;border-radius:999px;padding:16px 40px;font-size:16px;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:all 0.3s cubic-bezier(0.22,1,0.36,1);}
        .cta-btn-white:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 18px 48px rgba(255,255,255,0.25);}
        .nav-btn{background:#0A1628;color:#fff;border-radius:999px;padding:10px 22px;font-size:14px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.25s;}
        .nav-btn:hover{opacity:0.82;transform:translateY(-1px);}
      `}</style>

      {/* THANK YOU POPUP */}
      {showThankyou && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,22,40,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div className="scale-in" style={{ background: "#fff", borderRadius: "24px", padding: "44px 32px", maxWidth: "380px", width: "100%", textAlign: "center", boxShadow: "0 40px 100px rgba(10,22,40,0.25)" }}>
            <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <img src="/images/dentease-logo.webp" alt="DentEase" style={{ height: "32px", objectFit: "contain", margin: "0 auto 16px", display: "block" }} />
            <h3 style={{ fontSize: "26px", fontWeight: 800, color: "#0A1628", marginBottom: "8px", fontStyle: "italic" }}>Thank You!</h3>
            <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.7, marginBottom: "28px" }}>Your review has been submitted successfully. We really appreciate your feedback!</p>
            <button onClick={() => setShowThankyou(false)} style={{ padding: "13px 36px", borderRadius: "999px", background: "#0A1628", color: "#fff", border: "none", fontWeight: 700, fontSize: "14px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(10,22,40,0.2)"; }} onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP FLOAT */}
      <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
        style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 999, width: "54px", height: "54px", borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(37,211,102,0.45)", transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)" }}
        onMouseOver={e => e.currentTarget.style.transform = "scale(1.12) translateY(-2px)"}
        onMouseOut={e => e.currentTarget.style.transform = "scale(1) translateY(0)"}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
      </a>

      {/* NAVBAR */}
      <nav role="navigation" aria-label="Main navigation" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", borderBottom: navScrolled ? "1px solid rgba(10,22,40,0.07)" : "none", boxShadow: navScrolled ? "0 2px 24px rgba(10,22,40,0.07)" : "none", transition: "all 0.3s ease" }}>
        <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" aria-label="DentEase Home">
            <img src="/images/dentease-logo.webp" alt="DentEase" style={{ height: "56px", objectFit: "contain", display: "block", background: "none", transition: "transform 0.2s" }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.03)"} onMouseOut={e => e.currentTarget.style.transform = "scale(1)"} />
          </Link>
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: "36px" }}>
            {[["#features", "Features"], ["#how-it-works", "How it works"], ["#reviews", "Reviews"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={label} href={href} className="nav-link">{label}</a>
            ))}
          </div>
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a href="tel:+923105913101" className="nav-link" style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3 3.18 2 2 0 0 1 4.11 1h3a2 2 0 0 1 2 1.72 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              +92 310 5913101
            </a>
            <Link href="/login"><button className="nav-btn">Get Started Free <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg></button></Link>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label={mobileMenu ? "Close menu" : "Open menu"} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {mobileMenu ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </div>
        {mobileMenu && (
          <div style={{ padding: "14px 24px 20px", borderTop: "1px solid rgba(10,22,40,0.06)", background: "#fff", display: "flex", flexDirection: "column", gap: "14px", animation: "fadeSlideUp 0.3s ease" }}>
            {[["features", "Features"], ["how-it-works", "How it works"], ["reviews", "Reviews"], ["faq", "FAQ"]].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="nav-link" style={{ padding: "6px 0", borderBottom: "1px solid rgba(10,22,40,0.05)" }} onClick={() => setMobileMenu(false)}>{label}</a>
            ))}
            <a href="tel:+923105913101" className="nav-link" style={{ padding: "6px 0" }}>📞 +92 310 5913101</a>
            <Link href="/login"><button style={{ width: "100%", padding: "13px", borderRadius: "999px", fontSize: "14px", fontWeight: 700, color: "#fff", background: "#0A1628", border: "none", cursor: "pointer" }}>Get Started Free</button></Link>
          </div>
        )}
      </nav>

      <main>
        {/* ── HERO ── */}
        <section aria-label="Hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px", background: "linear-gradient(160deg,#dde8ff 0%,#e8eeff 40%,#d8e4ff 100%)", position: "relative", overflow: "hidden" }}>
          <WaveBackground />
          <MouseParallaxBg />
          <div style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "999px", padding: "8px 18px", marginBottom: "28px", background: "rgba(255,255,255,0.75)", border: "1px solid rgba(10,22,40,0.1)", backdropFilter: "blur(10px)", opacity: heroReady ? 1 : 0, transform: heroReady ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.7s ease 0.1s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22C55E", display: "inline-block" }} aria-hidden="true" />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#0A1628" }}>Now accepting new clinics worldwide</span>
            </div>
            {/* H1 */}
            <h1 style={{ fontSize: "clamp(36px, 7vw, 84px)", fontWeight: 800, lineHeight: 1.05, color: "#0A1628", letterSpacing: "-2px", marginBottom: "24px", opacity: heroReady ? 1 : 0, transform: heroReady ? "translateY(0)" : "translateY(32px)", transition: "opacity 0.8s ease 0.2s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s" }}>
              Smarter way to <AnimatedWord words={["manage", "grow", "run", "track"]} />
              <br />your dental clinic
            </h1>
            {/* Sub */}
            <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#4B5563", lineHeight: 1.7, maxWidth: "500px", margin: "0 auto 40px", opacity: heroReady ? 1 : 0, transform: heroReady ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.8s ease 0.35s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.35s" }}>
              Patients, appointments, lab records and revenue — all in one beautifully simple platform. Free to use. No paperwork.
            </p>
            {/* CTA */}
            <div style={{ opacity: heroReady ? 1 : 0, transform: heroReady ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.8s ease 0.5s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s" }}>
              <Link href="/login"><button className="cta-btn">
                Get started free — it takes 30 seconds
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
              </button></Link>
            </div>
            {/* Trust badges */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", marginTop: "36px", flexWrap: "wrap", opacity: heroReady ? 1 : 0, transition: "opacity 0.8s ease 0.65s" }}>
              {["500+ clinics", "No credit card", "Free forever"].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                  <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" aria-label="Features" style={{ background: "#EEF2FF", padding: "80px 0", overflow: "hidden" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
            <Reveal><div style={{ textAlign: "center", marginBottom: "10px" }}><span style={{ fontSize: "12px", fontWeight: 700, color: "#6366F1", letterSpacing: "1.5px", textTransform: "uppercase" }}>+ OUR FEATURES</span></div></Reveal>
            <Reveal delay={80}>
              <h2 style={{ textAlign: "center", fontSize: "clamp(26px, 5vw, 52px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: "48px" }}>
                <span style={{ color: "#6366F1", fontStyle: "italic" }}>Everything</span> your clinic needs,<br />under one roof
              </h2>
            </Reveal>
            <Reveal delay={160}><FeatureSlider /></Reveal>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" aria-label="How it works" style={{ background: "#fff", padding: "80px 0" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
            <Reveal><div style={{ textAlign: "center", marginBottom: "10px" }}><span style={{ fontSize: "12px", fontWeight: 700, color: "#6366F1", letterSpacing: "1.5px", textTransform: "uppercase" }}>+ HOW IT WORKS</span></div></Reveal>
            <Reveal delay={80}>
              <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 48px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", marginBottom: "44px" }}>
                Up and running in <span style={{ color: "#6366F1", fontStyle: "italic" }}>3 simple steps</span>
              </h2>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "20px" }}>
              {[
                { step: "01", title: "Create your account", desc: "Sign up free in 30 seconds. No credit card. No setup fee. Just your email.", icon: "👤" },
                { step: "02", title: "Add your clinic & staff", desc: "Set up your clinic profile, add doctors and configure role-based permissions.", icon: "🏥" },
                { step: "03", title: "Start managing", desc: "Add patients, book appointments, track lab work and monitor revenue instantly.", icon: "🚀" },
              ].map((item, i) => (
                <Reveal key={item.step} delay={i * 120}>
                  <div style={{ background: "#F8FAFF", borderRadius: "20px", padding: "28px", border: "1px solid rgba(99,102,241,0.1)", position: "relative", overflow: "hidden", height: "100%", transition: "transform 0.3s ease, box-shadow 0.3s ease" }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(10,22,40,0.1)"; }}
                    onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    <div style={{ position: "absolute", top: "12px", right: "16px", fontSize: "44px", fontWeight: 900, color: "rgba(99,102,241,0.07)", lineHeight: 1 }} aria-hidden="true">{item.step}</div>
                    <div style={{ fontSize: "32px", marginBottom: "14px" }} aria-hidden="true">{item.icon}</div>
                    <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0A1628", marginBottom: "8px" }}>{item.title}</h3>
                    <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.7 }}>{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── IMAGE + STATS ── */}
        <section aria-label="Why DentEase" style={{ background: "#EEF2FF", padding: "80px 0" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }} className="mobile-grid-1">
              {/* Image grid with parallax feel */}
              <Reveal>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[
                    { src: "/images/patient-records.webp", alt: "Patient records", mt: "0" },
                    { src: "/images/revenue-reports.webp", alt: "Revenue reports", mt: "24px" },
                    { src: "/images/lab-records.webp", alt: "Lab records", mt: "0" },
                    { src: "/images/staff-management.webp", alt: "Staff management", mt: "24px" },
                  ].map((img) => (
                    <div key={img.src} style={{ borderRadius: "14px", overflow: "hidden", marginTop: img.mt, transition: "transform 0.4s ease" }}
                      onMouseOver={e => { (e.currentTarget.querySelector("img") as HTMLImageElement).style.transform = "scale(1.08)"; }}
                      onMouseOut={e => { (e.currentTarget.querySelector("img") as HTMLImageElement).style.transform = "scale(1)"; }}>
                      <img src={img.src} alt={img.alt} style={{ width: "100%", height: "160px", objectFit: "cover", transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)" }} loading="lazy" />
                    </div>
                  ))}
                </div>
              </Reveal>
              <div>
                <Reveal><span style={{ fontSize: "12px", fontWeight: 700, color: "#6366F1", letterSpacing: "1.5px", textTransform: "uppercase" }}>+ WHY DENTEASE</span></Reveal>
                <Reveal delay={80}>
                  <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", lineHeight: 1.1, marginTop: "12px", marginBottom: "16px" }}>
                    Built for real<br /><span style={{ color: "#6366F1", fontStyle: "italic" }}>dental clinics</span>
                  </h2>
                </Reveal>
                <Reveal delay={140}>
                  <p style={{ fontSize: "15px", color: "#6B7280", lineHeight: 1.8, marginBottom: "24px" }}>DentEase is designed specifically for dental professionals. Every feature — from FDI tooth charts to lab record tracking — is built around how dental clinics actually work.</p>
                </Reveal>
                {/* STATS with count-up */}
                <div ref={statsRef} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {STATS.map((s, i) => (
                    <Reveal key={s.label} delay={i * 80}>
                      <StatCard num={s.num} suffix={s.suffix} label={s.label} active={statsActive} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── REVIEWS ── */}
        <section id="reviews" aria-label="Reviews" style={{ background: "#fff", padding: "80px 0" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
            <Reveal><div style={{ textAlign: "center", marginBottom: "10px" }}><span style={{ fontSize: "12px", fontWeight: 700, color: "#6366F1", letterSpacing: "1.5px", textTransform: "uppercase" }}>+ REVIEWS</span></div></Reveal>
            <Reveal delay={80}>
              <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 48px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", marginBottom: "40px" }}>
                Loved by <span style={{ color: "#6366F1", fontStyle: "italic" }}>dental professionals</span>
              </h2>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "16px", marginBottom: "44px" }}>
              {[
                { name: "Dr. Ahmed Raza", clinic: "Raza Dental Care, Lahore", rating: 5, text: "DentEase has completely transformed how we manage our clinic. Patient records and lab work tracking is now seamless." },
                { name: "Dr. Sarah Khan", clinic: "SmilePro Dental, Karachi", rating: 5, text: "The FDI tooth chart feature is brilliant! Our lab record management has never been this organized. Highly recommended." },
                { name: "Dr. Usman Ali", clinic: "Ali Dental Clinic, Islamabad", rating: 5, text: "Free software with this many features? Unbelievable. The reports section alone saves us hours every month." },
              ].map((r, i) => (
                <Reveal key={r.name} delay={i * 100}>
                  <article style={{ background: "#F8FAFF", borderRadius: "20px", padding: "22px", border: "1px solid rgba(99,102,241,0.1)", height: "100%", transition: "transform 0.3s ease, box-shadow 0.3s ease" }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(10,22,40,0.1)"; }}
                    onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    <div style={{ display: "flex", gap: "3px", marginBottom: "10px" }} aria-label={`${r.rating} stars`}>
                      {Array(r.rating).fill(0).map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: "15px" }} aria-hidden="true">★</span>)}
                    </div>
                    <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.7, marginBottom: "14px", fontStyle: "italic" }}>"{r.text}"</p>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0A1628" }}>{r.name}</div>
                    <div style={{ fontSize: "12px", color: "#6B7280" }}>{r.clinic}</div>
                  </article>
                </Reveal>
              ))}
            </div>
            <Reveal delay={100}>
              <div style={{ background: "#F8FAFF", borderRadius: "24px", padding: "28px", border: "1px solid rgba(99,102,241,0.1)", maxWidth: "560px", margin: "0 auto" }}>
                <h3 style={{ fontSize: "19px", fontWeight: 700, color: "#0A1628", marginBottom: "4px" }}>Share your experience</h3>
                <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "18px" }}>We would love to hear from you!</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }} className="mobile-grid-1">
                  <input value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="Your name *" aria-label="Your name" style={{ padding: "12px 14px", borderRadius: "12px", border: "1.5px solid rgba(10,22,40,0.1)", fontSize: "14px", outline: "none", background: "#fff", fontFamily: "inherit", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = "#6366F1"} onBlur={e => e.target.style.borderColor = "rgba(10,22,40,0.1)"} />
                  <input value={reviewClinic} onChange={e => setReviewClinic(e.target.value)} placeholder="Clinic name" aria-label="Clinic name" style={{ padding: "12px 14px", borderRadius: "12px", border: "1.5px solid rgba(10,22,40,0.1)", fontSize: "14px", outline: "none", background: "#fff", fontFamily: "inherit", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = "#6366F1"} onBlur={e => e.target.style.borderColor = "rgba(10,22,40,0.1)"} />
                </div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Your review *" aria-label="Your review" rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1.5px solid rgba(10,22,40,0.1)", fontSize: "14px", outline: "none", resize: "none", marginBottom: "12px", background: "#fff", fontFamily: "inherit", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor = "#6366F1"} onBlur={e => e.target.style.borderColor = "rgba(10,22,40,0.1)"} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "2px" }} aria-label="Rating">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setReviewRating(s)} aria-label={`${s} star`} style={{ fontSize: "26px", background: "none", border: "none", cursor: "pointer", color: s <= reviewRating ? "#FBBF24" : "#D1D5DB", transition: "transform 0.15s ease" }}
                        onMouseOver={e => e.currentTarget.style.transform = "scale(1.2)"} onMouseOut={e => e.currentTarget.style.transform = ""}>★</button>
                    ))}
                  </div>
                  <button onClick={submitReview} style={{ padding: "11px 28px", borderRadius: "999px", background: "#0A1628", color: "#fff", border: "none", fontWeight: 700, fontSize: "14px", cursor: "pointer", transition: "all 0.25s" }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(10,22,40,0.2)"; }} onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                    Submit Review
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" aria-label="FAQ" style={{ background: "#EEF2FF", padding: "80px 0" }}>
          <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 20px" }}>
            <Reveal><div style={{ textAlign: "center", marginBottom: "10px" }}><span style={{ fontSize: "12px", fontWeight: 700, color: "#6366F1", letterSpacing: "1.5px", textTransform: "uppercase" }}>+ FAQ</span></div></Reveal>
            <Reveal delay={80}>
              <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 48px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", marginBottom: "36px" }}>
                Frequently asked <span style={{ color: "#6366F1", fontStyle: "italic" }}>questions</span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div style={{ background: "#fff", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(99,102,241,0.1)" }}>
                {FAQS.map((faq, i) => (
                  <div key={i} className="faq-border">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} style={{ width: "100%", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: "12px", transition: "background 0.2s" }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(99,102,241,0.03)"} onMouseOut={e => e.currentTarget.style.background = "none"}>
                      <span style={{ fontSize: "15px", fontWeight: 600, color: "#0A1628" }}>{faq.q}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)", flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {openFaq === i && (
                      <div style={{ padding: "0 20px 18px", fontSize: "14px", color: "#6B7280", lineHeight: 1.7, animation: "fadeSlideUp 0.3s ease" }}>{faq.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section aria-label="Call to action" style={{ background: "#0A1628", padding: "88px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)", pointerEvents: "none" }} aria-hidden="true" />
          <div style={{ position: "absolute", top: "20%", right: "10%", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle,rgba(129,140,248,0.12) 0%,transparent 70%)", pointerEvents: "none" }} aria-hidden="true" />
          <Reveal>
            <div style={{ position: "relative", zIndex: 1, maxWidth: "580px", margin: "0 auto" }}>
              <h2 style={{ fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 800, color: "#fff", letterSpacing: "-2px", marginBottom: "18px", lineHeight: 1.1 }}>
                Ready to <span style={{ color: "#818CF8", fontStyle: "italic" }}>transform</span> your clinic?
              </h2>
              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", marginBottom: "36px", lineHeight: 1.7 }}>
                Join hundreds of dental professionals who trust DentEase to run their clinic every day. Free forever.
              </p>
              <Link href="/login"><button className="cta-btn-white">
                Start for free today
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
              </button></Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer aria-label="Footer" style={{ background: "#060E1C", padding: "52px 20px 28px", color: "rgba(255,255,255,0.5)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: "36px", marginBottom: "44px" }} className="mobile-grid-1">
            <div>
              <img src="/images/dentease-logo.webp" alt="DentEase" style={{ height: "52px", objectFit: "contain", marginBottom: "14px", display: "block" }} />
              <p style={{ fontSize: "13px", lineHeight: 1.8, maxWidth: "210px", marginBottom: "16px" }}>The smarter way to manage your dental clinic. Free forever, no credit card required.</p>
              <a href="tel:+923105913101" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "13px", color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>📞 +92 310 5913101</a>
              <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#4ADE80", textDecoration: "none" }}>💬 WhatsApp Us</a>
            </div>
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#fff", marginBottom: "14px", letterSpacing: "0.5px" }}>PRODUCT</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[["#features", "Features"], ["#how-it-works", "How it works"], ["#reviews", "Reviews"], ["#faq", "FAQ"]].map(([href, label]) => (
                  <a key={label} href={href} style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.color = "#fff"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}>{label}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#fff", marginBottom: "14px", letterSpacing: "0.5px" }}>ACCOUNT</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[["/login", "Login"], ["/login", "Sign Up Free"]].map(([href, label]) => (
                  <Link key={label} href={href} style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.color = "#fff"} onMouseOut={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"}>{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#fff", marginBottom: "14px", letterSpacing: "0.5px" }}>CONTACT</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href="tel:+923105913101" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>+92 310 5913101</a>
                <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "#4ADE80", textDecoration: "none" }}>WhatsApp</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <p style={{ fontSize: "12px" }}>© 2026 DentEase. All rights reserved.</p>
            <p style={{ fontSize: "12px" }}>Developed by <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" style={{ color: "#818CF8", textDecoration: "none" }}>Junaid Mazhar</a></p>
          </div>
        </div>
      </footer>
    </>
  );
}