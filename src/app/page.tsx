"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function AnimatedWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [words]);

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: hovered ? "#3B82F6" : "#6366F1",
        transition: "color 0.3s ease",
        display: "inline-block",
        minWidth: "160px",
        fontStyle: "italic",
      }}
    >
      {words[index]}
    </span>
  );
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
        .nav-scrolled { box-shadow: 0 2px 20px rgba(10,22,40,0.08); }
      `}</style>

      {/* NAVBAR */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? "nav-scrolled" : ""}`}
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: navScrolled ? "1px solid rgba(10,22,40,0.06)" : "none" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#0A1628" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#0A1628", letterSpacing: "-0.3px" }}>DentEase</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#reviews" className="nav-link">Reviews</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="tel:+923105913101" className="nav-link flex items-center gap-1.5" style={{ fontSize: "13px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3 3.18 2 2 0 0 1 4.11 1h3a2 2 0 0 1 2 1.72 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              +92 310 5913101
            </a>
            <Link href="/login">
              <button
                style={{ background: "#0A1628", color: "#fff", borderRadius: "999px", padding: "10px 22px", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseOut={e => (e.currentTarget.style.opacity = "1")}
              >
                Get Started Free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </button>
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2" strokeLinecap="round">
              {mobileMenu ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden px-6 pb-5 flex flex-col gap-4" style={{ borderTop: "1px solid rgba(10,22,40,0.06)", background: "#fff" }}>
            {[["features","Features"],["how-it-works","How it works"],["reviews","Reviews"],["faq","FAQ"]].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="nav-link py-1" onClick={() => setMobileMenu(false)}>{label}</a>
            ))}
            <Link href="/login">
              <button className="w-full py-3 rounded-full text-sm font-semibold text-white" style={{ background: "#0A1628", border: "none", cursor: "pointer" }}>
                Get Started Free
              </button>
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "80px", background: "#EEF2FF", position: "relative", overflow: "hidden" }}>
        
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(147,197,253,0.35) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "0", left: "20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(196,181,253,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="max-w-4xl mx-auto px-6 text-center" style={{ position: "relative", zIndex: 1 }}>
          
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(10,22,40,0.1)", backdropFilter: "blur(8px)" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#0A1628" }}>Now accepting new clinics · Pakistan</span>
          </div>

          <h1 style={{ fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 800, lineHeight: 1.1, color: "#0A1628", letterSpacing: "-2px", marginBottom: "24px" }}>
            Smarter way to{" "}
            <AnimatedWord words={["manage", "grow", "run", "track"]} />{" "}
            <br />your dental clinic
          </h1>

          <p style={{ fontSize: "17px", color: "#4B5563", lineHeight: 1.7, maxWidth: "520px", margin: "0 auto 40px", fontWeight: 400 }}>
            Patients, appointments, lab records and revenue — all in one beautifully simple platform. Free to use. No paperwork.
          </p>

          <a href="/login">
            <button
              style={{ background: "#0A1628", color: "#fff", borderRadius: "999px", padding: "16px 36px", fontSize: "16px", fontWeight: 600, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", transition: "all 0.2s" }}
              onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(10,22,40,0.25)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              Get started free — it takes 30 seconds
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </button>
          </a>

          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {["500+ clinics", "No credit card", "Free forever"].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}