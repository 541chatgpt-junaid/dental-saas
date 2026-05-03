"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HCaptcha>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken,
      },
    });
    if (error) {
      setError(error.message);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken("");
    } else {
      router.push("/dashboard/patients");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { clinic_name: clinicName },
        captchaToken,
      },
    });
    if (error) {
      setError(error.message);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken("");
    } else {
      setSuccess("Account created! Please check your email to verify.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-teal-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-teal-100 w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8 2 4 5.5 4 10c0 6 8 12 8 12s8-6 8-12c0-4.5-4-8-8-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-teal-800">DentEase</h1>
          <p className="text-sm text-teal-500 mt-1">Dental Clinic Management</p>
        </div>

        <div className="flex bg-teal-50 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? "bg-white text-teal-800 shadow-sm" : "text-teal-500"}`}
          >
            Login
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? "bg-white text-teal-800 shadow-sm" : "text-teal-500"}`}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-4">
          {!isLogin && (
            <input
              placeholder="Clinic Name"
              value={clinicName}
              onChange={e => setClinicName(e.target.value)}
              className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          )}
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <div className="relative">
            <input
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          <div className="flex justify-center">
            <HCaptcha
              sitekey="6fec9dbc-a6d4-4e7a-b9ca-79f08b62d37e"
              onVerify={token => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              ref={captchaRef}
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          {success && <p className="text-green-600 text-xs text-center">{success}</p>}

          <button
            onClick={isLogin ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </button>

          {isLogin && (
            <div className="text-center">
              <a href="/forgot-password" className="text-xs text-teal-500 hover:underline">
                Forgot password?
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-teal-100">
          <button className="w-full flex items-center justify-center gap-3 border border-teal-200 rounded-xl py-2.5 text-sm text-teal-700 hover:bg-teal-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-5 text-center border-t border-teal-100 pt-4">
          <p className="text-xs text-teal-400">2026 DentEase. All rights reserved.</p>
          <p className="text-xs text-teal-300 mt-1">
            Designed and Developed by{" "}
            <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" className="text-teal-500 font-medium">
              Junaid Mazhar
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}