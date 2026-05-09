"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useClinic } from "@/lib/ClinicContext";
import { useCurrency } from "@/lib/useCurrency";

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

type Tab = "general" | "treatments" | "prescriptions";

export default function Settings() {
  const [tab, setTab] = useState<Tab>("general");

  // General settings
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoDetected, setAutoDetected] = useState("");
  const [form, setForm] = useState({ clinic_name: "", clinic_address: "", clinic_phone: "", clinic_email: "", currency: "PKR" });

  // Treatment presets
  const [treatments, setTreatments] = useState<TreatmentPreset[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const [tForm, setTForm] = useState({ name: "", price: "" });
  const [tEditId, setTEditId] = useState<string | null>(null);
  const [tEditForm, setTEditForm] = useState({ name: "", price: "" });

  // Prescription presets
  const [prescriptions, setPrescriptions] = useState<PrescriptionPreset[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [pForm, setPForm] = useState({ group_name: "", medicine: "", dosage: "", frequency: "", duration: "", notes: "" });
  const [pEditId, setPEditId] = useState<string | null>(null);
  const [pEditForm, setPEditForm] = useState({ group_name: "", medicine: "", dosage: "", frequency: "", duration: "", notes: "" });

  const router = useRouter();
  const { clinicId } = useClinic();
  const { symbol } = useCurrency();

  useEffect(() => {
    const auto = getAutoCurrency();
    setAutoDetected(auto);
    const fetchSettings = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const { data } = await supabase.from("settings").select("*").single();
      if (data) {
        setForm({ clinic_name: data.clinic_name || "", clinic_address: data.clinic_address || "", clinic_phone: data.clinic_phone || "", clinic_email: data.clinic_email || "", currency: data.currency || auto });
      } else {
        setForm(f => ({ ...f, currency: auto }));
      }
    };
    fetchSettings();
  }, [router]);

  useEffect(() => {
    if (!clinicId) return;
    fetchTreatments();
    fetchPrescriptions();
  }, [clinicId]);

  const fetchTreatments = async () => {
    const { data } = await createClient().from("treatment_presets").select("*").eq("clinic_id", clinicId).order("created_at");
    setTreatments(data || []);
  };

  const fetchPrescriptions = async () => {
    const { data } = await createClient().from("prescription_presets").select("*").eq("clinic_id", clinicId).order("created_at");
    setPrescriptions(data || []);
  };

  // General save
  const handleSave = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: existing } = await supabase.from("settings").select("id").single();
    if (existing) {
      await supabase.from("settings").update({ clinic_name: form.clinic_name, clinic_address: form.clinic_address, clinic_phone: form.clinic_phone, clinic_email: form.clinic_email, currency: form.currency }).eq("id", existing.id);
    } else {
      await supabase.from("settings").insert([{ ...form, clinic_id: clinicId }]);
    }
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Treatment preset actions
  const addTreatment = async () => {
    if (!tForm.name.trim()) return;
    setTLoading(true);
    await createClient().from("treatment_presets").insert([{ clinic_id: clinicId, name: tForm.name.trim(), price: Number(tForm.price) || 0 }]);
    setTForm({ name: "", price: "" });
    await fetchTreatments();
    setTLoading(false);
  };

  const saveTreatmentEdit = async (id: string) => {
    await createClient().from("treatment_presets").update({ name: tEditForm.name.trim(), price: Number(tEditForm.price) || 0 }).eq("id", id);
    setTEditId(null);
    fetchTreatments();
  };

  const deleteTreatment = async (id: string) => {
    if (!confirm("Delete this treatment preset?")) return;
    await createClient().from("treatment_presets").delete().eq("id", id);
    fetchTreatments();
  };

  // Prescription preset actions
  const addPrescription = async () => {
    if (!pForm.medicine.trim()) return;
    setPLoading(true);
    await createClient().from("prescription_presets").insert([{ clinic_id: clinicId, group_name: pForm.group_name.trim(), medicine: pForm.medicine.trim(), dosage: pForm.dosage, frequency: pForm.frequency, duration: pForm.duration, notes: pForm.notes }]);
    setPForm(f => ({ ...f, medicine: "", dosage: "", frequency: "", duration: "", notes: "" }));
    await fetchPrescriptions();
    setPLoading(false);
  };

  const savePrescriptionEdit = async (id: string) => {
    await createClient().from("prescription_presets").update({ group_name: pEditForm.group_name.trim(), medicine: pEditForm.medicine.trim(), dosage: pEditForm.dosage, frequency: pEditForm.frequency, duration: pEditForm.duration, notes: pEditForm.notes }).eq("id", id);
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
    await createClient().from("prescription_presets").delete().eq("id", id);
    fetchPrescriptions();
  };

  const selectedCurrency = currencies.find(c => c.code === form.currency);
  const autoCurrencyName = currencies.find(c => c.code === autoDetected)?.name;

  const TABS = [
    { key: "general", label: "General" },
    { key: "treatments", label: "Treatment Presets" },
    { key: "prescriptions", label: "Prescription Presets" },
  ] as const;

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Manage clinic settings and presets</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 shadow-sm rounded-xl p-1 mb-6 w-fit overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── GENERAL TAB ── */}
        {tab === "general" && (
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm w-full md:max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-800 mb-5">Clinic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clinic Name</label>
                <input placeholder="e.g. Dr. Ahmed Dental Care" value={form.clinic_name} onChange={e => setForm({ ...form, clinic_name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clinic Address</label>
                <input placeholder="e.g. Shop 5, Main Market, Lahore" value={form.clinic_address} onChange={e => setForm({ ...form, clinic_address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input placeholder="e.g. 0300-1234567" value={form.clinic_phone} onChange={e => setForm({ ...form, clinic_phone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                <input placeholder="e.g. clinic@email.com" value={form.clinic_email} onChange={e => setForm({ ...form, clinic_email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                {autoDetected && (
                  <div className="mb-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center justify-between">
                    <p className="text-xs text-blue-600">🌍 Auto-detected: <span className="font-medium">{autoCurrencyName} ({autoDetected})</span></p>
                    <button onClick={() => setForm({ ...form, currency: autoDetected })} className="text-xs text-blue-600 font-medium hover:underline">Use This</button>
                  </div>
                )}
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>)}
                </select>
                {selectedCurrency && (
                  <div className="mt-2 bg-teal-50 rounded-xl px-4 py-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-teal-700">{selectedCurrency.symbol}</span>
                    <span className="text-sm text-teal-600">{selectedCurrency.name} — {selectedCurrency.code}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button onClick={handleSave} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {loading ? "Saving..." : "Save Settings"}
              </button>
              {saved && <span className="text-green-600 text-sm font-medium">✅ Saved!</span>}
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Add Treatment</h3>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Treatment Name *</label>
                  <input
                    placeholder="e.g. Root Canal Treatment"
                    value={tForm.name}
                    onChange={e => setTForm({ ...tForm, name: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && addTreatment()}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div className="w-36">
                  <label className="text-xs text-gray-500 mb-1 block">Price ({symbol})</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={tForm.price}
                    onChange={e => setTForm({ ...tForm, price: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && addTreatment()}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <button onClick={addTreatment} disabled={tLoading || !tForm.name.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                  {tLoading ? "..." : "+ Add"}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Your Treatment Presets</h3>
                <span className="text-xs text-gray-400">{treatments.length} treatments</span>
              </div>
              {treatments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No treatments added yet. Add your first one above.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {treatments.map(t => (
                    <div key={t.id} className="px-5 py-3">
                      {tEditId === t.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            value={tEditForm.name}
                            onChange={e => setTEditForm({ ...tEditForm, name: e.target.value })}
                            className="flex-1 border border-teal-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          />
                          <input
                            type="number" min="0"
                            value={tEditForm.price}
                            onChange={e => setTEditForm({ ...tEditForm, price: e.target.value })}
                            className="w-28 border border-teal-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          />
                          <button onClick={() => saveTreatmentEdit(t.id)} className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg font-medium">Save</button>
                          <button onClick={() => setTEditId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-800">{t.name}</span>
                            <span className="ml-3 text-xs text-teal-600 font-semibold">{symbol} {t.price.toLocaleString()}</span>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => { setTEditId(t.id); setTEditForm({ name: t.name, price: String(t.price) }); }}
                              className="text-xs text-teal-600 font-medium hover:underline">Edit</button>
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Add Medicine to Prescription Group</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Treatment / Group Name *</label>
                  <input
                    list="group-list"
                    placeholder="e.g. Root Canal Treatment, Extraction, Filling..."
                    value={pForm.group_name}
                    onChange={e => setPForm({ ...pForm, group_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <datalist id="group-list">
                    {existingGroups.map(g => <option key={g} value={g} />)}
                  </datalist>
                  <p className="text-xs text-gray-400 mt-1">Type an existing group to add to it, or a new name to create a new group.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Medicine Name *</label>
                  <input placeholder="e.g. Augmentin 625mg" value={pForm.medicine} onChange={e => setPForm({ ...pForm, medicine: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dosage</label>
                  <input placeholder="e.g. 1 tab, 500mg" value={pForm.dosage} onChange={e => setPForm({ ...pForm, dosage: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Frequency</label>
                  <input placeholder="e.g. 2x daily" value={pForm.frequency} onChange={e => setPForm({ ...pForm, frequency: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duration</label>
                  <input placeholder="e.g. 5 days" value={pForm.duration} onChange={e => setPForm({ ...pForm, duration: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Instructions</label>
                  <input placeholder="e.g. After meals" value={pForm.notes} onChange={e => setPForm({ ...pForm, notes: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
              </div>
              <button onClick={addPrescription} disabled={pLoading || !pForm.medicine.trim() || !pForm.group_name.trim()}
                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                {pLoading ? "Adding..." : "+ Add Medicine"}
              </button>
            </div>

            {/* Grouped List */}
            {prescriptions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-sm text-gray-400">
                No prescription presets yet. Add your first medicine above.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([groupName, meds]) => (
                  <div key={groupName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Group header */}
                    <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-teal-800">{groupName}</span>
                        <span className="text-xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-medium">{meds.length} medicine{meds.length !== 1 ? "s" : ""}</span>
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
                                  className="col-span-2 border border-teal-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                />
                                <datalist id="group-list-edit">
                                  {existingGroups.map(g => <option key={g} value={g} />)}
                                </datalist>
                                <input value={pEditForm.medicine} onChange={e => setPEditForm({ ...pEditForm, medicine: e.target.value })} placeholder="Medicine" className="col-span-2 border border-teal-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                <input value={pEditForm.dosage} onChange={e => setPEditForm({ ...pEditForm, dosage: e.target.value })} placeholder="Dosage" className="border border-teal-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                <input value={pEditForm.frequency} onChange={e => setPEditForm({ ...pEditForm, frequency: e.target.value })} placeholder="Frequency" className="border border-teal-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                <input value={pEditForm.duration} onChange={e => setPEditForm({ ...pEditForm, duration: e.target.value })} placeholder="Duration" className="border border-teal-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                <input value={pEditForm.notes} onChange={e => setPEditForm({ ...pEditForm, notes: e.target.value })} placeholder="Instructions" className="border border-teal-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => savePrescriptionEdit(rx.id)} className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg font-medium">Save</button>
                                <button onClick={() => setPEditId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="text-sm font-semibold text-gray-800">{rx.medicine}</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {rx.dosage && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{rx.dosage}</span>}
                                  {rx.frequency && <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">{rx.frequency}</span>}
                                  {rx.duration && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{rx.duration}</span>}
                                  {rx.notes && <span className="text-xs text-gray-400 italic">{rx.notes}</span>}
                                </div>
                              </div>
                              <div className="flex gap-3 shrink-0">
                                <button onClick={() => { setPEditId(rx.id); setPEditForm({ group_name: rx.group_name, medicine: rx.medicine, dosage: rx.dosage, frequency: rx.frequency, duration: rx.duration, notes: rx.notes }); }}
                                  className="text-xs text-teal-600 font-medium hover:underline">Edit</button>
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
