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
      options: { captchaToken },
    });
    captchaRef.current?.resetCaptcha();
    setCaptchaToken("");
    if (error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleSignUp = async () => {
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    if (!clinicName) {
      setError("Please enter your clinic name.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        data: { clinic_name: clinicName }
      }
    });
    captchaRef.current?.resetCaptcha();
    setCaptchaToken("");
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess("Account created! Please check your email to confirm your account.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://dental-saas-lac.vercel.app/dashboard",
      },
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-teal-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-teal-800 tracking-tight">
            Dent<span className="text-teal-500">Ease</span>
          </h1>
          <p className="text-sm text-teal-600 mt-1">Dental Practice Management</p>
        </div>

        <div className="flex mb-6 bg-teal-50 rounded-xl p-1">
          <button
            onClick={() => { setIsLogin(true); setError(""); setSuccess(""); setCaptchaToken(""); captchaRef.current?.resetCaptcha(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${isLogin ? "bg-white text-teal-700 shadow-sm" : "text-teal-500"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); setSuccess(""); setCaptchaToken(""); captchaRef.current?.resetCaptcha(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!isLogin ? "bg-white text-teal-700 shadow-sm" : "text-teal-500"}`}
          >
            Create Account
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-5">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg mb-5">{success}</div>}

        <div className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-teal-700 mb-1">Clinic Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. Ahmed Dental Care"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full px-4 py-2.5 border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-700"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-teal-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="doctor@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-teal-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="........"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-700 pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-600 text-xs font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-teal-700">
                <input type="checkbox" className="accent-teal-500" />
                Remember me
              </label>
              <a href="#" className="text-teal-500 hover:underline">Forgot password?</a>
            </div>
          )}

          <div className="flex justify-center">
            <HCaptcha
              sitekey="6fec9dbc-a6d4-4e7a-b9ca-79f08b62d37e"
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              ref={captchaRef}
            />
          </div>

          <button
            onClick={isLogin ? handleLogin : handleSignUp}
            disabled={loading || !captchaToken}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-teal-100"></div>
            <span className="text-xs text-teal-400">OR</span>
            <div className="flex-1 h-px bg-teal-100"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-5 text-center border-t border-teal-100 pt-4">
          <p className="text-xs text-teal-400">2026 DentEase. All rights reserved.</p>
          <p className="text-xs text-teal-300 mt-1">
            Designed and Developed by
            <a href="https://wa.me/923105913101" target="_blank" rel="noreferrer" className="text-teal-500 font-medium"> Junaid Mazhar</a>
          </p>
        </div>

      </div>
    </main>
  );
}