"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HCaptcha>(null);

  const handleReset = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://dental-saas-lac.vercel.app/reset-password",
      captchaToken,
    });
    captchaRef.current?.resetCaptcha();
    setCaptchaToken("");
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess("Password reset email sent! Please check your inbox.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-teal-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-teal-800 tracking-tight">
            Dent<span className="text-teal-500">Ease</span>
          </h1>
          <p className="text-sm text-teal-600 mt-1">Reset Your Password</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-5">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg mb-5">{success}</div>}

        {!success && (
          <div className="space-y-4">
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

            <div className="flex justify-center">
              <HCaptcha
                sitekey="6fec9dbc-a6d4-4e7a-b9ca-79f08b62d37e"
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken("")}
                ref={captchaRef}
              />
            </div>

            <button
              onClick={handleReset}
              disabled={loading || !captchaToken}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Email"}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-teal-500 hover:underline text-sm">
            Back to Sign In
          </a>
        </div>

        <div className="mt-5 text-center border-t border-teal-100 pt-4">
          <p className="text-xs text-teal-400">2026 DentEase. All rights reserved.</p>
        </div>

      </div>
    </main>
  );
}