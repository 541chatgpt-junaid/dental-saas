"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function RegisterPage() {
  const [form, setForm] = useState({
    clinicName: "", email: "", password: "", confirmPassword: "", phone: "", address: "",
  });
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    setError("");
    if (!form.clinicName || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicName: form.clinicName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
      }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken("");
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-teal-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-teal-100 w-full max-w-md p-10 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <h2 className="text-xl font-semibold text-teal-800 mb-2">Clinic Registered!</h2>
          <p className="text-sm text-teal-500">Redirecting to login...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-teal-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-teal-100 w-full max-w-md p-8">
        <div className="text-center mb-7">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-teal-800">Register Your Clinic</h1>
          <p className="text-sm text-teal-500 mt-1">Create your free DentEase account</p>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Clinic Name *"
            value={form.clinicName}
            onChange={e => setForm({ ...form, clinicName: e.target.value })}
            className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <input
            placeholder="Admin Email *"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <div className="relative">
            <input
              placeholder="Password * (min 6 characters)"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 pr-12"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showPassword
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
              </svg>
            </button>
          </div>
          <input
            placeholder="Confirm Password *"
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <input
            placeholder="Phone Number"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <input
            placeholder="Clinic Address"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          <div className="flex justify-center pt-1">
            <HCaptcha
              sitekey="6fec9dbc-a6d4-4e7a-b9ca-79f08b62d37e"
              onVerify={token => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              ref={captchaRef}
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Creating your clinic..." : "Register Clinic — Free"}
          </button>
        </div>

        <div className="mt-5 text-center">
          <p className="text-sm text-teal-500">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-700 font-medium hover:underline">Login</Link>
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-teal-100 text-center">
          <p className="text-xs text-teal-300">2026 DentEase. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
