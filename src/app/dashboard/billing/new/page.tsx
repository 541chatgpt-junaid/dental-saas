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

const QUICK_TREATMENTS = [
  "Dental Consultation", "Teeth Cleaning", "Tooth Extraction", "Root Canal Treatment",
  "Dental Filling", "Crown", "Bridge", "Veneer", "Teeth Whitening", "Dental X-Ray",
  "Denture", "Implant", "Orthodontic Consultation", "Scaling & Polishing",
];

export default function NewInvoicePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientBilling, setPatientBilling] = useState<PatientBilling | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patientId, setPatientId] = useState("");
  const [visitId, setVisitId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

  useEffect(() => {
    if (!clinicId) return;
    createClient().from("patients").select("id, name, phone, age, gender").order("name")
      .then(({ data }) => setPatients(data || []));
  }, [clinicId]);

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

  const quickAdd = (treatment: string) => {
    if (items.find(i => i.description === treatment)) return;
    const empties = items.filter(i => !i.description.trim());
    if (empties.length > 0) {
      setItems(items.map((item, i) =>
        i === items.indexOf(empties[0]) ? { ...item, description: treatment } : item
      ));
    } else {
      setItems([...items, { description: treatment, quantity: 1, unit_price: 0 }]);
    }
  };

  const handleSave = async () => {
    if (!patientId) { setError("Please select a patient."); return; }
    const validItems = items.filter(i => i.description.trim());
    if (!validItems.length) { setError("Add at least one item with a description."); return; }

    setLoading(true);
    setError("");
    const supabase = createClient();

    const { data: invNum } = await supabase.rpc("generate_invoice_number", { p_clinic_id: clinicId });

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert([{
        clinic_id: clinicId,
        patient_id: Number(patientId),
        visit_id: visitId ? Number(visitId) : null,
        invoice_number: invNum,
        status: "unpaid",
        subtotal,
        discount,
        total,
        amount_paid: 0,
        notes: notes || null,
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
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard/billing")} className="text-teal-500 hover:text-teal-700 text-sm">← Back</button>
          <h2 className="text-xl font-semibold text-teal-800">New Invoice</h2>
        </div>

        <div className="max-w-3xl space-y-5">
          {/* Patient & Visit */}
          <div className="bg-white rounded-xl border border-teal-100 p-5">
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
          <div className="bg-white rounded-xl border border-teal-100 p-5">
            <h3 className="text-sm font-semibold text-teal-800 mb-3">Quick Add Treatment</h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_TREATMENTS.map(t => (
                <button
                  key={t}
                  onClick={() => quickAdd(t)}
                  className="px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 text-xs hover:bg-teal-50 transition-colors"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-teal-100 p-5">
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
          <div className="bg-white rounded-xl border border-teal-100 p-5">
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

          {/* Notes */}
          <div className="bg-white rounded-xl border border-teal-100 p-5">
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

          <div className="flex gap-3 pb-8">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Invoice"}
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
