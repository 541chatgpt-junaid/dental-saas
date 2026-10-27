"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://dental-saas-lac.vercel.app/reset-password",
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess("Password reset email sent! Please check your inbox.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-brand-800 tracking-tight">
            Dent<span className="text-brand-500">Ease</span>
          </h1>
          <p className="text-sm text-brand-600 mt-1">Reset Your Password</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-5">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg mb-5">{success}</div>}

        {!success && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="doctor@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-brand-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold text-gray-700"
              />
            </div>


            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send Reset Email"}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-brand-500 hover:underline text-sm">
            Back to Sign In
          </a>
        </div>

        <div className="mt-5 text-center border-t border-brand-100 pt-4">
          <p className="text-xs text-brand-400">2026 DentEase. All rights reserved.</p>
        </div>

      </div>
    </main>
  );
}