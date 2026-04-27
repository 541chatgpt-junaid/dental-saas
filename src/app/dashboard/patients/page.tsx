"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Receipt from "@/components/Receipt";

interface Patient {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  address: string;
  age: number;
  gender: string;
  treatment: string;
  tooth_number: string;
  doctor_name: string;
  fee_total: number;
  fee_paid: number;
  status: string;
}

interface Visit {
  id: number;
  created_at: string;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  treatment: string;
  tooth_number: string;
  notes: string;
  fee: number;
  fee_paid: number;
}

interface Doctor {
  id: number;
  name: string;
}

const upperRight = [18,17,16,15,14,13,12,11];
const upperLeft = [21,22,23,24,25,26,27,28];
const lowerRight = [48,47,46,45,44,43,42,41];
const lowerLeft = [31,32,33,34,35,36,37,38];

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitTeeth, setVisitTeeth] = useState<number[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptPatient, setReceiptPatient] = useState<Patient | null>(null);
  const [visitForm, setVisitForm] = useState({
    doctor_name: "", treatment: "", notes: "", fee: "", fee_paid: "",
  });
  const [form, setForm] = useState({
    name: "", phone: "", address: "", age: "",
    gender: "Male", treatment: "", doctor_name: "",
    fee_total: "", fee_paid: "",
  });
  const router = useRouter();

  const fetchPatients = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    if (data) setPatients(data);
  };

  const fetchDoctors = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("doctors").select("id, name").eq("status", "Active");
    if (data) setDoctors(data);
  };

  const fetchVisits = async (patientId: number) => {
    const supabase = createClient();
    const { data } = await supabase.from("visits").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
    if (data) setVisits(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchPatients();
    fetchDoctors();
  }, [router]);

  const toggleTooth = (num: number) => {
    setSelectedTeeth(prev =>
      prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]
    );
  };

  const toggleVisitTooth = (num: number) => {
    setVisitTeeth(prev =>
      prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]
    );
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const fee_total = parseInt(form.fee_total) || 0;
    const fee_paid = parseInt(form.fee_paid) || 0;
    const status = fee_paid >= fee_total ? "Paid" : "Pending";
    await supabase.from("patients").insert([{
      name: form.name, phone: form.phone, address: form.address,
      age: parseInt(form.age) || 0, gender: form.gender,
      treatment: form.treatment, tooth_number: selectedTeeth.join(", "),
      doctor_name: form.doctor_name, fee_total, fee_paid, status,
    }]);
    setForm({ name: "", phone: "", address: "", age: "", gender: "Male", treatment: "", doctor_name: "", fee_total: "", fee_paid: "" });
    setSelectedTeeth([]);
    setShowForm(false);
    setLoading(false);
    fetchPatients();
  };

  const handleAddVisit = async () => {
    if (!selectedPatient) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("visits").insert([{
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      doctor_name: visitForm.doctor_name,
      treatment: visitForm.treatment,
      tooth_number: visitTeeth.join(", "),
      notes: visitForm.notes,
      fee: parseInt(visitForm.fee) || 0,
      fee_paid: parseInt(visitForm.fee_paid) || 0,
    }]);
    setVisitForm({ doctor_name: "", treatment: "", notes: "", fee: "", fee_paid: "" });
    setVisitTeeth([]);
    setShowVisitForm(false);
    setLoading(false);
    fetchVisits(selectedPatient.id);
  };

  const handlePayment = async (patient: Patient, extraPayment: number) => {
    const supabase = createClient();
    const newPaid = patient.fee_paid + extraPayment;
    const newStatus = newPaid >= patient.fee_total ? "Paid" : "Pending";
    await supabase.from("patients").update({ fee_paid: newPaid, status: newStatus }).eq("id", patient.id);
    fetchPatients();
  };

  const openPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    fetchVisits(patient.id);
  };

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.id?.toString().includes(search)
  );

  const ToothBtn = ({ num, selected, onToggle }: { num: number; selected: number[]; onToggle: (n: number) => void }) => (
    <button type="button" onClick={() => onToggle(num)}
      className={`w-8 h-8 text-xs rounded border font-medium transition-colors ${
        selected.includes(num) ? "bg-teal-600 text-white border-teal-600" : "bg-white text-teal-700 border-teal-200 hover:bg-teal-50"
      }`}>
      {num}
    </button>
  );

  const ToothChart = ({ selected, onToggle }: { selected: number[]; onToggle: (n: number) => void }) => (
    <div className="p-4 border border-teal-100 rounded-xl bg-teal-50">
      <p className="text-xs font-semibold text-teal-700 mb-3">Select Tooth (FDI Numbering)</p>
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-1 items-center">
          <span className="text-xs text-teal-400 w-16 text-right">Upper R</span>
          <div className="flex gap-1">{upperRight.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <div className="w-px h-8 bg-teal-300 mx-1"></div>
          <div className="flex gap-1">{upperLeft.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <span className="text-xs text-teal-400 w-16">Upper L</span>
        </div>
        <div className="w-full border-t border-teal-200 my-1"></div>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-teal-400 w-16 text-right">Lower R</span>
          <div className="flex gap-1">{lowerRight.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <div className="w-px h-8 bg-teal-300 mx-1"></div>
          <div className="flex gap-1">{lowerLeft.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <span className="text-xs text-teal-400 w-16">Lower L</span>
        </div>
      </div>
      {selected.length > 0 && <p className="text-xs text-teal-600 mt-2 text-center">Selected: {selected.join(", ")}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-8">

        {/* Receipt Modal */}
        {showReceipt && receiptPatient && (
          <Receipt patient={receiptPatient} onClose={() => setShowReceipt(false)} />
        )}

        {selectedPatient ? (
          <div>
            <button onClick={() => setSelectedPatient(null)} className="text-teal-600 text-sm mb-4 hover:underline">← Back to Patients</button>
            <div className="bg-white rounded-xl p-6 border border-teal-100 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-teal-800">{selectedPatient.name}</h2>
                  <p className="text-sm text-teal-500">{selectedPatient.phone} · {selectedPatient.gender} · {selectedPatient.age} years · {selectedPatient.address}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setReceiptPatient(selectedPatient); setShowReceipt(true); }}
                    className="border border-teal-300 text-teal-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-50"
                  >
                    🖨️ Receipt
                  </button>
                  <button onClick={() => setShowVisitForm(!showVisitForm)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    + Add Visit
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-teal-50 rounded-lg p-3">
                  <p className="text-xs text-teal-600">Total Fee</p>
                  <p className="text-lg font-semibold text-teal-800">Rs {selectedPatient.fee_total}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3">
                  <p className="text-xs text-teal-600">Fee Paid</p>
                  <p className="text-lg font-semibold text-teal-800">Rs {selectedPatient.fee_paid}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3">
                  <p className="text-xs text-teal-600">Remaining</p>
                  <p className="text-lg font-semibold text-orange-600">Rs {selectedPatient.fee_total - selectedPatient.fee_paid}</p>
                </div>
              </div>
            </div>

            {showVisitForm && (
              <div className="bg-white rounded-xl p-6 border border-teal-100 mb-6">
                <h3 className="text-sm font-semibold text-teal-800 mb-4">New Visit for {selectedPatient.name}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select value={visitForm.doctor_name} onChange={e => setVisitForm({...visitForm, doctor_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  <input placeholder="Treatment" value={visitForm.treatment} onChange={e => setVisitForm({...visitForm, treatment: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Fee (Rs)" type="number" value={visitForm.fee} onChange={e => setVisitForm({...visitForm, fee: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Fee Paid (Rs)" type="number" value={visitForm.fee_paid} onChange={e => setVisitForm({...visitForm, fee_paid: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Notes / Prescription" value={visitForm.notes} onChange={e => setVisitForm({...visitForm, notes: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 col-span-2" />
                </div>
                <ToothChart selected={visitTeeth} onToggle={toggleVisitTooth} />
                <div className="flex gap-3 mt-4">
                  <button onClick={handleAddVisit} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                    {loading ? "Saving..." : "Save Visit"}
                  </button>
                  <button onClick={() => setShowVisitForm(false)} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-teal-50">
                <h3 className="text-sm font-semibold text-teal-800">Visit History</h3>
              </div>
              {visits.length === 0 ? (
                <p className="text-center py-8 text-teal-400 text-sm">No visits recorded yet</p>
              ) : (
                visits.map((v, i) => (
                  <div key={v.id} className="px-5 py-4 border-b border-teal-50 hover:bg-teal-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-teal-800">Visit {visits.length - i} — {v.treatment}</p>
                        <p className="text-xs text-teal-500 mt-0.5">{v.doctor_name} · Tooth: {v.tooth_number || "-"}</p>
                        {v.notes && <p className="text-xs text-teal-400 mt-1">📝 {v.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-teal-800">Rs {v.fee}</p>
                        <p className="text-xs text-teal-400">Paid: Rs {v.fee_paid}</p>
                        <p className="text-xs text-orange-500">Remaining: Rs {v.fee - v.fee_paid}</p>
                        <p className="text-xs text-teal-300 mt-1">{new Date(v.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-teal-800">Patients</h2>
                <p className="text-sm text-teal-600 mt-1">Total: {patients.length} patients</p>
              </div>
              <button onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                + Add Patient
              </button>
            </div>

            <div className="mb-5">
              <input placeholder="Search by patient name or ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-teal-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>

            {showForm && (
              <div className="bg-white rounded-xl p-6 border border-teal-100 mb-6">
                <h3 className="text-sm font-semibold text-teal-800 mb-4">New Patient</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Age" type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                  <select value={form.doctor_name} onChange={e => setForm({...form, doctor_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  <input placeholder="Treatment (e.g. Filling, RCT)" value={form.treatment} onChange={e => setForm({...form, treatment: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 col-span-2" />
                </div>
                <ToothChart selected={selectedTeeth} onToggle={toggleTooth} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <input placeholder="Total Fee (Rs)" type="number" value={form.fee_total} onChange={e => setForm({...form, fee_total: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Fee Paid (Rs)" type="number" value={form.fee_paid} onChange={e => setForm({...form, fee_paid: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                    {loading ? "Saving..." : "Save Patient"}
                  </button>
                  <button onClick={() => setShowForm(false)} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-teal-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">ID</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Doctor</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Treatment</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Tooth</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Total Fee</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Paid</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Remaining</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-teal-700 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-10 text-teal-400">No patients found</td></tr>
                  ) : (
                    filteredPatients.map(p => (
                      <tr key={p.id} className="border-t border-teal-50 hover:bg-teal-50 cursor-pointer" onClick={() => openPatient(p)}>
                        <td className="px-4 py-3 text-teal-400 text-xs">#{p.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-teal-800">{p.name}</p>
                          <p className="text-xs text-teal-400">{p.phone} · {p.gender} · {p.age}y</p>
                        </td>
                        <td className="px-4 py-3 text-teal-700">{p.doctor_name || "-"}</td>
                        <td className="px-4 py-3 text-teal-700">{p.treatment}</td>
                        <td className="px-4 py-3 text-teal-700 text-xs">{p.tooth_number || "-"}</td>
                        <td className="px-4 py-3 text-teal-700">Rs {p.fee_total}</td>
                        <td className="px-4 py-3 text-teal-700">Rs {p.fee_paid}</td>
                        <td className="px-4 py-3 text-teal-700">Rs {p.fee_total - p.fee_paid}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setReceiptPatient(p); setShowReceipt(true); }}
                              className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                            >
                              🖨️
                            </button>
                            {p.status !== "Paid" && (
                              <button onClick={() => {
                                const amount = prompt(`Enter payment for ${p.name}:`);
                                if (amount) handlePayment(p, parseInt(amount));
                              }} className="text-teal-600 hover:text-teal-800 text-xs font-medium">
                                Add Payment
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}