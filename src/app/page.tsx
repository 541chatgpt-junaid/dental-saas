"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── SEO Meta (add to layout.tsx or use next/head) ───────────────────────────
// Title: DentEase – Best Dental Clinic Management Software in Pakistan
// Description: Manage patients, appointments, lab records & revenue in one place.

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", strokeWidth = 2, fill = "none" }: {
  d: string; size?: number; stroke?: string; strokeWidth?: number; fill?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(start);
        }, 25);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── WELCOME POPUP ────────────────────────────────────────────────────────────
function WelcomePopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,52,44,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden flex w-full max-w-xl shadow-2xl"
        style={{ animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Left */}
        <div className="flex flex-col justify-between p-6 w-52 flex-shrink-0" style={{ background: "#04342C" }}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1D9E75" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E1F5EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" />
                </svg>
              </div>
              <div>
                <div className="text-white font-medium text-sm">DentEase</div>
                <div className="text-xs" style={{ color: "#5DCAA5" }}>Dental Software</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed mb-5" style={{ color: "#9FE1CB" }}>
              Our customer service team is ready to assist you. We&apos;re always here to help set up your clinic.
            </p>
            <div className="flex flex-col gap-3">
              <a href="tel:+923105913101" className="flex items-start gap-2 group">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(29,158,117,0.25)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3 3.18 2 2 0 0 1 4.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "#5DCAA5" }}>Call Us</div>
                  <div className="text-xs font-medium" style={{ color: "#9FE1CB" }}>+92 310 5913101</div>
                </div>
              </a>
              <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(29,158,117,0.25)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#5DCAA5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "#5DCAA5" }}>WhatsApp</div>
                  <div className="text-xs font-medium" style={{ color: "#9FE1CB" }}>Chat with us</div>
                </div>
              </a>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {[
              "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
              "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M2 2h20v20H2z",
              "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
            ].map((d, i) => (
              <div key={i} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "rgba(255,255,255,0.08)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9FE1CB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={d} />
                </svg>
              </div>
            ))}
          </div>
        </div>
        {/* Right */}
        <div className="flex-1 p-6">
          <div className="flex justify-end mb-3">
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ background: "#F8FEFA", border: "0.5px solid #E1F5EE" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5F5E5A" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 text-xs font-medium" style={{ background: "#E1F5EE", color: "#0F6E56" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#1D9E75" }} />
            100% Free — No credit card needed
          </div>
          <h3 className="text-lg font-medium mb-2 leading-tight" style={{ color: "#04342C" }}>
            We&apos;re here to help<br />you grow your clinic
          </h3>
          <p className="text-xs leading-relaxed mb-5" style={{ color: "#5F5E5A" }}>
            Get a personalized demo of DentEase and see how it can save you 2+ hours daily. Our specialist will guide you through every feature.
          </p>
          <Link href="/login">
            <button className="w-full py-2.5 rounded-xl text-sm font-medium mb-3 transition-all hover:opacity-90" style={{ background: "#0F6E56", color: "#E1F5EE" }}>
              Request a Free Demo
            </button>
          </Link>
          <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer">
            <button className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all hover:bg-gray-50" style={{ background: "#F8FEFA", color: "#04342C", border: "0.5px solid #E1F5EE" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374A9.86 9.86 0 0 1 2.168 12.05C2.168 6.6 6.6 2.168 12.05 2.168c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              Chat on WhatsApp
            </button>
          </a>
          <p className="text-center mt-3 text-xs" style={{ color: "#888780" }}>No commitment. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
}

// ─── THANK YOU POPUP ──────────────────────────────────────────────────────────
function ThankYouPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(4,52,44,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl" style={{ animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#E1F5EE" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="text-2xl mb-1" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#04342C" }}>Thank You!</h3>
        <p className="text-sm font-medium mb-3" style={{ color: "#04342C" }}>Your review has been submitted</p>
        <p className="text-xs leading-relaxed mb-6" style={{ color: "#5F5E5A" }}>
          Thank you for sharing your experience with DentEase. Your review helps other dental professionals find the right software for their clinic.
        </p>
        <button onClick={onClose} className="px-8 py-2.5 rounded-full text-sm font-medium transition-all hover:opacity-90" style={{ background: "#0F6E56", color: "#E1F5EE" }}>
          Back to Home
        </button>
        <div className="flex justify-center gap-1.5 mt-4">
          {[true, true, false].map((a, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: a ? "#1D9E75" : "#E1F5EE" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: "", designation: "", clinic: "", review: "", rating: 5 });
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("dentease_welcome_seen");
    if (!seen) {
      const t = setTimeout(() => { setShowWelcome(true); localStorage.setItem("dentease_welcome_seen", "1"); }, 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowThankYou(true);
    setReviewForm({ name: "", designation: "", clinic: "", review: "", rating: 5 });
  };

  const features = [
    { icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75", title: "Patient Records", desc: "Complete patient history, visit records, medical notes, FDI tooth chart and prescriptions — all searchable.", tag: "Complete history" },
    { icon: "M8 2v4 M16 2v4 M3 10h18 M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", title: "Smart Appointments", desc: "Book, reschedule and cancel appointments. Send automated reminders. Never miss a patient again.", tag: "Auto reminders" },
    { icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8", title: "Lab Records + Tooth Chart", desc: "Track lab work with interactive FDI tooth chart, delivery dates, material types and payment status.", tag: "FDI standard" },
    { icon: "M18 20V10 M12 20V4 M6 20v-6", title: "Revenue Analytics", desc: "Interactive charts showing monthly revenue, doctor performance, pending fees and collection rates.", tag: "Visual reports" },
    { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", title: "Staff Management", desc: "Doctor profiles, role-based permissions, login controls and attendance — multi-staff ready.", tag: "Role permissions" },
    { icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", title: "WhatsApp Reminders", desc: "Send appointment confirmations and payment reminders directly via WhatsApp — no extra app needed.", tag: "Coming soon" },
  ];

  const testimonials = [
    { stars: 5, text: "DentEase completely transformed how we manage our clinic. Patient records are instant to find, lab tracking is perfect and the FDI tooth chart is exactly what we needed.", name: "Dr. Ahmed Khan", role: "BDS, FCPS — Lahore", initials: "AK" },
    { stars: 5, text: "The visit tracking feature is brilliant. Every patient's full history — what was done, by whom, how much paid — right there in one screen. No more paper notebooks!", name: "Dr. Sara Ali", role: "Orthodontist — Karachi", initials: "SA" },
    { stars: 4, text: "Finally a software that understands Pakistani dental clinics. Multi-currency, works perfectly on mobile and the reports section saves me hours every week.", name: "Dr. Mahmood Raza", role: "Oral Surgeon — Islamabad", initials: "MR" },
  ];

  const faqs = [
    { q: "Is DentEase really free to use?", a: "Yes! DentEase is completely free right now. You get full access to all features — patients, appointments, lab records, staff management and reports — with no hidden charges." },
    { q: "Can I use DentEase on my mobile phone?", a: "Absolutely. DentEase is fully responsive and works perfectly on any device — desktop, tablet or mobile. You can also install it as a PWA app directly on your phone or PC." },
    { q: "Is my patient data safe and private?", a: "Yes. All data is encrypted and securely stored. Each clinic only sees their own data — complete isolation between accounts. We take patient privacy very seriously." },
    { q: "Can multiple doctors use the same account?", a: "Yes. You can add multiple doctors with different roles and permissions. Each staff member can have their own login with access controls set by the clinic admin." },
    { q: "What is the FDI tooth chart and who is it for?", a: "The FDI (ISO-3950) tooth chart is the internationally accepted standard used by dentists, labs and insurance companies worldwide. It lets you mark treated teeth with color coding for crown, bridge, RCT, implant and more." },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        :root { --teal-dark: #04342C; --teal: #0F6E56; --teal-mid: #1D9E75; --teal-light: #5DCAA5; --teal-pale: #9FE1CB; --teal-bg: #E1F5EE; --teal-surface: #F8FEFA; --amber: #EF9F27; --text: #1a1a1a; --muted: #5F5E5A; --border: #E1F5EE; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: #fff; color: var(--text); }
        @keyframes popIn { from { opacity: 0; transform: scale(0.85) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .animate-fadeUp { animation: fadeUp 0.7s ease both; }
        .animate-fadeUp-delay-1 { animation: fadeUp 0.7s ease 0.1s both; }
        .animate-fadeUp-delay-2 { animation: fadeUp 0.7s ease 0.2s both; }
        .animate-fadeUp-delay-3 { animation: fadeUp 0.7s ease 0.3s both; }
        .animate-fadeIn { animation: fadeIn 0.5s ease both; }
        .hero-pattern { background-image: radial-gradient(circle, rgba(29,158,117,0.08) 1px, transparent 1px); background-size: 20px 20px; }
        .feat-card:hover { border-color: var(--teal-mid) !important; transform: translateY(-2px); transition: all 0.2s ease; }
        .btn-primary { background: var(--teal); color: #E1F5EE; border-radius: 999px; font-weight: 500; transition: all 0.2s; }
        .btn-primary:hover { background: var(--teal-mid); transform: translateY(-1px); }
        .btn-outline { border: 1px solid rgba(255,255,255,0.25); color: #fff; border-radius: 999px; transition: all 0.2s; }
        .btn-outline:hover { background: rgba(255,255,255,0.08); }
        .nav-link { color: var(--teal-pale); font-size: 13px; transition: color 0.2s; text-decoration: none; }
        .nav-link:hover { color: #fff; }
        .faq-answer { overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease; }
        .whatsapp-float { position: fixed; bottom: 24px; right: 24px; z-index: 40; width: 52px; height: 52px; background: #25D366; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(37,211,102,0.4); cursor: pointer; transition: transform 0.2s; }
        .whatsapp-float:hover { transform: scale(1.1); }
        .section-fade { animation: fadeUp 0.6s ease both; }
        .img-box { border-radius: 12px; overflow: hidden; position: relative; }
        .img-box-inner { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
        .img-label { position: absolute; bottom: 0; left: 0; right: 0; padding: 8px 12px; background: linear-gradient(to top, rgba(4,52,44,0.7), transparent); }
        .review-star { cursor: pointer; transition: transform 0.1s; }
        .review-star:hover { transform: scale(1.2); }
      `}</style>

      {/* WELCOME POPUP */}
      {showWelcome && <WelcomePopup onClose={() => setShowWelcome(false)} />}
      {showThankYou && <ThankYouPopup onClose={() => setShowThankYou(false)} />}

      {/* WHATSAPP FLOAT */}
      <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" className="whatsapp-float">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374A9.86 9.86 0 0 1 2.168 12.05C2.168 6.6 6.6 2.168 12.05 2.168c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      </a>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 transition-all duration-300" style={{ background: navScrolled ? "rgba(4,52,44,0.97)" : "#04342C", backdropFilter: navScrolled ? "blur(10px)" : "none", borderBottom: navScrolled ? "0.5px solid rgba(255,255,255,0.08)" : "none" }}>
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1D9E75" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E1F5EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" />
              </svg>
            </div>
            <span className="font-medium text-white text-base" style={{ fontFamily: "'Lora', serif" }}>DentEase</span>
          </div>
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#reviews" className="nav-link">Reviews</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <a href="tel:+923105913101" className="nav-link flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3 3.18 2 2 0 0 1 4.11 1h3a2 2 0 0 1 2 1.72 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              +92 310 5913101
            </a>
            <Link href="/login">
              <button className="btn-outline px-4 py-2 text-sm">Login</button>
            </Link>
            <Link href="/login">
              <button className="btn-primary px-5 py-2 text-sm">Get Started Free</button>
            </Link>
          </div>
          <button className="md:hidden text-white" onClick={() => setMobileMenu(!mobileMenu)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden px-6 pb-4 flex flex-col gap-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)", animation: "slideDown 0.2s ease" }}>
            {["features", "how-it-works", "reviews", "faq"].map(s => (
              <a key={s} href={`#${s}`} className="nav-link py-1 capitalize" onClick={() => setMobileMenu(false)}>{s.replace("-", " ")}</a>
            ))}
            <Link href="/login"><button className="btn-primary w-full py-2.5 text-sm mt-1">Get Started Free</button></Link>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ background: "#04342C", paddingTop: "80px" }}>
        <div className="hero-pattern">
          <div className="max-w-6xl mx-auto px-6 pt-12 pb-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="animate-fadeUp">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 text-xs" style={{ background: "rgba(29,158,117,0.2)", border: "0.5px solid rgba(29,158,117,0.35)", color: "#9FE1CB" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5DCAA5" }} />
                  Trusted by 500+ dental clinics worldwide
                </div>
                <h1 className="text-4xl lg:text-5xl font-medium leading-tight mb-4" style={{ color: "#fff", fontFamily: "'Lora', serif", letterSpacing: "-0.5px" }}>
                  The smarter way to run your{" "}
                  <span style={{ color: "#5DCAA5", fontStyle: "italic" }}>dental clinic</span>
                </h1>
                <p className="text-sm leading-relaxed mb-7" style={{ color: "#9FE1CB", maxWidth: "420px" }}>
                  Patients, appointments, lab records, staff management and revenue — all in one beautifully simple platform. No paperwork. No chaos. Just results.
                </p>
                <div className="flex flex-wrap gap-3 mb-8">
                  <Link href="/login">
                    <button className="btn-primary px-6 py-3 text-sm flex items-center gap-2">
                      Start for free
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </Link>
                  <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer">
                    <button className="btn-outline px-6 py-3 text-sm flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" /></svg>
                      Watch demo
                    </button>
                  </a>
                </div>
                <div className="flex flex-wrap gap-5 pt-5" style={{ borderTop: "0.5px solid rgba(255,255,255,0.1)" }}>
                  {["No credit card required", "Free forever plan", "Setup in 5 minutes"].map(t => (
                    <div key={t} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "rgba(29,158,117,0.3)" }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5DCAA5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                      <span className="text-xs" style={{ color: "#9FE1CB" }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* App Preview */}
              <div className="animate-fadeUp-delay-2 rounded-t-2xl overflow-hidden" style={{ background: "#0F6E56", border: "0.5px solid rgba(255,255,255,0.12)", borderBottom: "none", marginTop: "8px" }}>
                <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {["#E24B4A", "#EF9F27", "#1D9E75"].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
                    </div>
                    <span className="text-xs font-medium" style={{ color: "#E1F5EE" }}>DentEase Dashboard</span>
                  </div>
                  <span className="text-xs" style={{ color: "#5DCAA5" }}>Live</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[["142", "Patients"], ["18", "Today"], ["Rs 84K", "Revenue"], ["6", "Lab Jobs"]].map(([n, l]) => (
                      <div key={l} className="rounded-lg p-2.5" style={{ background: "rgba(29,158,117,0.2)", border: "0.5px solid rgba(29,158,117,0.3)" }}>
                        <div className="text-sm font-medium" style={{ color: "#5DCAA5" }}>{n}</div>
                        <div className="text-xs" style={{ color: "#9FE1CB" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg overflow-hidden" style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}>
                    <div className="grid grid-cols-4 gap-2 px-3 py-2" style={{ background: "rgba(4,52,44,0.5)" }}>
                      {["Patient", "Treatment", "Fee", "Status"].map(h => <div key={h} className="text-xs font-medium" style={{ color: "#5DCAA5" }}>{h}</div>)}
                    </div>
                    {[["Ahmed Ali", "RCT #16", "Rs 8,000", "Paid", "#1D9E75"], ["Sara Khan", "Crown", "Rs 12,000", "Partial", "#EF9F27"], ["Bilal Raza", "Filling", "Rs 2,500", "Pending", "#378ADD"]].map(([n, t, f, s, c]) => (
                      <div key={n} className="grid grid-cols-4 gap-2 px-3 py-2" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-xs" style={{ color: "#9FE1CB" }}>{n}</div>
                        <div className="text-xs" style={{ color: "#9FE1CB" }}>{t}</div>
                        <div className="text-xs" style={{ color: "#9FE1CB" }}>{f}</div>
                        <div className="text-xs px-1.5 py-0.5 rounded-full text-center" style={{ background: `${c}22`, color: c, width: "fit-content" }}>{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────────────────── */}
      <section style={{ background: "#F8FEFA", borderBottom: "0.5px solid #E1F5EE" }}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[["500", "+", "Dental clinics"], ["50,000", "+", "Patients managed"], ["99.9", "%", "Uptime guaranteed"], ["4.9", "★", "Average rating"]].map(([n, s, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-medium" style={{ color: "#0F6E56", fontFamily: "'Lora', serif", letterSpacing: "-1px" }}>
                  {n}<span style={{ color: "#1D9E75", fontSize: "18px" }}>{s}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: "#888780" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMAGE SECTION (InstaCare style) ────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="grid grid-cols-2 gap-4">
            {[
              { bg: "#085041", label: "Modern dental clinic", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
              { bg: "#1D9E75", label: "Works on any device", icon: "M20 3H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6l-2 3h8l-2-3h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z" },
              { bg: "#0F6E56", label: "Patient management", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
              { bg: "#5DCAA5", label: "Live analytics", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
            ].map(({ bg, label, icon }, i) => (
              <div key={i} className="img-box" style={{ height: "150px", background: bg }}>
                <div className="img-box-inner p-4">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon} />
                  </svg>
                </div>
                <div className="img-label">
                  <span className="text-xs" style={{ color: "#E1F5EE" }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: "#EF9F27", fontWeight: 500, fontSize: "13px" }}>//</span>
              <span style={{ color: "#EF9F27", fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.8px" }}>#1 Dental Software in Pakistan</span>
            </div>
            <h2 className="text-3xl font-medium leading-tight mb-4" style={{ color: "#04342C", fontFamily: "'Lora', serif", letterSpacing: "-0.3px" }}>
              Best Software for Dental Clinics & Dentists
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#444441" }}>
              DentEase is an electronic health record management system built specifically for dental clinics in Pakistan. Store patient records, track treatments, manage lab work and monitor your revenue — all from one simple platform. Works on desktop, tablet and mobile.
            </p>
            <div className="flex gap-8 pt-5" style={{ borderTop: "0.5px solid #E1F5EE" }}>
              {[["500+", "No. of clinics"], ["850+", "No. of doctors"], ["25+", "No. of cities"]].map(([n, l]) => (
                <div key={l}>
                  <div className="text-2xl font-medium" style={{ color: "#0F6E56", fontFamily: "'Lora', serif" }}>{n}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#888780" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ background: "#F8FEFA" }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 rounded-full" style={{ background: "#1D9E75" }} />
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#0F6E56" }}>Core Features</span>
          </div>
          <h2 className="text-3xl font-medium mb-2" style={{ color: "#04342C", fontFamily: "'Lora', serif" }}>
            Everything you need to run a <span style={{ color: "#1D9E75", fontStyle: "italic" }}>modern clinic</span>
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "#444441", maxWidth: "500px" }}>
            From your first patient to your 10,000th — DentEase grows with you. Built specifically for dental professionals in Pakistan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="feat-card bg-white rounded-2xl p-5" style={{ border: "0.5px solid #E1F5EE" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "#E1F5EE" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-medium mb-2" style={{ color: "#04342C" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "#5F5E5A" }}>{f.desc}</p>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}>{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-0.5 rounded-full" style={{ background: "#1D9E75" }} />
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#0F6E56" }}>How It Works</span>
        </div>
        <h2 className="text-3xl font-medium mb-2" style={{ color: "#04342C", fontFamily: "'Lora', serif" }}>
          Up and running in <span style={{ color: "#1D9E75", fontStyle: "italic" }}>3 simple steps</span>
        </h2>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "#444441", maxWidth: "460px" }}>
          No complicated setup. No training required. Just sign up and start managing your clinic today.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: "1", title: "Create your free account", desc: "Sign up in 30 seconds with just your email. No credit card, no commitment. Instant access to all features." },
            { n: "2", title: "Set up your clinic profile", desc: "Add your clinic name, doctors, currency preference and basic settings. Takes less than 5 minutes." },
            { n: "3", title: "Start managing patients", desc: "Add your first patient, book appointments, track payments and watch your clinic run like clockwork." },
          ].map((s, i) => (
            <div key={i} className="relative bg-white rounded-2xl p-6" style={{ border: "0.5px solid #E1F5EE" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-sm font-medium" style={{ background: "#04342C", color: "#9FE1CB" }}>{s.n}</div>
              <h3 className="text-sm font-medium mb-2" style={{ color: "#04342C" }}>{s.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#5F5E5A" }}>{s.desc}</p>
              {i < 2 && (
                <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full items-center justify-center" style={{ background: "#E1F5EE" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEWS ────────────────────────────────────────────────────────── */}
      <section id="reviews" style={{ background: "#F8FEFA" }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-0.5 rounded-full" style={{ background: "#1D9E75" }} />
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#0F6E56" }}>Reviews</span>
          </div>
          <h2 className="text-3xl font-medium mb-2" style={{ color: "#04342C", fontFamily: "'Lora', serif" }}>
            Loved by <span style={{ color: "#1D9E75", fontStyle: "italic" }}>dental professionals</span>
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "#444441", maxWidth: "460px" }}>
            Real feedback from dentists who use DentEase every single day in their clinics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-5" style={{ border: "0.5px solid #E1F5EE" }}>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="w-3.5 h-3.5 rounded-sm" style={{ background: j < t.stars ? "#EF9F27" : "#E1F5EE" }} />
                  ))}
                </div>
                <p className="text-xs leading-relaxed mb-4 italic" style={{ color: "#444441" }}>&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: "#0F6E56", color: "#E1F5EE" }}>{t.initials}</div>
                  <div>
                    <div className="text-xs font-medium" style={{ color: "#04342C" }}>{t.name}</div>
                    <div className="text-xs" style={{ color: "#888780" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Review Form */}
          <div className="bg-white rounded-2xl p-6" style={{ border: "0.5px solid #E1F5EE" }}>
            <h3 className="text-base font-medium mb-1" style={{ color: "#04342C" }}>Share your experience with DentEase</h3>
            <p className="text-xs mb-5" style={{ color: "#888780" }}>Your review helps other dental professionals find the right software for their clinic.</p>
            <form onSubmit={handleReviewSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input required placeholder="Your full name" value={reviewForm.name} onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2" style={{ background: "#F8FEFA", border: "0.5px solid #9FE1CB", color: "#04342C", fontFamily: "'DM Sans', sans-serif" }} />
                <input required placeholder="Your designation (e.g. BDS, Lahore)" value={reviewForm.designation} onChange={e => setReviewForm({ ...reviewForm, designation: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2" style={{ background: "#F8FEFA", border: "0.5px solid #9FE1CB", color: "#04342C", fontFamily: "'DM Sans', sans-serif" }} />
              </div>
              <input placeholder="Clinic name (optional)" value={reviewForm.clinic} onChange={e => setReviewForm({ ...reviewForm, clinic: e.target.value })} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none mb-3 focus:ring-2" style={{ background: "#F8FEFA", border: "0.5px solid #9FE1CB", color: "#04342C", fontFamily: "'DM Sans', sans-serif" }} />
              <textarea required placeholder="Write your honest review — what did you like most about DentEase?" value={reviewForm.review} onChange={e => setReviewForm({ ...reviewForm, review: e.target.value })} rows={3} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none mb-3 resize-none focus:ring-2" style={{ background: "#F8FEFA", border: "0.5px solid #9FE1CB", color: "#04342C", fontFamily: "'DM Sans', sans-serif" }} />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#888780" }}>Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: r })} className="review-star">
                        <div className="w-5 h-5 rounded" style={{ background: r <= reviewForm.rating ? "#EF9F27" : "#E1F5EE" }} />
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary px-6 py-2.5 text-sm">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-0.5 rounded-full" style={{ background: "#1D9E75" }} />
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#0F6E56" }}>FAQ</span>
        </div>
        <h2 className="text-3xl font-medium mb-2" style={{ color: "#04342C", fontFamily: "'Lora', serif" }}>
          Frequently asked <span style={{ color: "#1D9E75", fontStyle: "italic" }}>questions</span>
        </h2>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "#444441", maxWidth: "400px" }}>
          Got a question? We have answers. Reach out on WhatsApp if you need more help.
        </p>
        <div className="flex flex-col gap-3 max-w-3xl">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ border: "0.5px solid #E1F5EE" }}>
              <button className="w-full text-left px-5 py-4 flex justify-between items-center bg-white" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span className="text-sm font-medium" style={{ color: "#04342C" }}>{f.q}</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition-transform" style={{ background: "#E1F5EE", transform: openFaq === i ? "rotate(180deg)" : "none" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-xs leading-relaxed" style={{ color: "#5F5E5A", background: "#F8FEFA", borderTop: "0.5px solid #E1F5EE", animation: "slideDown 0.2s ease" }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#04342C" }} className="relative overflow-hidden">
        <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, border: "0.5px solid rgba(29,158,117,0.12)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, border: "0.5px solid rgba(29,158,117,0.07)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, border: "0.5px solid rgba(29,158,117,0.1)", borderRadius: "50%" }} />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 text-xs" style={{ background: "rgba(29,158,117,0.2)", border: "0.5px solid rgba(29,158,117,0.3)", color: "#9FE1CB" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5DCAA5" }} />
            100% Free — No credit card needed
          </div>
          <h2 className="text-4xl font-medium mb-4 leading-tight" style={{ color: "#fff", fontFamily: "'Lora', serif", letterSpacing: "-0.5px" }}>
            Ready to transform your<br />dental clinic?
          </h2>
          <p className="text-sm leading-relaxed mb-8 mx-auto" style={{ color: "#9FE1CB", maxWidth: "420px" }}>
            Join 500+ dentists already managing their clinics smarter with DentEase. Get started in under 5 minutes — completely free.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-4">
            <Link href="/login">
              <button className="px-8 py-3 rounded-full text-sm font-medium transition-all hover:opacity-90" style={{ background: "#fff", color: "#0F6E56" }}>
                Create Free Account
              </button>
            </Link>
            <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer">
              <button className="btn-outline px-8 py-3 text-sm flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 3 3.18 2 2 0 0 1 4.11 1h3a2 2 0 0 1 2 1.72 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                Talk to us on WhatsApp
              </button>
            </a>
          </div>
          <p className="text-xs" style={{ color: "#5DCAA5" }}>No setup fees. No contracts. Cancel anytime.</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#04342C", borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1D9E75" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E1F5EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" />
                  </svg>
                </div>
                <span className="font-medium text-white" style={{ fontFamily: "'Lora', serif" }}>DentEase</span>
              </div>
              <p className="text-xs leading-relaxed mb-4" style={{ color: "#5DCAA5", maxWidth: "180px" }}>
                Modern dental clinic management software built for dental professionals in Pakistan and worldwide.
              </p>
              <div className="flex gap-2">
                {["M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z", "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M2 2h20v20H2z", "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"].map((d, i) => (
                  <div key={i} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9FE1CB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
                  </div>
                ))}
              </div>
            </div>
            {[
              { title: "Product", links: ["Features", "How it works", "Download App", "Changelog", "Roadmap"] },
              { title: "Support", links: ["Documentation", "Contact Us", "WhatsApp Chat", "Video Tutorials", "Report a Bug"] },
              { title: "Company", links: ["About Us", "Privacy Policy", "Terms of Service", "Cookie Policy", "Careers"] },
            ].map(col => (
              <div key={col.title}>
                <div className="text-xs font-medium mb-4 uppercase tracking-wider" style={{ color: "#9FE1CB" }}>{col.title}</div>
                {col.links.map(l => (
                  <a key={l} href="#" className="block text-xs mb-2.5 transition-colors hover:text-white" style={{ color: "#5DCAA5" }}>{l}</a>
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-6" style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs" style={{ color: "#5DCAA5" }}>© 2025 DentEase. All rights reserved.</p>
            <div className="flex gap-2">
              {["SSL Secured", "HIPAA Friendly", "99.9% Uptime"].map(b => (
                <span key={b} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#9FE1CB" }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}