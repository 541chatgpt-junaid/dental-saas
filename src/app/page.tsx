"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const FEATURES = [
  { title: "Patient Records", desc: "Complete patient history, visit records, medical notes and FDI tooth chart — all searchable instantly.", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", emoji: "🦷", tag: "Complete history" },
  { title: "Smart Appointments", desc: "Book, reschedule and track appointments easily. See today's full schedule at a glance.", bg: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", emoji: "📅", tag: "Auto scheduling" },
  { title: "Lab Records & FDI Chart", desc: "Track lab work with interactive FDI tooth chart, delivery dates and material types.", bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", emoji: "🔬", tag: "FDI standard" },
  { title: "Revenue & Reports", desc: "Monthly income charts, doctor performance tracking and expense management.", bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", emoji: "📊", tag: "Visual analytics" },
  { title: "Staff Management", desc: "Add doctors, set role-based permissions and manage login access for your whole team.", bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", emoji: "👨‍⚕️", tag: "Role permissions" },
  { title: "WhatsApp Reminders", desc: "Send appointment confirmations and payment reminders directly via WhatsApp.", bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", emoji: "💬", tag: "Coming soon" },
];

function FeatureSlider() {
  const [active, setActive] = useState(0);
  const total = FEATURES.length;
  const prev = () => setActive(i => (i - 1 + total) % total);
  const next = () => setActive(i => (i + 1) % total);
  const getIndex = (offset: number) => (active + offset + total) % total;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "420px" }}>
        <div onClick={prev} style={{ width: "200px", height: "300px", borderRadius: "20px", overflow: "hidden", cursor: "pointer", opacity: 0.5, transform: "scale(0.9)", transition: "all 0.4s ease", flexShrink: 0, position: "relative" }}>
          <div style={{ width: "100%", height: "100%", background: FEATURES[getIndex(-1)].bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>{FEATURES[getIndex(-1)].emoji}</div>
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.2)" }} />
        </div>
        <div style={{ width: "380px", borderRadius: "24px", overflow: "hidden", boxShadow: "0 24px 60px rgba(10,22,40,0.15)", transition: "all 0.4s ease", flexShrink: 0, background: "#fff" }}>
          <div style={{ height: "240px", overflow: "hidden", position: "relative" }}>
            <div style={{ width: "100%", height: "100%", background: FEATURES[active].bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px" }}>{FEATURES[active].emoji}</div>
            <div style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderRadius: "999px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, color: "#0A1628" }}>{FEATURES[active].tag}</div>
          </div>
          <div style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0A1628", marginBottom: "10px", letterSpacing: "-0.5px" }}>{FEATURES[active].title}</h3>
            <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.7 }}>{FEATURES[active].desc}</p>
          </div>
        </div>
        <div onClick={next} style={{ width: "200px", height: "300px", borderRadius: "20px", overflow: "hidden", cursor: "pointer", opacity: 0.5, transform: "scale(0.9)", transition: "all 0.4s ease", flexShrink: 0, position: "relative" }}>
          <div style={{ width: "100%", height: "100%", background: FEATURES[getIndex(1)].bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>{FEATURES[getIndex(1)].emoji}</div>
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.2)" }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "32px" }}>
        <button onClick={prev} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "1.5px solid rgba(10,22,40,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ display: "flex", gap: "6px" }}>
          {FEATURES.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? "24px" : "8px", height: "8px", borderRadius: "999px", border: "none", background: i === active ? "#0A1628" : "rgba(10,22,40,0.2)", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
          ))}
        </div>
        <button onClick={next} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "1.5px solid rgba(10,22,40,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
      </div>
      <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#6B7280", fontWeight: 500 }}>{active + 1} / {total} — {FEATURES[active].title}</p>
    </div>
  );
}

function AnimatedWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setIndex(prev => (prev + 1) % words.length), 2000);
    return () => clearInterval(timer);
  }, [words]);
  return (
    <span onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ color: hovered ? "#3B82F6" : "#6366F1", transition: "color 0.3s ease", fontStyle: "italic" }}>
      {words[index]}
    </span>
  );
}

