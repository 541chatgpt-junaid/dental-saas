"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SetupClinicPage() {
  const [form, setForm] = useState({ clinicName: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // If clinic already set up, go straight to dashboard
      const { data: staff } = await supabase
        .from("staff")
        .select("clinic_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (staff?.clinic_id) { router.replace("/dashboard"); return; }

      setChecking(false);
    })();
  }, [router]);

  const handleSubmit = async () => {
    if (!form.clinicName) { setError("Clinic name is required."); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/setup-clinic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-teal-50">
        <p className="text-teal-500 text-sm">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-teal-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-teal-100 w-full max-w-md p-8">
        <div className="text-center mb-7">
          <div className="flex justify-center mb-3">
            <Image
              src="/images/dentease-logo.webp"
              alt="DentEase"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-teal-800">Set Up Your Clinic</h1>
          <p className="text-sm text-teal-500 mt-1">Almost there — just tell us about your clinic</p>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Clinic Name *"
            value={form.clinicName}
            onChange={e => setForm({ ...form, clinicName: e.target.value })}
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

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Setting up your clinic..." : "Complete Setup"}
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-teal-100 text-center">
          <p className="text-xs text-teal-300">2026 DentEase. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
