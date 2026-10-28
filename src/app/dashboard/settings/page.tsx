"use client";
import { useState, useEffect } from "react";
import EmptyState from "@/components/EmptyState";
import { CircleCheck, ClipboardList, Globe, Hospital, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useClinic } from "@/lib/ClinicContext";
import { useCurrency } from "@/lib/useCurrency";
import FormError from "@/components/FormError";
import { readAmount, saveErrorMessage } from "@/lib/formSave";
import OnlinePayments from "./OnlinePayments";
import ConsentForms from "./ConsentForms";
import Reminders from "./Reminders";

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

const getAutoCurrency = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Karachi") || tz.includes("Pakistan")) return "PKR";
    if (tz.includes("London") || tz.includes("Europe/London")) return "GBP";
    if (tz.includes("Dubai") || tz.includes("Abu_Dhabi")) return "AED";
    if (tz.includes("Riyadh") || tz.includes("Saudi")) return "SAR";
    if (tz.includes("America")) return "USD";
    if (tz.includes("Sydney") || tz.includes("Melbourne")) return "AUD";
    if (tz.includes("Toronto") || tz.includes("Vancouver")) return "CAD";
    if (tz.includes("Europe")) return "EUR";
  } catch { }
  return "PKR";
};

interface TreatmentPreset { id: string; name: string; price: number; }
interface PrescriptionPreset { id: string; group_name: string; medicine: string; dosage: string; frequency: string; duration: string; notes: string; }

type Tab = "general" | "treatments" | "prescriptions" | "payments" | "consent" | "reminders";