function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationId: number;
    let t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.008;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.5);
        for (let x = 0; x <= canvas.width; x += 5) {
          const y = canvas.height * 0.5 + Math.sin(x * 0.003 + t + i * 0.8) * (60 + i * 20) + Math.sin(x * 0.007 + t * 1.3 + i) * 30;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fillStyle = `rgba(99, 102, 241, ${0.04 + i * 0.02})`;
        ctx.fill();
      }
      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #EEF2FF; color: #0A1628; }
        .nav-link { color: #0A1628; font-size: 14px; font-weight: 500; text-decoration: none; transition: opacity 0.2s; }
        .nav-link:hover { opacity: 0.6; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: navScrolled ? "1px solid rgba(10,22,40,0.08)" : "none", boxShadow: navScrolled ? "0 2px 20px rgba(10,22,40,0.06)" : "none", transition: "all 0.3s" }}>
        <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#0A1628", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" /></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#0A1628", letterSpacing: "-0.3px" }}>DentEase</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "36px" }} className="hidden md:flex">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#reviews" className="nav-link">Reviews</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }} className="hidden md:flex">
            <a href="tel:+923105913101" className="nav-link" style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3 3.18 2 2 0 0 1 4.11 1h3a2 2 0 0 1 2 1.72 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              +92 310 5913101
            </a>
            <Link href="/login">
              <button style={{ background: "#0A1628", color: "#fff", borderRadius: "999px", padding: "10px 22px", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                onMouseOver={e => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseOut={e => { e.currentTarget.style.opacity = "1"; }}>
                Get Started Free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
              </button>
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2" strokeLinecap="round">
              {mobileMenu ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden" style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(10,22,40,0.06)", background: "#fff", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[["features","Features"],["how-it-works","How it works"],["reviews","Reviews"],["faq","FAQ"]].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="nav-link" style={{ padding: "4px 0" }} onClick={() => setMobileMenu(false)}>{label}</a>
            ))}
            <Link href="/login">
              <button style={{ width: "100%", padding: "12px", borderRadius: "999px", fontSize: "14px", fontWeight: 600, color: "#fff", background: "#0A1628", border: "none", cursor: "pointer" }}>Get Started Free</button>
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px", background: "linear-gradient(160deg, #dde8ff 0%, #e8eeff 40%, #d8e4ff 100%)", position: "relative", overflow: "hidden" }}>
        <WaveBackground />
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(147,197,253,0.4) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "999px", padding: "8px 18px", marginBottom: "36px", background: "rgba(255,255,255,0.75)", border: "1px solid rgba(10,22,40,0.1)", backdropFilter: "blur(10px)" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#0A1628" }}>Now accepting new clinics worldwide</span>
          </div>
          <h1 style={{ fontSize: "clamp(44px, 7.5vw, 84px)", fontWeight: 800, lineHeight: 1.05, color: "#0A1628", letterSpacing: "-3px", marginBottom: "28px" }}>
            Smarter way to <AnimatedWord words={["manage", "grow", "run", "track"]} />
            <br />your dental clinic
          </h1>
          <p style={{ fontSize: "18px", color: "#4B5563", lineHeight: 1.7, maxWidth: "500px", margin: "0 auto 44px", fontWeight: 400 }}>
            Patients, appointments, lab records and revenue — all in one beautifully simple platform. Free to use. No paperwork.
          </p>
          <Link href="/login">
            <button style={{ background: "#0A1628", color: "#fff", borderRadius: "999px", padding: "18px 40px", fontSize: "16px", fontWeight: 600, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px", transition: "all 0.25s", boxShadow: "0 4px 24px rgba(10,22,40,0.15)" }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(10,22,40,0.25)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(10,22,40,0.15)"; }}>
              Get started free — it takes 30 seconds
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
            </button>
          </Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "28px", marginTop: "40px", flexWrap: "wrap" }}>
            {["500+ clinics", "No credit card", "Free forever"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: "#EEF2FF", padding: "80px 0", overflow: "hidden" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#6366F1", letterSpacing: "1px", textTransform: "uppercase" }}>+ OUR FEATURES</span>
          </div>
          <h2 style={{ textAlign: "center", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: "56px" }}>
            <span style={{ color: "#6366F1", fontStyle: "italic" }}>Everything your clinic needs,</span>
            <br /><span style={{ color: "#0A1628" }}>under one roof</span>
          </h2>
          <FeatureSlider />
        </div>
      </section>
    </>
  );
}