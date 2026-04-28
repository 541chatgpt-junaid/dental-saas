"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleSignUp = async () => {
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
      options: { data: { clinic_name: clinicName } }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess("Account created! You can now sign in.");
      setLoading(false);
    }
  };

  const whatsappNumber = "+92-310-5913101";
  const whatsappLink = "https://wa.me/923105913101";
  const supportEmail = "support@dentease.com";

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
            onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${isLogin ? "bg-white text-teal-700 shadow-sm" : "text-teal-500"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
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
                placeholder="••••••••"
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

          <button
            onClick={isLogin ? handleLogin : handleSignUp}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </div>

        <div className="mt-6 bg-teal-50 rounded-xl p-4 text-center">
          <p className="text-xs text-teal-600 font-medium mb-2">Need Help? Contact Support</p>
          
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-white bg-green-500 hover:bg-green-600 py-2 px-4 rounded-lg mb-2 transition-colors"
          >
            {"WhatsApp: " + whatsappNumber}
          </a>
          
            href={"mailto:" + supportEmail}
            className="text-xs text-teal-500 hover:underline block"
          >
            {supportEmail}
          </a>
        </div>

        <div className="mt-5 text-center border-t border-teal-100 pt-4">
          <p className="text-xs text-teal-400">{"© 2026 DentEase. All rights reserved."}</p>
          <p className="text-xs text-teal-300 mt-1">
            {"Designed & Developed by "}
            <span className="text-teal-500 font-medium">Junaid Mazhar</span>
            {" · "}
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-teal-400 hover:underline">
              {whatsappNumber}
            </a>
          </p>
        </div>

      </div>
    </main>
  );
}