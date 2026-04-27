"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const currencies = [
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
];

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    clinic_name: "",
    clinic_address: "",
    clinic_phone: "",
    clinic_email: "",
    currency: "PKR",
  });
  const router = useRouter();

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const { data } = await supabase.from("settings").select("*").single();
      if (data) setForm({
        clinic_name: data.clinic_name || "",
        clinic_address: data.clinic_address || "",
        clinic_phone: data.clinic_phone || "",
        clinic_email: data.clinic_email || "",
        currency: data.currency || "PKR",
      });
    };
    fetchSettings();
  }, [router]);

  const handleSave = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: existing } = await supabase.from("settings").select("id").single();
    if (existing) {
      await supabase.from("settings").update({
        clinic_name: form.clinic_name,
        clinic_address: form.clinic_address,
        clinic_phone: form.clinic_phone,
        clinic_email: form.clinic_email,
        currency: form.currency,
      }).eq("id", existing.id);
    } else {
      await supabase.from("settings").insert([{
        clinic_name: form.clinic_name,
        clinic_address: form.clinic_address,
        clinic_phone: form.clinic_phone,
        clinic_email: form.clinic_email,
        currency: form.currency,
      }]);
    }
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const selectedCurrency = currencies.find(c => c.code === form.currency);

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-teal-800">Clinic Settings</h2>
          <p className="text-sm text-teal-600 mt-1">Setup your clinic information</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-teal-100 max-w-2xl">
          <h3 className="text-sm font-semibold text-teal-800 mb-6">Clinic Information</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-teal-700 mb-1">Clinic Name</label>
              <input placeholder="e.g. Dr. Ahmed Dental Care" value={form.clinic_name} onChange={e => setForm({...form, clinic_name: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-teal-700 mb-1">Clinic Address</label>
              <input placeholder="e.g. Shop 5, Main Market, Lahore" value={form.clinic_address} onChange={e => setForm({...form, clinic_address: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-teal-700 mb-1">Phone Number</label>
              <input placeholder="e.g. 0300-1234567" value={form.clinic_phone} onChange={e => setForm({...form, clinic_phone: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-teal-700 mb-1">Email Address</label>
              <input placeholder="e.g. clinic@email.com" value={form.clinic_email} onChange={e => setForm({...form, clinic_email: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-xs font-medium text-teal-700 mb-1">Currency</label>
              <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} — {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {selectedCurrency && (
                <div className="mt-2 bg-teal-50 rounded-lg px-4 py-2 flex items-center gap-2">
                  <span className="text-lg font-bold text-teal-700">{selectedCurrency.symbol}</span>
                  <span className="text-sm text-teal-600">{selectedCurrency.name} — All amounts will show in {selectedCurrency.code}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button onClick={handleSave} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60">
              {loading ? "Saving..." : "Save Settings"}
            </button>
            {saved && <span className="text-green-600 text-sm font-medium">✅ Settings saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}