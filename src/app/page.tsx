"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const FEATURES = [
  {
    title: "Patient Records",
    desc: "Complete patient history, visit records, medical notes and FDI tooth chart — all searchable instantly.",
    img: "/images/patient-records.webp",
    tag: "Complete history",
  },
  {
    title: "Smart Appointments",
    desc: "Book, reschedule and track appointments easily. See today's full schedule at a glance.",
    img: "/images/appointments.webp",
    tag: "Auto scheduling",
  },
  {
    title: "Lab Records & FDI Chart",
    desc: "Track lab work with interactive FDI tooth chart, delivery dates and material types.",
    img: "/images/lab-records.webp",
    tag: "FDI standard",
  },
  {
    title: "Revenue & Reports",
    desc: "Monthly income charts, doctor performance tracking and expense management.",
    img: "/images/revenue-reports.webp",
    tag: "Visual analytics",
  },
  {
    title: "Staff Management",
    desc: "Add doctors, set role-based permissions and manage login access for your whole team.",
    img: "/images/staff-management.webp",
    tag: "Role permissions",
  },
  {
    title: "WhatsApp Reminders",
    desc: "Send appointment confirmations and payment reminders directly via WhatsApp.",
    img: "/images/whatsapp-reminders.webp",
    tag: "Coming soon",
  },
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

        {/* Left card */}
        <div onClick={prev} style={{ width: "200px", height: "300px", borderRadius: "20px", overflow: "hidden", cursor: "pointer", opacity: 0.5, transform: "scale(0.9)", transition: "all 0.4s ease", flexShrink: 0, position: "relative" }}>
          <img src={FEATURES[getIndex(-1)].img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.2)" }} />
        </div>

        {/* Center card */}
        <div style={{ width: "380px", borderRadius: "24px", overflow: "hidden", boxShadow: "0 24px 60px rgba(10,22,40,0.15)", transition: "all 0.4s ease", flexShrink: 0, background: "#fff" }}>
          <div style={{ height: "240px", overflow: "hidden", position: "relative" }}>
            <img src={FEATURES[active].img} alt={FEATURES[active].title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "all 0.4s ease" }} />
            <div style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderRadius: "999px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, color: "#0A1628" }}>
              {FEATURES[active].tag}
            </div>
          </div>
          <div style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0A1628", marginBottom: "10px", letterSpacing: "-0.5px" }}>{FEATURES[active].title}</h3>
            <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.7 }}>{FEATURES[active].desc}</p>
          </div>
        </div>

        {/* Right card */}
        <div onClick={next} style={{ width: "200px", height: "300px", borderRadius: "20px", overflow: "hidden", cursor: "pointer", opacity: 0.5, transform: "scale(0.9)", transition: "all 0.4s ease", flexShrink: 0, position: "relative" }}>
          <img src={FEATURES[getIndex(1)].img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.2)" }} />
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "32px" }}>
        <button onClick={prev} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "1.5px solid rgba(10,22,40,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.background = "#0A1628"; }}
          onMouseOut={e => { e.currentTarget.style.background = "#fff"; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ display: "flex", gap: "6px" }}>
          {FEATURES.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? "24px" : "8px", height: "8px", borderRadius: "999px", border: "none", background: i === active ? "#0A1628" : "rgba(10,22,40,0.2)", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
          ))}
        </div>
        <button onClick={next} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "1.5px solid rgba(10,22,40,0.15)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.background = "#0A1628"; }}
          onMouseOut={e => { e.currentTarget.style.background = "#fff"; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
      </div>
      <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#6B7280", fontWeight: 500 }}>
        {active + 1} / {total} — {FEATURES[active].title}
      </p>
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
  const [showWelcome, setShowWelcome] = useState(false);
  const [showThankyou, setShowThankyou] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewClinic, setReviewClinic] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    if (!localStorage.getItem("de_welcomed")) {
      setTimeout(() => setShowWelcome(true), 800);
    }
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("de_welcomed", "1");
  };

  const submitReview = () => {
    if (!reviewName || !reviewText) return;
    setShowWelcome(false);
    setShowThankyou(true);
    setReviewName(""); setReviewClinic(""); setReviewText(""); setReviewRating(5);
  };

  const FAQS = [
    { q: "Is DentEase really free?", a: "Yes! DentEase is completely free to use. No hidden charges, no credit card required." },
    { q: "Can multiple doctors use the same account?", a: "Yes, you can add multiple staff members with different role-based permissions." },
    { q: "Is my patient data secure?", a: "Absolutely. Your data is encrypted and stored securely. Only your clinic can access it." },
    { q: "Does it work on mobile and desktop?", a: "Yes, DentEase works on all devices — desktop, tablet, and mobile browsers." },
    { q: "Can I install it as an app?", a: "Yes! DentEase can be installed as a PWA (Progressive Web App) on your phone or desktop — no app store needed." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #EEF2FF; color: #0A1628; }
        .nav-link { color: #0A1628; font-size: 14px; font-weight: 500; text-decoration: none; transition: opacity 0.2s; }
        .nav-link:hover { opacity: 0.6; }
        .faq-item { border-bottom: 1px solid rgba(10,22,40,0.08); }
        .faq-item:last-child { border-bottom: none; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .scale-in { animation: scaleIn 0.3s ease forwards; }
      `}</style>

      {/* WELCOME POPUP */}
      {showWelcome && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,22,40,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="scale-in" style={{ background: "#fff", borderRadius: "24px", overflow: "hidden", maxWidth: "520px", width: "100%", boxShadow: "0 32px 80px rgba(10,22,40,0.2)" }}>
            <div style={{ background: "linear-gradient(135deg, #0A1628, #1e3a5f)", padding: "32px", color: "#fff", position: "relative" }}>
              <img src="/images/dentease-logo.webp" alt="DentEase" style={{ height: "40px", marginBottom: "16px", filter: "brightness(0) invert(1)" }} />
              <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>Welcome to DentEase! 👋</h2>
              <p style={{ fontSize: "14px", opacity: 0.8, lineHeight: 1.6 }}>The smarter way to manage your dental clinic. Free forever.</p>
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", opacity: 0.9 }}>
                  <span>📞</span> <a href="tel:+923105913101" style={{ color: "#fff" }}>+92 310 5913101</a>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", opacity: 0.9 }}>
                  <span>💬</span>
                  <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" style={{ color: "#fff" }}>WhatsApp Us</a>
                </div>
              </div>
            </div>
            <div style={{ padding: "28px" }}>
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <Link href="/login" style={{ flex: 1 }}>
                  <button style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "#0A1628", color: "#fff", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                    Get Started Free
                  </button>
                </Link>
                <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                  <button style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "#25D366", color: "#fff", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                    WhatsApp Demo
                  </button>
                </a>
              </div>
              <button onClick={closeWelcome} style={{ width: "100%", padding: "10px", borderRadius: "12px", background: "transparent", color: "#6B7280", border: "1.5px solid rgba(10,22,40,0.1)", fontWeight: 500, fontSize: "13px", cursor: "pointer" }}>
                Continue exploring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THANK YOU POPUP */}
      {showThankyou && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,22,40,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="scale-in" style={{ background: "#fff", borderRadius: "24px", padding: "40px", maxWidth: "400px", width: "100%", textAlign: "center", boxShadow: "0 32px 80px rgba(10,22,40,0.2)" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#0A1628", marginBottom: "8px", fontStyle: "italic" }}>Thank You!</h3>
            <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.7, marginBottom: "24px" }}>Your review has been submitted. We appreciate your feedback!</p>
            <button onClick={() => setShowThankyou(false)} style={{ padding: "12px 32px", borderRadius: "999px", background: "#0A1628", color: "#fff", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* WHATSAPP FLOAT */}
      <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer"
        style={{ position: "fixed", bottom: "28px", right: "28px", zIndex: 999, width: "52px", height: "52px", borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(37,211,102,0.4)", transition: "transform 0.2s" }}
        onMouseOver={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      {/* NAVBAR */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: navScrolled ? "1px solid rgba(10,22,40,0.08)" : "none", boxShadow: navScrolled ? "0 2px 20px rgba(10,22,40,0.06)" : "none", transition: "all 0.3s" }}>
        <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/images/dentease-logo.webp" alt="DentEase" style={{ height: "36px", objectFit: "contain" }} />
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
              <button style={{ background: "#0A1628", color: "#fff", borderRadius: "999px", padding: "10px 22px", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}
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
            {[["features", "Features"], ["how-it-works", "How it works"], ["reviews", "Reviews"], ["faq", "FAQ"]].map(([id, label]) => (
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
          <h2 style={{ textAlign: "center", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: "56px" }}>
            <span style={{ color: "#6366F1", fontStyle: "italic" }}>Everything</span> your clinic needs,<br />under one roof
          </h2>
          <FeatureSlider />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ background: "#fff", padding: "80px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#6366F1", letterSpacing: "1px", textTransform: "uppercase" }}>+ HOW IT WORKS</span>
          </div>
          <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", marginBottom: "56px" }}>
            Up and running in <span style={{ color: "#6366F1", fontStyle: "italic" }}>3 simple steps</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px" }}>
            {[
              { step: "01", title: "Create your account", desc: "Sign up free in 30 seconds. No credit card. No setup fee. Just your email.", icon: "👤" },
              { step: "02", title: "Add your clinic & staff", desc: "Set up your clinic profile, add doctors and configure role-based permissions.", icon: "🏥" },
              { step: "03", title: "Start managing", desc: "Add patients, book appointments, track lab work and monitor revenue instantly.", icon: "🚀" },
            ].map((item) => (
              <div key={item.step} style={{ background: "#F8FAFF", borderRadius: "20px", padding: "32px", border: "1px solid rgba(99,102,241,0.1)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "16px", right: "20px", fontSize: "48px", fontWeight: 900, color: "rgba(99,102,241,0.08)", lineHeight: 1 }}>{item.step}</div>
                <div style={{ fontSize: "36px", marginBottom: "16px" }}>{item.icon}</div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0A1628", marginBottom: "10px" }}>{item.title}</h3>
                <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMAGE SECTION - InstaCare Style */}
      <section style={{ background: "#EEF2FF", padding: "80px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }}>
            {/* Image Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <img src="/images/patient-records.webp" alt="Patient Records" style={{ borderRadius: "16px", width: "100%", height: "180px", objectFit: "cover" }} />
              <img src="/images/revenue-reports.webp" alt="Revenue Reports" style={{ borderRadius: "16px", width: "100%", height: "180px", objectFit: "cover", marginTop: "24px" }} />
              <img src="/images/lab-records.webp" alt="Lab Records" style={{ borderRadius: "16px", width: "100%", height: "180px", objectFit: "cover" }} />
              <img src="/images/staff-management.webp" alt="Staff Management" style={{ borderRadius: "16px", width: "100%", height: "180px", objectFit: "cover", marginTop: "24px" }} />
            </div>
            {/* Text */}
            <div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#6366F1", letterSpacing: "1px", textTransform: "uppercase" }}>+ WHY DENTEASE</span>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", lineHeight: 1.1, marginTop: "12px", marginBottom: "20px" }}>
                Built for real<br /><span style={{ color: "#6366F1", fontStyle: "italic" }}>dental clinics</span>
              </h2>
              <p style={{ fontSize: "15px", color: "#6B7280", lineHeight: 1.8, marginBottom: "32px" }}>
                DentEase is designed specifically for dental professionals. Every feature — from FDI tooth charts to lab record tracking — is built around how dental clinics actually work.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { num: "500+", label: "Clinics using DentEase" },
                  { num: "50K+", label: "Patients managed" },
                  { num: "99.9%", label: "Uptime guaranteed" },
                  { num: "Free", label: "Forever, no hidden fees" },
                ].map(stat => (
                  <div key={stat.label} style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid rgba(99,102,241,0.1)" }}>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#0A1628", letterSpacing: "-1px" }}>{stat.num}</div>
                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" style={{ background: "#fff", padding: "80px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#6366F1", letterSpacing: "1px", textTransform: "uppercase" }}>+ REVIEWS</span>
          </div>
          <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", marginBottom: "48px" }}>
            Loved by <span style={{ color: "#6366F1", fontStyle: "italic" }}>dental professionals</span>
          </h2>

          {/* Review Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "48px" }}>
            {[
              { name: "Dr. Ahmed Raza", clinic: "Raza Dental Care, Lahore", rating: 5, text: "DentEase has completely transformed how we manage our clinic. Patient records and lab work tracking is now seamless." },
              { name: "Dr. Sarah Khan", clinic: "SmilePro Dental, Karachi", rating: 5, text: "The FDI tooth chart feature is brilliant! Our lab record management has never been this organized. Highly recommended." },
              { name: "Dr. Usman Ali", clinic: "Ali Dental Clinic, Islamabad", rating: 5, text: "Free software with this many features? Unbelievable. The reports section alone saves us hours every month." },
            ].map((r) => (
              <div key={r.name} style={{ background: "#F8FAFF", borderRadius: "20px", padding: "24px", border: "1px solid rgba(99,102,241,0.1)" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
                  {Array(r.rating).fill(0).map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: "16px" }}>★</span>)}
                </div>
                <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.7, marginBottom: "16px", fontStyle: "italic" }}>"{r.text}"</p>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0A1628" }}>{r.name}</div>
                  <div style={{ fontSize: "12px", color: "#6B7280" }}>{r.clinic}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Review Form */}
          <div style={{ background: "#F8FAFF", borderRadius: "24px", padding: "36px", border: "1px solid rgba(99,102,241,0.1)", maxWidth: "600px", margin: "0 auto" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#0A1628", marginBottom: "4px" }}>Share your experience</h3>
            <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "24px" }}>We would love to hear from you!</p>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <input value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="Your name *" style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1.5px solid rgba(10,22,40,0.1)", fontSize: "14px", outline: "none", background: "#fff" }} />
              <input value={reviewClinic} onChange={e => setReviewClinic(e.target.value)} placeholder="Clinic name" style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1.5px solid rgba(10,22,40,0.1)", fontSize: "14px", outline: "none", background: "#fff" }} />
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Your review *" rows={3} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1.5px solid rgba(10,22,40,0.1)", fontSize: "14px", outline: "none", resize: "none", marginBottom: "12px", background: "#fff", fontFamily: "inherit" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)} style={{ fontSize: "24px", background: "none", border: "none", cursor: "pointer", color: s <= reviewRating ? "#FBBF24" : "#D1D5DB" }}>★</button>
                ))}
              </div>
              <button onClick={submitReview} style={{ padding: "12px 28px", borderRadius: "999px", background: "#0A1628", color: "#fff", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                Submit Review
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: "#EEF2FF", padding: "80px 0" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#6366F1", letterSpacing: "1px", textTransform: "uppercase" }}>+ FAQ</span>
          </div>
          <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0A1628", letterSpacing: "-1.5px", marginBottom: "48px" }}>
            Frequently asked <span style={{ color: "#6366F1", fontStyle: "italic" }}>questions</span>
          </h2>
          <div style={{ background: "#fff", borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(99,102,241,0.1)" }}>
            {FAQS.map((faq, i) => (
              <div key={i} className="faq-item">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: "100%", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#0A1628" }}>{faq.q}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="fade-in" style={{ padding: "0 24px 20px", fontSize: "14px", color: "#6B7280", lineHeight: 1.7 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#0A1628", padding: "80px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, color: "#fff", letterSpacing: "-2px", marginBottom: "20px", lineHeight: 1.1 }}>
            Ready to <span style={{ color: "#818CF8", fontStyle: "italic" }}>transform</span> your clinic?
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.6)", marginBottom: "36px", lineHeight: 1.7 }}>
            Join hundreds of dental professionals who trust DentEase to run their clinic every day. Free forever.
          </p>
          <Link href="/login">
            <button style={{ background: "#fff", color: "#0A1628", borderRadius: "999px", padding: "18px 40px", fontSize: "16px", fontWeight: 700, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px", transition: "all 0.25s" }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(255,255,255,0.2)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
              Start for free today
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#060E1C", padding: "40px 32px", color: "rgba(255,255,255,0.5)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/images/dentease-logo.webp" alt="DentEase" style={{ height: "28px", filter: "brightness(0) invert(1)", opacity: 0.6 }} />
          </div>
          <p style={{ fontSize: "13px" }}>© 2026 DentEase. All rights reserved.</p>
          <p style={{ fontSize: "13px" }}>
            Developed by{" "}
            <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" style={{ color: "#818CF8", textDecoration: "none" }}>
              Junaid Mazhar
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}