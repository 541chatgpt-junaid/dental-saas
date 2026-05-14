"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";

interface Patient { id: number; name: string; phone: string; age: number | null; gender: string; }
interface Visit { id: number; visit_date: string; treatment: string; }
interface LineItem { description: string; quantity: number; unit_price: number; }
interface PatientBilling { totalBilled: number; totalPaid: number; outstanding: number; }
interface Installment { label: string; amount: number; due_date: string; }
interface TreatmentPreset { id: string; name: string; price: number; }

export default function NewInvoicePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientBilling, setPatientBilling] = useState<PatientBilling | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patientId, setPatientId] = useState("");
  const [visitId, setVisitId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [treatmentPresets, setTreatmentPresets] = useState<TreatmentPreset[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [useInstallments, setUseInstallments] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([
    { label: "Installment 1", amount: 0, due_date: "" },
    { label: "Installment 2", amount: 0, due_date: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

  useEffect(() => {
    createClient().from("patients").select("id, name, phone, age, gender").order("name")
      .then(({ data }) => setPatients(data || []));
    fetch("/api/presets?type=treatments")
      .then(r => r.json())
      .then(json => setTreatmentPresets(json.data || []));
  }, []);

  const handlePatientChange = (val: string) => {
    setPatientId(val);
    setSelectedPatient(patients.find(p => p.id === Number(val)) || null);
    setPatientBilling(null);
    setVisitId("");
    setVisits([]);
  };

  useEffect(() => {
    if (!patientId) return;
    createClient()
      .from("visits")
      .select("id, visit_date, treatment")
      .eq("patient_id", Number(patientId))
      .order("visit_date", { ascending: false })
      .then(({ data }) => setVisits(data || []));
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    createClient()
      .from("invoices")
      .select("total, amount_paid, balance")
      .eq("patient_id", Number(patientId))
      .neq("status", "cancelled")
      .then(({ data }) => {
        const rows = data || [];
        setPatientBilling({
          totalBilled: rows.reduce((s, r) => s + (r.total || 0), 0),
          totalPaid: rows.reduce((s, r) => s + (r.amount_paid || 0), 0),
          outstanding: rows.reduce((s, r) => s + (r.balance || 0), 0),
        });
      });
  }, [patientId]);

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - discount);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, val: string | number) =>
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const quickAdd = (preset: TreatmentPreset) => {
    if (items.find(i => i.description === preset.name)) return;
    const empties = items.filter(i => !i.description.trim());
    if (empties.length > 0) {
      setItems(items.map((item, i) =>
        i === items.indexOf(empties[0]) ? { ...item, description: preset.name, unit_price: preset.price } : item
      ));
    } else {
      setItems([...items, { description: preset.name, quantity: 1, unit_price: preset.price }]);
    }
  };

  const handleSave = async (asDraft = false) => {
    if (!patientId) { setError("Please select a patient."); return; }
    const validItems = items.filter(i => i.description.trim());
    if (!validItems.length) { setError("Add at least one item with a description."); return; }

    setLoading(true);
    setError("");
    const supabase = createClient();

    const { data: invNum } = await supabase.rpc("generate_invoice_number", { p_clinic_id: clinicId });

    const installmentNote = useInstallments && installments.some(inst => inst.amount > 0)
      ? "\n\n[INSTALLMENT PLAN]\n" + installments
          .filter(inst => inst.amount > 0)
          .map(inst => `${inst.label}: ${symbol} ${inst.amount.toLocaleString()}${inst.due_date ? ` (due ${inst.due_date})` : ""}`)
          .join("\n")
      : "";

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert([{
        clinic_id: clinicId,
        patient_id: Number(patientId),
        visit_id: visitId ? Number(visitId) : null,
        invoice_number: invNum,
        status: asDraft ? "draft" : "unpaid",
        subtotal,
        discount,
        total,
        amount_paid: 0,
        notes: (notes + installmentNote) || null,
        due_date: dueDate || null,
      }])
      .select()
      .single();

    if (invErr || !invoice) {
      setError(invErr?.message || "Failed to create invoice.");
      setLoading(false);
      return;
    }

    const { error: itemsErr } = await supabase.from("invoice_items").insert(
      validItems.map(i => ({
        invoice_id: invoice.id,
        clinic_id: clinicId,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
    );

    if (itemsErr) { setError(itemsErr.message); setLoading(false); return; }

    router.push(`/dashboard/billing/${invoice.id}`);
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard/billing")} className="text-teal-500 hover:text-teal-700 text-sm">← Back</button>
          <h2 className="text-xl font-semibold text-gray-800">New Invoice</h2>
        </div>

        <div className="max-w-3xl space-y-5">
          {/* Patient & Visit */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">Patient Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-teal-600 mb-1 block">Patient *</label>
                <select
                  value={patientId}
                  onChange={e => handlePatientChange(e.target.value)}
                  className="w-full border border-teal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Patient info + billing summary — full width */}
              {selectedPatient && patientBilling && (
                <div className="md:col-span-2 rounded-xl border border-teal-200 bg-teal-50 overflow-hidden">
                  <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-teal-200">
                    <span className="font-semibold text-teal-800 text-sm">{selectedPatient.name}</span>
                    {selectedPatient.phone && (
                      <span className="text-teal-600 text-sm">{selectedPatient.phone}</span>
                    )}
                    {(selectedPatient.age || selectedPatient.gender) && (
                      <span className="text-teal-500 text-xs">
                        {[selectedPatient.age ? `${selectedPatient.age} yrs` : null, selectedPatient.gender || null]
                          .filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-teal-500 mb-0.5">Total Billed</p>
                      <p className="text-sm font-semibold text-teal-800">{symbol} {patientBilling.totalBilled.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-500 mb-0.5">Total Paid</p>
                      <p className="text-sm font-semibold text-green-700">{symbol} {patientBilling.totalPaid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-500 mb-0.5">Outstanding</p>
                      <p className={`text-sm font-semibold ${patientBilling.outstanding > 0 ? "text-orange-600" : "text-teal-700"}`}>
                        {symbol} {patientBilling.outstanding.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {patientBilling.totalBilled > 0 && (
                    <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700">
                      ℹ This patient already has a registration receipt. Only create a new invoice here for additional treatments, lab charges, or installment plans.
                    </div>
                  )}
                  {patientBilling.outstanding > 0 && (
                    <div className="px-4 py-2 bg-orange-50 border-t border-orange-100 text-xs text-orange-700">
                      ⚠ Patient has an existing outstanding balance of {symbol} {patientBilling.outstanding.toLocaleString()}. This new invoice will be created separately.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-teal-600 mb-1 block">Link to Visit (optional)</label>
                <select
                  value={visitId}
                  onChange={e => setVisitId(e.target.value)}
                  disabled={!patientId}
                  className="w-full border border-teal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50"
                >
                  <option value="">No visit</option>
                  {visits.map(v => (
                    <option key={v.id} value={v.id}>{v.visit_date} — {v.treatment}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-teal-600 mb-1 block">Due Date (optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-teal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Quick Add */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Quick Add Treatment</h3>
              <a href="/dashboard/settings" className="text-xs text-teal-500 hover:underline">⚙ Manage Presets</a>
            </div>
            {treatmentPresets.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-400">
                No treatment presets configured.{" "}
                <a href="/dashboard/settings" className="text-teal-500 underline">Add in Settings → Treatment Presets</a>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {treatmentPresets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => quickAdd(t)}
                    className="flex flex-col items-start px-3 py-2 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-400 transition-colors"
                  >
                    <span className="text-xs font-medium">+ {t.name}</span>
                    {t.price > 0 && (
                      <span className="text-xs text-teal-400 mt-0.5">{symbol} {t.price.toLocaleString()}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-teal-800 mb-4">Invoice Items</h3>
            <div className="hidden md:grid grid-cols-12 gap-2 mb-2 text-xs text-teal-500 font-medium px-1">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-3">Unit Price</span>
              <span className="col-span-1"></span>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={e => updateItem(idx, "description", e.target.value)}
                    className="col-span-6 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <input
                    type="number" placeholder="1" min="1"
                    value={item.quantity}
                    onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                    className="col-span-2 border border-teal-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 text-center"
                  />
                  <input
                    type="number" placeholder="0" min="0"
                    value={item.unit_price}
                    onChange={e => updateItem(idx, "unit_price", Number(e.target.value))}
                    className="col-span-3 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button
                    onClick={() => removeItem(idx)}
                    className="col-span-1 text-red-400 hover:text-red-600 text-xl font-bold flex items-center justify-center h-9"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-3 text-teal-600 text-sm hover:underline">+ Add Item</button>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="max-w-xs ml-auto space-y-2.5">
              <div className="flex justify-between text-sm text-teal-700">
                <span>Subtotal</span>
                <span>{symbol} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-teal-700">
                <span>Discount</span>
                <input
                  type="number" min="0"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-32 border border-teal-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div className="flex justify-between text-base font-semibold text-teal-800 pt-2 border-t border-teal-100">
                <span>Total</span>
                <span>{symbol} {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Installment Plan */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Installment Plan</h3>
                <p className="text-xs text-gray-400 mt-0.5">Split payment into scheduled installments</p>
              </div>
              <button
                type="button"
                onClick={() => setUseInstallments(!useInstallments)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useInstallments ? "bg-teal-600" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${useInstallments ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {useInstallments && (
              <div className="space-y-3 mt-3">
                {installments.map((inst, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      placeholder={`Installment ${idx + 1}`}
                      value={inst.label}
                      onChange={e => setInstallments(installments.map((it, i) => i === idx ? { ...it, label: e.target.value } : it))}
                      className="col-span-4 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <input
                      type="number" placeholder="Amount" min="0"
                      value={inst.amount || ""}
                      onChange={e => setInstallments(installments.map((it, i) => i === idx ? { ...it, amount: Number(e.target.value) } : it))}
                      className="col-span-4 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <input
                      type="date"
                      value={inst.due_date}
                      onChange={e => setInstallments(installments.map((it, i) => i === idx ? { ...it, due_date: e.target.value } : it))}
                      className="col-span-3 border border-teal-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button
                      onClick={() => setInstallments(installments.filter((_, i) => i !== idx))}
                      className="col-span-1 text-red-400 hover:text-red-600 text-xl font-bold flex items-center justify-center h-9"
                    >×</button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setInstallments([...installments, { label: `Installment ${installments.length + 1}`, amount: 0, due_date: "" }])}
                    className="text-teal-600 text-sm hover:underline"
                  >+ Add Installment</button>
                  {installments.some(i => i.amount > 0) && (
                    <span className={`text-xs font-medium ${installments.reduce((s, i) => s + i.amount, 0) === total ? "text-green-600" : "text-orange-500"}`}>
                      Scheduled: {symbol} {installments.reduce((s, i) => s + i.amount, 0).toLocaleString()} / {symbol} {total.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <label className="text-xs text-teal-600 mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full border border-teal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pb-8 flex-wrap">
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Invoice"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={loading}
              className="border border-purple-200 text-purple-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50 disabled:opacity-60"
            >
              Save as Draft
            </button>
            <button
              onClick={() => router.push("/dashboard/billing")}
              className="border border-teal-200 text-teal-700 px-6 py-2.5 rounded-xl text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