export default function Settings() {
  const [tab, setTab] = useState<Tab>("general");

  // General settings
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  // Shown above the current tab; forms keep what was typed when a save fails
  const [saveError, setSaveError] = useState("");
  const [autoDetected, setAutoDetected] = useState("");
  const [form, setForm] = useState({ clinic_name: "", clinic_address: "", clinic_phone: "", clinic_email: "", currency: "PKR" });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");

  // Treatment presets
  const [treatments, setTreatments] = useState<TreatmentPreset[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const [tForm, setTForm] = useState({ name: "", price: "" });
  const [tEditId, setTEditId] = useState<string | null>(null);
  const [tEditForm, setTEditForm] = useState({ name: "", price: "" });

  // Prescription presets
  const [prescriptions, setPrescriptions] = useState<PrescriptionPreset[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [pGroupName, setPGroupName] = useState("");
  const [medicineRows, setMedicineRows] = useState([{ medicine: "", dosage: "", frequency: "", duration: "", notes: "" }]);
  const [pEditId, setPEditId] = useState<string | null>(null);
  const [pEditForm, setPEditForm] = useState({ group_name: "", medicine: "", dosage: "", frequency: "", duration: "", notes: "" });

  const router = useRouter();
  const { clinicId, loading: clinicLoading, refresh: refreshClinic } = useClinic();
  const { symbol } = useCurrency();

  useEffect(() => {
    if (clinicLoading) return;
    const auto = getAutoCurrency();
    setAutoDetected(auto);
    const fetchSettings = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const { data } = await supabase.from("settings").select("*").maybeSingle();
      // What was entered at signup lives on the clinic record: use it for anything not saved here yet
      const { data: clinic } = clinicId
        ? await supabase.from("clinics").select("name, email, phone, address, logo_url").eq("id", clinicId).maybeSingle()
        : { data: null };
      setLogoUrl(clinic?.logo_url ?? null);
      setForm({
        clinic_name: data?.clinic_name || clinic?.name || "",
        clinic_address: data?.clinic_address || clinic?.address || "",
        clinic_phone: data?.clinic_phone || clinic?.phone || "",
        clinic_email: data?.clinic_email || clinic?.email || "",
        currency: data?.currency || auto,
      });
    };
    fetchSettings();
  }, [router, clinicId, clinicLoading]);

  useEffect(() => {
    fetchTreatments();
    fetchPrescriptions();
  }, []);

  const fetchTreatments = async () => {
    const res = await fetch("/api/presets?type=treatments");
    const json = await res.json();
    setTreatments(json.data || []);
  };

  const fetchPrescriptions = async () => {
    const res = await fetch("/api/presets?type=prescriptions");
    const json = await res.json();
    setPrescriptions(json.data || []);
  };

  // General save
  const handleSave = async () => {
    if (!form.clinic_name.trim()) { setSaveError("Clinic name is required."); return; }
    setLoading(true);
    setSaveError("");
    const supabase = createClient();
    const { data: existing } = await supabase.from("settings").select("id").maybeSingle();
    const { error } = existing
      ? await supabase.from("settings").update({ clinic_name: form.clinic_name, clinic_address: form.clinic_address, clinic_phone: form.clinic_phone, clinic_email: form.clinic_email, currency: form.currency }).eq("id", existing.id)
      : await supabase.from("settings").insert([{ ...form, clinic_id: clinicId }]);
    setLoading(false);
    if (error) { setSaveError(saveErrorMessage(error, "settings")); return; }
    await refreshClinic(); // expire the server-side clinic cache so the edit shows immediately
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  /** Upload or remove the clinic logo (shown on the online booking page) */
  const changeLogo = async (file: File | null) => {
    setLogoBusy(true); setLogoError("");
    try {
      const res = file
        ? await fetch("/api/clinic-logo", { method: "POST", body: (() => { const f = new FormData(); f.append("file", file); return f; })() })
        : await fetch("/api/clinic-logo", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) setLogoError(json.error || "Could not change the logo. Please try again.");
      else setLogoUrl(file ? json.url : null);
    } catch { setLogoError("Network error. Please check your connection and try again."); }
    setLogoBusy(false);
  };

  /** Call the presets API; returns an error message naming the problem, or null */
  const presetRequest = async (what: string, url: string, init: RequestInit) => {
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const json = await res.json().catch(() => ({}));
      if (res.ok && !json.error) return null;
      return saveErrorMessage({ message: json.error || res.statusText, code: json.code }, what);
    } catch {
      return saveErrorMessage({ message: "Failed to fetch" }, what);
    }
  };

  // Treatment preset actions
  const addTreatment = async () => {
    if (!tForm.name.trim()) { setSaveError("Treatment name is required."); return; }
    const price = readAmount(tForm.price, "Price");
    if (price.error) { setSaveError(price.error); return; }
    setTLoading(true);
    const err = await presetRequest("treatment preset", "/api/presets", {
      method: "POST",
      body: JSON.stringify({ type: "treatments", name: tForm.name.trim(), price: price.value }),
    });
    setTLoading(false);
    setSaveError(err || "");
    if (err) return;
    setTForm({ name: "", price: "" });
    await fetchTreatments();
  };

  const saveTreatmentEdit = async (id: string) => {
    if (!tEditForm.name.trim()) { setSaveError("Treatment name is required."); return; }
    const price = readAmount(tEditForm.price, "Price");
    if (price.error) { setSaveError(price.error); return; }
    const err = await presetRequest("treatment preset", "/api/presets", {
      method: "PATCH",
      body: JSON.stringify({ type: "treatments", id, name: tEditForm.name.trim(), price: price.value }),
    });
    setSaveError(err || "");
    if (err) return;
    setTEditId(null);
    fetchTreatments();
  };

  const deleteTreatment = async (id: string) => {
    if (!confirm("Delete this treatment preset?")) return;
    const err = await presetRequest("treatment preset", `/api/presets?type=treatments&id=${id}`, { method: "DELETE" });
    setSaveError(err ? err.replace("save", "delete") : "");
    fetchTreatments();
  };

  // Prescription preset actions
  const addPrescription = async () => {
    if (!pGroupName.trim()) { setSaveError("Group name is required."); return; }
    const validRows = medicineRows.filter(r => r.medicine.trim());
    if (!validRows.length) { setSaveError("Add at least one medicine."); return; }
    setPLoading(true);
    const err = await presetRequest("prescription preset", "/api/presets", {
      method: "POST",
      body: JSON.stringify({
        type: "prescriptions",
        group_name: pGroupName.trim(),
        rows: validRows.map(r => ({ ...r, medicine: r.medicine.trim() })),
      }),
    });
    setPLoading(false);
    setSaveError(err || "");
    if (err) return;
    setPGroupName("");
    setMedicineRows([{ medicine: "", dosage: "", frequency: "", duration: "", notes: "" }]);
    await fetchPrescriptions();
  };

  const updateMedicineRow = (idx: number, field: string, val: string) =>
    setMedicineRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: val } : r));

  const savePrescriptionEdit = async (id: string) => {
    if (!pEditForm.medicine.trim()) { setSaveError("Medicine name is required."); return; }
    const err = await presetRequest("prescription preset", "/api/presets", {
      method: "PATCH",
      body: JSON.stringify({ type: "prescriptions", id, ...pEditForm, group_name: pEditForm.group_name.trim(), medicine: pEditForm.medicine.trim() }),
    });
    setSaveError(err || "");
    if (err) return;
    setPEditId(null);
    fetchPrescriptions();
  };

  const existingGroups = [...new Set(prescriptions.map(rx => rx.group_name).filter(Boolean))];
  const grouped = prescriptions.reduce<Record<string, PrescriptionPreset[]>>((acc, rx) => {
    const key = rx.group_name || "— No Group —";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rx);
    return acc;
  }, {});

  const deletePrescription = async (id: string) => {
    if (!confirm("Delete this prescription preset?")) return;
    const err = await presetRequest("prescription preset", `/api/presets?type=prescriptions&id=${id}`, { method: "DELETE" });
    setSaveError(err ? err.replace("save", "delete") : "");
    fetchPrescriptions();
  };

  const selectedCurrency = currencies.find(c => c.code === form.currency);
  const autoCurrencyName = currencies.find(c => c.code === autoDetected)?.name;

  const TABS = [
    { key: "general", label: "General" },
    { key: "treatments", label: "Treatment Presets" },
    { key: "prescriptions", label: "Prescription Presets" },
    { key: "payments", label: "Online payments" },
    { key: "consent", label: "Consent forms" },
    { key: "reminders", label: "Reminders" },
  ] as const;

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Manage clinic settings and presets</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-brand-200 shadow-sm rounded-xl p-1 mb-6 w-fit max-w-full overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSaveError(""); }}
              className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── GENERAL TAB ── */}
        <FormError message={saveError} />

        {tab === "payments" && <OnlinePayments />}

        {tab === "consent" && <ConsentForms />}

        {tab === "reminders" && <Reminders />}

        {tab === "general" && (
          <div className="bg-white rounded-xl p-5 border border-brand-200 shadow-sm w-full md:max-w-2xl">
            <h3 className="text-sm font-semibold text-brand-800 mb-5">Clinic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clinic Logo</label>
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-200 bg-brand-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {logoUrl ? <img src={logoUrl} alt="Clinic logo" className="h-full w-full object-contain" /> : <Hospital className="h-7 w-7 text-brand-300" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <label className={`cursor-pointer rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:border-gold ${logoBusy ? "pointer-events-none opacity-60" : ""}`}>
                        {logoBusy ? "Working…" : logoUrl ? "Change logo" : "Upload logo"}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={logoBusy}
                          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) changeLogo(f); }} />
                      </label>
                      {logoUrl && <button type="button" onClick={() => changeLogo(null)} disabled={logoBusy} className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:underline disabled:opacity-60">Remove</button>}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">PNG, JPG or WebP, up to 1 MB. Shown on your online booking page.</p>
                  </div>
                </div>
                {logoError && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{logoError}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clinic Name</label>
                <input placeholder="e.g. Dr. Ahmed Dental Care" value={form.clinic_name} onChange={e => setForm({ ...form, clinic_name: e.target.value })} className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clinic Address</label>
                <input placeholder="e.g. Shop 5, Main Market, Lahore" value={form.clinic_address} onChange={e => setForm({ ...form, clinic_address: e.target.value })} className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input placeholder="e.g. 0300-1234567" value={form.clinic_phone} onChange={e => setForm({ ...form, clinic_phone: e.target.value })} className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                <input placeholder="e.g. clinic@email.com" value={form.clinic_email} onChange={e => setForm({ ...form, clinic_email: e.target.value })} className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                {autoDetected && (
                  <div className="mb-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center justify-between">
                    <p className="text-xs text-blue-600"><Globe className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Auto-detected: <span className="font-medium">{autoCurrencyName} ({autoDetected})</span></p>
                    <button onClick={() => setForm({ ...form, currency: autoDetected })} className="text-xs text-blue-600 font-medium hover:underline">Use This</button>
                  </div>
                )}
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>)}
                </select>
                {selectedCurrency && (
                  <div className="mt-2 bg-brand-50 rounded-xl px-4 py-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-brand-700">{selectedCurrency.symbol}</span>
                    <span className="text-sm text-brand-600">{selectedCurrency.name} — {selectedCurrency.code}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button onClick={handleSave} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {loading ? "Saving…" : "Save Settings"}
              </button>
              {saved && <span className="text-green-600 text-sm font-medium"><CircleCheck className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Saved!</span>}
            </div>
          </div>
        )}

        {/* ── TREATMENT PRESETS TAB ── */}
        {tab === "treatments" && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
              These treatments appear as quick-add buttons on the New Invoice page. Each clinic sets their own list and prices.
            </div>

            {/* Add form */}
            <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-brand-800 mb-4">Add Treatment</h3>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Treatment Name *</label>
                  <input
                    placeholder="e.g. Root Canal Treatment"
                    value={tForm.name}
                    onChange={e => setTForm({ ...tForm, name: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && addTreatment()}
                    className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                  />
                </div>
                <div className="w-36">
                  <label className="text-xs text-gray-500 mb-1 block">Price ({symbol})</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={tForm.price}
                    onChange={e => setTForm({ ...tForm, price: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && addTreatment()}
                    className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                  />
                </div>
                <button onClick={addTreatment} disabled={tLoading || !tForm.name.trim()}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                  {tLoading ? "..." : "+ Add"}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-brand-100 bg-brand-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Your Treatment Presets</h3>
                <span className="text-xs text-gray-400">{treatments.length} treatments</span>
              </div>
              {treatments.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No treatments yet" hint="Add your first treatment above." />
              ) : (
                <div className="divide-y divide-gray-50">
                  {treatments.map(t => (
                    <div key={t.id} className="px-5 py-3">
                      {tEditId === t.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            value={tEditForm.name}
                            onChange={e => setTEditForm({ ...tEditForm, name: e.target.value })}
                            className="flex-1 border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                          />
                          <input
                            type="number" min="0"
                            value={tEditForm.price}
                            onChange={e => setTEditForm({ ...tEditForm, price: e.target.value })}
                            className="w-28 border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                          />
                          <button onClick={() => saveTreatmentEdit(t.id)} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg font-medium">Save</button>
                          <button aria-label="X" title="X" onClick={() => setTEditId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2"><X className="inline h-4 w-4" aria-hidden="true" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-brand-800">{t.name}</span>
                            <span className="ml-3 text-xs text-brand-600 font-semibold">{symbol} {t.price.toLocaleString()}</span>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => { setTEditId(t.id); setTEditForm({ name: t.name, price: String(t.price) }); }}
                              className="text-xs text-brand-600 font-medium hover:underline">Edit</button>
                            <button onClick={() => deleteTreatment(t.id)} className="text-xs text-red-400 font-medium hover:underline">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PRESCRIPTION PRESETS TAB ── */}
        {tab === "prescriptions" && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
              Group medicines by treatment name (e.g. "Root Canal Treatment"). In the patient visit form, you can add all medicines in a group with one click.
            </div>

            {/* Add form */}
            <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-brand-800 mb-4">Add Prescription Group</h3>

              {/* Group name */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">Treatment / Group Name *</label>
                <input
                  list="group-list"
                  placeholder="e.g. Root Canal Treatment, Extraction, Filling…"
                  value={pGroupName}
                  onChange={e => setPGroupName(e.target.value)}
                  className="w-full border border-brand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                />
                <datalist id="group-list">
                  {existingGroups.map(g => <option key={g} value={g} />)}
                </datalist>
                <p className="text-xs text-gray-400 mt-1">Type an existing group to add to it, or a new name to create a new group.</p>
              </div>

              {/* Medicine rows */}
              <div className="space-y-3">
                {medicineRows.map((row, idx) => (
                  <div key={idx} className="border border-brand-100 rounded-xl p-3 bg-brand-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Medicine {idx + 1}</span>
                      {medicineRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMedicineRows(rows => rows.filter((_, i) => i !== idx))}
                          className="text-xs text-red-400 hover:text-red-600 font-medium"
                        >Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="md:col-span-2">
                        <input
                          placeholder="Medicine Name * (e.g. Augmentin 625mg)"
                          value={row.medicine}
                          onChange={e => updateMedicineRow(idx, "medicine", e.target.value)}
                          className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                        />
                      </div>
                      <input
                        placeholder="Dosage (e.g. 1 tab, 2 tabs, 500mg)"
                        value={row.dosage}
                        onChange={e => updateMedicineRow(idx, "dosage", e.target.value)}
                        className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                      />
                      <input
                        placeholder="Frequency (e.g. 2x daily)"
                        value={row.frequency}
                        onChange={e => updateMedicineRow(idx, "frequency", e.target.value)}
                        className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                      />
                      <input
                        placeholder="Duration (e.g. 5 days)"
                        value={row.duration}
                        onChange={e => updateMedicineRow(idx, "duration", e.target.value)}
                        className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                      />
                      <input
                        placeholder="Instructions (e.g. After meals)"
                        value={row.notes}
                        onChange={e => updateMedicineRow(idx, "notes", e.target.value)}
                        className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setMedicineRows(rows => [...rows, { medicine: "", dosage: "", frequency: "", duration: "", notes: "" }])}
                  className="text-brand-600 text-sm hover:underline"
                >
                  + Add Another Medicine
                </button>
                <button
                  onClick={addPrescription}
                  disabled={pLoading || !pGroupName.trim() || !medicineRows.some(r => r.medicine.trim())}
                  className="ml-auto bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {pLoading ? "Saving…" : `Save Group (${medicineRows.filter(r => r.medicine.trim()).length} medicine${medicineRows.filter(r => r.medicine.trim()).length !== 1 ? "s" : ""})`}
                </button>
              </div>
            </div>

            {/* Grouped List */}
            {prescriptions.length === 0 ? (
              <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-10 text-center text-sm text-gray-400">
                No prescription presets yet. Add your first medicine above.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([groupName, meds]) => (
                  <div key={groupName} className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden">
                    {/* Group header */}
                    <div className="px-5 py-3 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-brand-800">{groupName}</span>
                        <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full font-medium">{meds.length} medicine{meds.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    {/* Medicines */}
                    <div className="divide-y divide-gray-50">
                      {meds.map(rx => (
                        <div key={rx.id} className="px-5 py-3">
                          {pEditId === rx.id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  list="group-list-edit"
                                  value={pEditForm.group_name}
                                  onChange={e => setPEditForm({ ...pEditForm, group_name: e.target.value })}
                                  placeholder="Group Name"
                                  className="col-span-2 border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                                />
                                <datalist id="group-list-edit">
                                  {existingGroups.map(g => <option key={g} value={g} />)}
                                </datalist>
                                <input value={pEditForm.medicine} onChange={e => setPEditForm({ ...pEditForm, medicine: e.target.value })} placeholder="Medicine" className="col-span-2 border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                                <input value={pEditForm.dosage} onChange={e => setPEditForm({ ...pEditForm, dosage: e.target.value })} placeholder="Dosage" className="border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                                <input value={pEditForm.frequency} onChange={e => setPEditForm({ ...pEditForm, frequency: e.target.value })} placeholder="Frequency" className="border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                                <input value={pEditForm.duration} onChange={e => setPEditForm({ ...pEditForm, duration: e.target.value })} placeholder="Duration" className="border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                                <input value={pEditForm.notes} onChange={e => setPEditForm({ ...pEditForm, notes: e.target.value })} placeholder="Instructions" className="border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => savePrescriptionEdit(rx.id)} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg font-medium">Save</button>
                                <button onClick={() => setPEditId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="text-sm font-semibold text-brand-800">{rx.medicine}</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {rx.dosage && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{rx.dosage}</span>}
                                  {rx.frequency && <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">{rx.frequency}</span>}
                                  {rx.duration && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{rx.duration}</span>}
                                  {rx.notes && <span className="text-xs text-gray-400 italic">{rx.notes}</span>}
                                </div>
                              </div>
                              <div className="flex gap-3 shrink-0">
                                <button onClick={() => { setPEditId(rx.id); setPEditForm({ group_name: rx.group_name, medicine: rx.medicine, dosage: rx.dosage, frequency: rx.frequency, duration: rx.duration, notes: rx.notes }); }}
                                  className="text-xs text-brand-600 font-medium hover:underline">Edit</button>
                                <button onClick={() => deletePrescription(rx.id)} className="text-xs text-red-400 font-medium hover:underline">Delete</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
