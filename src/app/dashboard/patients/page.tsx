"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Receipt from "@/components/Receipt";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";

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
  user_id: string;
}

interface Visit {
  id: number;
  created_at: string;
  visit_date: string;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  treatment: string;
  tooth_number: string;
  notes: string;
  fee: number;
  fee_paid: number;
  status: string;
}

interface Appointment {
  id: number;
  created_at: string;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  time: string;
  treatment: string;
  notes: string;
  status: string;
}

interface MedicalHistory {
  id: number;
  patient_id: number;
  allergies: string;
  blood_group: string;
  medical_conditions: string;
  current_medications: string;
  previous_surgeries: string;
  notes: string;
}

interface Doctor {
  id: number;
  name: string;
}

type InvoiceSummary = { totalBilled: number; totalPaid: number; outstanding: number };

const upperRight = [18,17,16,15,14,13,12,11];
const upperLeft = [21,22,23,24,25,26,27,28];
const lowerRight = [48,47,46,45,44,43,42,41];
const lowerLeft = [31,32,33,34,35,36,37,38];

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dateStr; }
};

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [invoiceSummaryMap, setInvoiceSummaryMap] = useState<Record<number, InvoiceSummary>>({});
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [visitTeeth, setVisitTeeth] = useState<number[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptPatient, setReceiptPatient] = useState<Patient | null>(null);
  const [payingPatient, setPayingPatient] = useState<Patient | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "Cash", notes: "" });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [activeTab, setActiveTab] = useState<"visits"|"appointments"|"medical">("visits");
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [medicalForm, setMedicalForm] = useState({
    allergies: "", blood_group: "", medical_conditions: "",
    current_medications: "", previous_surgeries: "", notes: "",
  });
  const [appointmentForm, setAppointmentForm] = useState({
    date: "", time: "", treatment: "", notes: "",
  });
  const [visitForm, setVisitForm] = useState({
    doctor_name: "", treatment: "", notes: "", fee: "", fee_paid: "",
    visit_date: new Date().toISOString().split("T")[0], status: "Pending",
  });
  const [form, setForm] = useState({
    name: "", phone: "", address: "", age: "",
    gender: "Male", treatment: "", doctor_name: "",
    fee_total: "", fee_paid: "",
  });
  const [prescriptionPresets, setPrescriptionPresets] = useState<{ id: string; group_name: string; medicine: string; dosage: string; frequency: string; duration: string; notes: string }[]>([]);
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

  const fetchPatients = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: true });
    if (data) {
      setAllPatients(data);
      setPatients([...data].reverse());
    }
  };

  const fetchDoctors = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("doctors").select("id, name").eq("status", "Active");
    if (data) setDoctors(data);
  };

  const fetchVisits = async (patientId: number) => {
    const supabase = createClient();
    const { data } = await supabase.from("visits").select("*").eq("patient_id", patientId).order("visit_date", { ascending: false });
    if (data) setVisits(data);
  };

  const fetchAppointments = async (patientId: number) => {
    const supabase = createClient();
    const { data } = await supabase.from("appointments").select("*").eq("patient_id", patientId).order("date", { ascending: true });
    if (data) setAppointments(data);
  };

  const fetchMedicalHistory = async (patientId: number) => {
    const supabase = createClient();
    const { data } = await supabase.from("medical_history").select("*").eq("patient_id", patientId).single();
    if (data) {
      setMedicalHistory(data);
      setMedicalForm({
        allergies: data.allergies || "",
        blood_group: data.blood_group || "",
        medical_conditions: data.medical_conditions || "",
        current_medications: data.current_medications || "",
        previous_surgeries: data.previous_surgeries || "",
        notes: data.notes || "",
      });
    } else {
      setMedicalHistory(null);
      setMedicalForm({ allergies: "", blood_group: "", medical_conditions: "", current_medications: "", previous_surgeries: "", notes: "" });
    }
  };

  const fetchInvoiceSummaries = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("invoices")
      .select("patient_id, total, amount_paid, balance")
      .neq("status", "cancelled");
    if (!data) return;
    const map: Record<number, InvoiceSummary> = {};
    data.forEach(r => {
      const pid = r.patient_id as number;
      if (!map[pid]) map[pid] = { totalBilled: 0, totalPaid: 0, outstanding: 0 };
      map[pid].totalBilled += r.total || 0;
      map[pid].totalPaid += r.amount_paid || 0;
      map[pid].outstanding += r.balance || 0;
    });
    setInvoiceSummaryMap(map);
  };

  const invSummary = (patientId: number): InvoiceSummary =>
    invoiceSummaryMap[patientId] ?? { totalBilled: 0, totalPaid: 0, outstanding: 0 };

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
    fetchPatients();
    fetchDoctors();
    fetchInvoiceSummaries();
  }, [router]);

  useEffect(() => {
    if (!clinicId) return;
    createClient().from("prescription_presets").select("*").eq("clinic_id", clinicId).order("created_at")
      .then(({ data }) => setPrescriptionPresets(data || []));
  }, [clinicId]);

  const getClinicPatientNumber = (patientId: number) => {
    const index = allPatients.findIndex(p => p.id === patientId);
    return index + 1;
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", address: "", age: "", gender: "Male", treatment: "", doctor_name: "", fee_total: "", fee_paid: "" });
    setSelectedTeeth([]);
    setShowForm(false);
    setEditingPatientId(null);
  };

  const resetVisitForm = () => {
    setVisitForm({ doctor_name: "", treatment: "", notes: "", fee: "", fee_paid: "", visit_date: new Date().toISOString().split("T")[0], status: "Pending" });
    setVisitTeeth([]);
    setShowVisitForm(false);
    setEditingVisitId(null);
  };

  const toggleTooth = (num: number) => {
    setSelectedTeeth(prev => prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]);
  };

  const toggleVisitTooth = (num: number) => {
    setVisitTeeth(prev => prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]);
  };

  const handleAdd = async () => {
    setLoading(true);
    const supabase = createClient();
    const fee_total = parseInt(form.fee_total) || 0;
    const fee_paid = parseInt(form.fee_paid) || 0;
    const status = fee_paid >= fee_total && fee_total > 0 ? "Paid" : fee_paid > 0 ? "Partial" : "Pending";

    const { data: patient } = await supabase.from("patients").insert([{
      name: form.name, phone: form.phone, address: form.address,
      age: parseInt(form.age) || 0, gender: form.gender,
      treatment: form.treatment, tooth_number: selectedTeeth.join(", "),
      doctor_name: form.doctor_name, fee_total, fee_paid, status,
      clinic_id: clinicId,
    }]).select().single();

    if (patient && fee_total > 0) {
      const { data: invNum } = await supabase.rpc("generate_invoice_number", { p_clinic_id: clinicId });
      const invStatus = fee_paid >= fee_total ? "paid" : fee_paid > 0 ? "partial" : "unpaid";
      await supabase.from("invoices").insert([{
        clinic_id: clinicId,
        patient_id: patient.id,
        invoice_number: invNum,
        status: invStatus,
        subtotal: fee_total,
        discount: 0,
        total: fee_total,
        amount_paid: fee_paid,
        notes: "[Registration]",
      }]);
    }

    resetForm();
    setLoading(false);
    fetchPatients();
    fetchInvoiceSummaries();
  };

  const handleEditPatient = async () => {
    if (!editingPatientId) return;
    setLoading(true);
    const supabase = createClient();
    const fee_total = parseInt(form.fee_total) || 0;
    const fee_paid = parseInt(form.fee_paid) || 0;
    const status = fee_paid >= fee_total && fee_total > 0 ? "Paid" : fee_paid > 0 ? "Partial" : "Pending";

    await supabase.from("patients").update({
      name: form.name, phone: form.phone, address: form.address,
      age: parseInt(form.age) || 0, gender: form.gender,
      treatment: form.treatment, tooth_number: selectedTeeth.join(", "),
      doctor_name: form.doctor_name, fee_total, fee_paid, status,
    }).eq("id", editingPatientId);

    if (fee_total > 0) {
      const invStatus = fee_paid >= fee_total ? "paid" : fee_paid > 0 ? "partial" : "unpaid";
      const { data: existingInv } = await supabase
        .from("invoices")
        .select("id")
        .eq("patient_id", editingPatientId)
        .eq("notes", "[Registration]")
        .maybeSingle();

      if (existingInv) {
        await supabase.from("invoices").update({
          subtotal: fee_total,
          total: fee_total,
          amount_paid: fee_paid,
          status: invStatus,
        }).eq("id", existingInv.id);
      } else {
        const { data: invNum } = await supabase.rpc("generate_invoice_number", { p_clinic_id: clinicId });
        await supabase.from("invoices").insert([{
          clinic_id: clinicId,
          patient_id: editingPatientId,
          invoice_number: invNum,
          status: invStatus,
          subtotal: fee_total,
          discount: 0,
          total: fee_total,
          amount_paid: fee_paid,
          notes: "[Registration]",
        }]);
      }
    }

    resetForm();
    setLoading(false);
    fetchPatients();
    fetchInvoiceSummaries();
  };

  const openEditPatient = (p: Patient) => {
    setEditingPatientId(p.id);
    setForm({
      name: p.name, phone: p.phone || "", address: p.address || "",
      age: p.age?.toString() || "", gender: p.gender || "Male",
      treatment: p.treatment || "", doctor_name: p.doctor_name || "",
      fee_total: p.fee_total?.toString() || "", fee_paid: p.fee_paid?.toString() || "",
    });
    setSelectedTeeth(p.tooth_number ? p.tooth_number.split(", ").map(Number).filter(Boolean) : []);
    setShowForm(false);
  };

  const handleAddVisit = async () => {
    if (!selectedPatient) return;
    setLoading(true);
    const supabase = createClient();
    const visitFee = parseInt(visitForm.fee) || 0;
    const visitFeePaid = parseInt(visitForm.fee_paid) || 0;
    const visitStatus = visitFeePaid >= visitFee && visitFee > 0 ? "Paid" : visitFeePaid > 0 ? "Partial" : "Pending";

    await supabase.from("visits").insert([{
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      doctor_name: visitForm.doctor_name,
      treatment: visitForm.treatment,
      tooth_number: visitTeeth.join(", "),
      notes: visitForm.notes,
      fee: visitFee,
      fee_paid: visitFeePaid,
      visit_date: visitForm.visit_date,
      status: visitStatus,
      clinic_id: clinicId,
    }]);

    const newTotal = selectedPatient.fee_total + visitFee;
    const newPaid = selectedPatient.fee_paid + visitFeePaid;
    const newStatus = newPaid >= newTotal && newTotal > 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";
    await supabase.from("patients").update({ fee_total: newTotal, fee_paid: newPaid, status: newStatus }).eq("id", selectedPatient.id);
    setSelectedPatient({ ...selectedPatient, fee_total: newTotal, fee_paid: newPaid, status: newStatus });

    resetVisitForm();
    setLoading(false);
    fetchVisits(selectedPatient.id);
    fetchPatients();
  };

  const handleEditVisit = async () => {
    if (!selectedPatient || !editingVisitId) return;
    setLoading(true);
    const supabase = createClient();
    const oldVisit = visits.find(v => v.id === editingVisitId);
    const visitFee = parseInt(visitForm.fee) || 0;
    const visitFeePaid = parseInt(visitForm.fee_paid) || 0;
    const visitStatus = visitFeePaid >= visitFee && visitFee > 0 ? "Paid" : visitFeePaid > 0 ? "Partial" : "Pending";

    await supabase.from("visits").update({
      doctor_name: visitForm.doctor_name,
      treatment: visitForm.treatment,
      tooth_number: visitTeeth.join(", "),
      notes: visitForm.notes,
      fee: visitFee,
      fee_paid: visitFeePaid,
      visit_date: visitForm.visit_date,
      status: visitStatus,
    }).eq("id", editingVisitId);

    if (oldVisit) {
      const newTotal = selectedPatient.fee_total - oldVisit.fee + visitFee;
      const newPaid = selectedPatient.fee_paid - oldVisit.fee_paid + visitFeePaid;
      const newStatus = newPaid >= newTotal && newTotal > 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";
      await supabase.from("patients").update({ fee_total: newTotal, fee_paid: newPaid, status: newStatus }).eq("id", selectedPatient.id);
      setSelectedPatient({ ...selectedPatient, fee_total: newTotal, fee_paid: newPaid, status: newStatus });
    }

    resetVisitForm();
    setLoading(false);
    fetchVisits(selectedPatient.id);
    fetchPatients();
  };

  const openEditVisit = (v: Visit) => {
    setEditingVisitId(v.id);
    setVisitForm({
      doctor_name: v.doctor_name || "",
      treatment: v.treatment || "",
      notes: v.notes || "",
      fee: v.fee.toString(),
      fee_paid: v.fee_paid.toString(),
      visit_date: v.visit_date || new Date().toISOString().split("T")[0],
      status: v.status || "Pending",
    });
    setVisitTeeth(v.tooth_number ? v.tooth_number.split(", ").map(Number).filter(Boolean) : []);
    setShowVisitForm(true);
  };

  const handleDeleteVisit = async (v: Visit) => {
    if (!selectedPatient || !confirm("Delete this visit?")) return;
    const supabase = createClient();
    await supabase.from("visits").delete().eq("id", v.id);
    const newTotal = selectedPatient.fee_total - v.fee;
    const newPaid = selectedPatient.fee_paid - v.fee_paid;
    const newStatus = newPaid >= newTotal && newTotal > 0 ? "Paid" : newPaid > 0 ? "Partial" : "Pending";
    await supabase.from("patients").update({ fee_total: newTotal, fee_paid: newPaid, status: newStatus }).eq("id", selectedPatient.id);
    setSelectedPatient({ ...selectedPatient, fee_total: newTotal, fee_paid: newPaid, status: newStatus });
    fetchVisits(selectedPatient.id);
    fetchPatients();
  };

  const handleVisitPayment = async (v: Visit) => {
    if (!selectedPatient) return;
    const amount = prompt(`Additional payment for — ${v.treatment}:`);
    if (!amount) return;
    const extra = parseInt(amount);
    const supabase = createClient();
    const newPaid = v.fee_paid + extra;
    const newStatus = newPaid >= v.fee ? "Paid" : "Partial";
    await supabase.from("visits").update({ fee_paid: newPaid, status: newStatus }).eq("id", v.id);
    const patNewPaid = selectedPatient.fee_paid + extra;
    const patStatus = patNewPaid >= selectedPatient.fee_total && selectedPatient.fee_total > 0 ? "Paid" : "Partial";
    await supabase.from("patients").update({ fee_paid: patNewPaid, status: patStatus }).eq("id", selectedPatient.id);
    setSelectedPatient({ ...selectedPatient, fee_paid: patNewPaid, status: patStatus });
    fetchVisits(selectedPatient.id);
    fetchPatients();
  };

  const handleSaveMedical = async () => {
    if (!selectedPatient) return;
    setLoading(true);
    const supabase = createClient();
    if (medicalHistory) {
      await supabase.from("medical_history").update({
        allergies: medicalForm.allergies, blood_group: medicalForm.blood_group,
        medical_conditions: medicalForm.medical_conditions, current_medications: medicalForm.current_medications,
        previous_surgeries: medicalForm.previous_surgeries, notes: medicalForm.notes,
      }).eq("id", medicalHistory.id);
    } else {
      await supabase.from("medical_history").insert([{
        patient_id: selectedPatient.id, patient_name: selectedPatient.name, clinic_id: clinicId,
        allergies: medicalForm.allergies, blood_group: medicalForm.blood_group,
        medical_conditions: medicalForm.medical_conditions, current_medications: medicalForm.current_medications,
        previous_surgeries: medicalForm.previous_surgeries, notes: medicalForm.notes,
      }]);
    }
    setShowMedicalForm(false);
    setLoading(false);
    fetchMedicalHistory(selectedPatient.id);
  };

  const handleAddAppointment = async () => {
    if (!selectedPatient) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("appointments").insert([{
      patient_id: selectedPatient.id, patient_name: selectedPatient.name,
      doctor_name: selectedPatient.doctor_name || "",
      date: appointmentForm.date, time: appointmentForm.time,
      treatment: appointmentForm.treatment, notes: appointmentForm.notes,
      status: "Scheduled", clinic_id: clinicId,
    }]);
    setAppointmentForm({ date: "", time: "", treatment: "", notes: "" });
    setShowAppointmentForm(false);
    setLoading(false);
    fetchAppointments(selectedPatient.id);
    setActiveTab("appointments");
  };

  const updateAppointmentStatus = async (apptId: number, newStatus: string) => {
    const supabase = createClient();
    await supabase.from("appointments").update({ status: newStatus }).eq("id", apptId);
    if (selectedPatient) fetchAppointments(selectedPatient.id);
  };

  const handlePayment = async (patient: Patient, extraPayment: number) => {
    const supabase = createClient();
    const newPaid = patient.fee_paid + extraPayment;
    const newStatus = newPaid >= patient.fee_total && patient.fee_total > 0 ? "Paid" : "Partial";
    await supabase.from("patients").update({ fee_paid: newPaid, status: newStatus }).eq("id", patient.id);
    fetchPatients();
  };

  const openPayModal = (p: Patient) => {
    const outstanding = invSummary(p.id).outstanding;
    setPayingPatient(p);
    setPayForm({ amount: outstanding > 0 ? outstanding.toString() : "", method: "Cash", notes: "" });
    setPayError("");
  };

  const handleQuickPayment = async () => {
    if (!payingPatient) return;
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { setPayError("Enter a valid amount."); return; }

    setPayLoading(true);
    setPayError("");
    const supabase = createClient();

    // Update patients table
    const newPaid = payingPatient.fee_paid + amount;
    const newPatientStatus = newPaid >= payingPatient.fee_total && payingPatient.fee_total > 0 ? "Paid" : "Partial";
    await supabase.from("patients")
      .update({ fee_paid: newPaid, status: newPatientStatus })
      .eq("id", payingPatient.id);

    // Find and update the registration invoice
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, total, amount_paid")
      .eq("patient_id", payingPatient.id)
      .eq("notes", "[Registration]")
      .maybeSingle();

    if (inv) {
      const newAmountPaid = Math.min(inv.total, inv.amount_paid + amount);
      const invStatus = newAmountPaid >= inv.total ? "paid" : newAmountPaid > 0 ? "partial" : "unpaid";
      await supabase.from("invoices")
        .update({ amount_paid: newAmountPaid, status: invStatus })
        .eq("id", inv.id);

      await supabase.from("payments").insert([{
        invoice_id: inv.id,
        clinic_id: clinicId,
        amount,
        payment_method: payForm.method,
        payment_date: new Date().toISOString(),
        notes: payForm.notes || null,
      }]);
    }

    setPayingPatient(null);
    setPayLoading(false);
    fetchPatients();
    fetchInvoiceSummaries();
  };

  const openPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveTab("visits");
    fetchVisits(patient.id);
    fetchAppointments(patient.id);
    fetchMedicalHistory(patient.id);
  };

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    getClinicPatientNumber(p.id).toString().includes(search)
  );

  const visitTotalFee = visits.reduce((s, v) => s + (v.fee || 0), 0);
  const visitTotalPaid = visits.reduce((s, v) => s + (v.fee_paid || 0), 0);
  const visitTotalPending = visitTotalFee - visitTotalPaid;

  const ToothBtn = ({ num, selected, onToggle }: { num: number; selected: number[]; onToggle: (n: number) => void }) => (
    <button type="button" onClick={() => onToggle(num)}
      className={`w-6 h-6 md:w-8 md:h-8 text-xs rounded border font-medium transition-colors ${
        selected.includes(num) ? "bg-teal-600 text-white border-teal-600" : "bg-white text-teal-700 border-teal-200 hover:bg-teal-50"
      }`}>
      {num}
    </button>
  );

  const ToothChart = ({ selected, onToggle }: { selected: number[]; onToggle: (n: number) => void }) => (
    <div className="p-3 md:p-4 border border-teal-100 rounded-xl bg-teal-50 overflow-x-auto md:col-span-2">
      <p className="text-xs font-semibold text-teal-700 mb-3">Select Tooth (FDI Numbering)</p>
      <div className="flex flex-col items-center gap-1 min-w-max mx-auto">
        <div className="flex gap-0.5 md:gap-1 items-center">
          <span className="text-xs text-teal-400 w-12 md:w-16 text-right">Upper R</span>
          <div className="flex gap-0.5 md:gap-1">{upperRight.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <div className="w-px h-6 md:h-8 bg-teal-300 mx-0.5 md:mx-1"></div>
          <div className="flex gap-0.5 md:gap-1">{upperLeft.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <span className="text-xs text-teal-400 w-12 md:w-16">Upper L</span>
        </div>
        <div className="w-full border-t border-teal-200 my-1"></div>
        <div className="flex gap-0.5 md:gap-1 items-center">
          <span className="text-xs text-teal-400 w-12 md:w-16 text-right">Lower R</span>
          <div className="flex gap-0.5 md:gap-1">{lowerRight.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <div className="w-px h-6 md:h-8 bg-teal-300 mx-0.5 md:mx-1"></div>
          <div className="flex gap-0.5 md:gap-1">{lowerLeft.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <span className="text-xs text-teal-400 w-12 md:w-16">Lower L</span>
        </div>
      </div>
      {selected.length > 0 && <p className="text-xs text-teal-600 mt-2 text-center">Selected: {selected.join(", ")}</p>}
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      status === "Paid" ? "bg-green-100 text-green-700" :
      status === "Partial" ? "bg-yellow-100 text-yellow-700" :
      status === "Completed" ? "bg-green-100 text-green-700" :
      status === "Scheduled" ? "bg-blue-100 text-blue-700" :
      status === "Cancelled" ? "bg-red-100 text-red-700" :
      "bg-orange-100 text-orange-700"
    }`}>{status}</span>
  );

  const showAnyForm = showForm || !!editingPatientId;

  return (
    <div className="min-h-screen flex bg-teal-50">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 mt-14 md:mt-0">
        {showReceipt && receiptPatient && (
          <Receipt patient={receiptPatient} onClose={() => setShowReceipt(false)} />
        )}

        {selectedPatient ? (
          <div>
            <button onClick={() => setSelectedPatient(null)} className="text-teal-600 text-sm mb-4 hover:underline">← Back to Patients</button>

            <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg md:text-xl font-semibold text-teal-800">{selectedPatient.name}</h2>
                    <span className="text-xs text-teal-400 bg-teal-50 px-2 py-0.5 rounded-full">#{getClinicPatientNumber(selectedPatient.id)}</span>
                    <StatusBadge status={selectedPatient.status} />
                  </div>
                  <p className="text-xs md:text-sm text-teal-500 mt-1">
                    {selectedPatient.phone} · {selectedPatient.gender} · {selectedPatient.age} yrs · {selectedPatient.address}
                  </p>
                  <p className="text-xs text-teal-400 mt-0.5">
                    Registered: {formatDate(selectedPatient.created_at)}
                  </p>
                  {selectedPatient.treatment && (
                    <p className="text-xs text-teal-400 mt-0.5">
                      Initial: {selectedPatient.treatment} {selectedPatient.tooth_number ? `· Tooth: ${selectedPatient.tooth_number}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setReceiptPatient(selectedPatient); setShowReceipt(true); }} className="border border-teal-300 text-teal-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-teal-50">🖨️ Receipt</button>
                  <button onClick={() => { setShowAppointmentForm(!showAppointmentForm); setShowVisitForm(false); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium">+ Appointment</button>
                  <button onClick={() => { resetVisitForm(); setShowVisitForm(!showVisitForm); setShowAppointmentForm(false); }} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-xs font-medium">+ Visit</button>
                </div>
              </div>

              {(() => {
                const inv = invSummary(selectedPatient.id);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4">
                    <div className="bg-teal-50 rounded-lg p-2 md:p-3">
                      <p className="text-xs text-teal-600">Total Billed</p>
                      <p className="text-base md:text-lg font-semibold text-teal-800">{symbol} {inv.totalBilled.toLocaleString()}</p>
                      <p className="text-xs text-teal-400">{visits.length} visits</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 md:p-3">
                      <p className="text-xs text-green-600">Total Collected</p>
                      <p className="text-base md:text-lg font-semibold text-green-700">{symbol} {inv.totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 md:p-3">
                      <p className="text-xs text-orange-600">Still Pending</p>
                      <p className="text-base md:text-lg font-semibold text-orange-600">{symbol} {inv.outstanding.toLocaleString()}</p>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-2 md:p-3">
                      <p className="text-xs text-teal-600">Last Visit</p>
                      <p className="text-sm font-semibold text-teal-800">{visits[0]?.visit_date ? formatDate(visits[0].visit_date) : "—"}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {showAppointmentForm && (
              <div className="bg-white rounded-xl p-4 md:p-6 border border-blue-100 mb-6">
                <h3 className="text-sm font-semibold text-blue-800 mb-4">New Appointment — {selectedPatient.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-teal-600 mb-1">Date</label>
                    <input type="date" value={appointmentForm.date} onChange={e => setAppointmentForm({...appointmentForm, date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-teal-600 mb-1">Time</label>
                    <input type="time" value={appointmentForm.time} onChange={e => setAppointmentForm({...appointmentForm, time: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  </div>
                  <input placeholder="Treatment" value={appointmentForm.treatment} onChange={e => setAppointmentForm({...appointmentForm, treatment: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Notes (optional)" value={appointmentForm.notes} onChange={e => setAppointmentForm({...appointmentForm, notes: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleAddAppointment} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{loading ? "Saving..." : "Book Appointment"}</button>
                  <button onClick={() => setShowAppointmentForm(false)} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            {showVisitForm && (
              <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
                <h3 className="text-sm font-semibold text-teal-800 mb-4">{editingVisitId ? "Edit Visit" : "New Visit"} — {selectedPatient.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-teal-600 mb-1">Visit Date</label>
                    <input type="date" value={visitForm.visit_date} onChange={e => setVisitForm({...visitForm, visit_date: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  </div>
                  <select value={visitForm.doctor_name} onChange={e => setVisitForm({...visitForm, doctor_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  <input placeholder="Treatment done" value={visitForm.treatment} onChange={e => setVisitForm({...visitForm, treatment: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <select value={visitForm.status} onChange={e => setVisitForm({...visitForm, status: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option>Pending</option>
                    <option>Partial</option>
                    <option>Paid</option>
                  </select>
                  <input placeholder={`Visit Fee (${symbol})`} type="number" value={visitForm.fee} onChange={e => setVisitForm({...visitForm, fee: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder={`Fee Paid Now (${symbol})`} type="number" value={visitForm.fee_paid} onChange={e => setVisitForm({...visitForm, fee_paid: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <div className="md:col-span-2">
                    <input placeholder="Notes / Prescription" value={visitForm.notes} onChange={e => setVisitForm({...visitForm, notes: e.target.value})} className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    {prescriptionPresets.length > 0 && (() => {
                      const rxGroups = prescriptionPresets.reduce<Record<string, typeof prescriptionPresets>>((acc, rx) => {
                        const k = rx.group_name || "Other";
                        if (!acc[k]) acc[k] = [];
                        acc[k].push(rx);
                        return acc;
                      }, {});
                      const formatRx = (rx: typeof prescriptionPresets[0]) =>
                        [`Rx: ${rx.medicine}`, rx.dosage || null, rx.frequency || null, rx.duration ? `× ${rx.duration}` : null, rx.notes ? `(${rx.notes})` : null].filter(Boolean).join(" — ");
                      const appendNotes = (text: string) =>
                        setVisitForm(prev => ({ ...prev, notes: prev.notes ? `${prev.notes}\n${text}` : text }));
                      return (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-teal-500 font-medium">Quick Prescription Presets:</p>
                          {Object.entries(rxGroups).map(([groupName, meds]) => (
                            <div key={groupName} className="border border-teal-100 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between bg-teal-50 px-3 py-1.5">
                                <span className="text-xs font-semibold text-teal-700">{groupName}</span>
                                <button
                                  type="button"
                                  onClick={() => appendNotes(meds.map(formatRx).join("\n"))}
                                  className="text-xs bg-teal-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-teal-700"
                                >
                                  Add All ({meds.length})
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 p-2">
                                {meds.map(rx => (
                                  <button
                                    key={rx.id}
                                    type="button"
                                    onClick={() => appendNotes(formatRx(rx))}
                                    className="text-xs px-2.5 py-1 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors"
                                  >
                                    + {rx.medicine}
                                    {rx.dosage && <span className="text-teal-400 ml-1">{rx.dosage}</span>}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <ToothChart selected={visitTeeth} onToggle={toggleVisitTooth} />
                {visitForm.fee && visitForm.fee_paid && (
                  <div className="mt-3 bg-teal-50 rounded-lg px-4 py-2 flex justify-between items-center">
                    <span className="text-xs text-teal-600">This visit remaining:</span>
                    <span className="text-sm font-semibold text-orange-600">{symbol} {(parseInt(visitForm.fee) || 0) - (parseInt(visitForm.fee_paid) || 0)}</span>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={editingVisitId ? handleEditVisit : handleAddVisit} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{loading ? "Saving..." : editingVisitId ? "Update Visit" : "Save Visit"}</button>
                  <button onClick={resetVisitForm} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
              <div className="flex border-b border-teal-100 overflow-x-auto">
                <button onClick={() => setActiveTab("visits")} className={`flex-1 py-3 text-xs md:text-sm font-medium whitespace-nowrap px-2 ${activeTab === "visits" ? "bg-teal-50 text-teal-800 border-b-2 border-teal-600" : "text-teal-500"}`}>
                  Visits ({visits.length})
                </button>
                <button onClick={() => setActiveTab("appointments")} className={`flex-1 py-3 text-xs md:text-sm font-medium whitespace-nowrap px-2 ${activeTab === "appointments" ? "bg-blue-50 text-blue-800 border-b-2 border-blue-600" : "text-teal-500"}`}>
                  Appointments ({appointments.length})
                </button>
                <button onClick={() => setActiveTab("medical")} className={`flex-1 py-3 text-xs md:text-sm font-medium whitespace-nowrap px-2 ${activeTab === "medical" ? "bg-red-50 text-red-800 border-b-2 border-red-400" : "text-teal-500"}`}>
                  Medical
                </button>
              </div>

              {activeTab === "visits" && (
                <div>
                  {visits.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-teal-400 text-sm mb-1">No visits recorded yet</p>
                      <p className="text-teal-300 text-xs">Click "+ Visit" to add first visit</p>
                    </div>
                  ) : (
                    visits.map((v, i) => (
                      <div key={v.id} className="px-4 md:px-5 py-4 border-b border-teal-50 hover:bg-teal-50">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-sm font-semibold text-teal-800">Visit {visits.length - i}</p>
                              <StatusBadge status={v.status || "Pending"} />
                              <span className="text-xs text-teal-400 bg-teal-50 px-2 py-0.5 rounded-full">
                                📅 {formatDate(v.visit_date)}
                              </span>
                            </div>
                            <p className="text-sm text-teal-700">{v.treatment}</p>
                            <p className="text-xs text-teal-500 mt-0.5">
                              Dr. {v.doctor_name || "—"} {v.tooth_number ? `· Tooth: ${v.tooth_number}` : ""}
                            </p>
                            {v.notes && <p className="text-xs text-teal-400 mt-1 italic">{v.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-teal-800">{symbol} {v.fee}</p>
                            <p className="text-xs text-green-600">Paid: {symbol} {v.fee_paid}</p>
                            <p className="text-xs text-orange-500">Due: {symbol} {v.fee - v.fee_paid}</p>
                            <div className="flex gap-2 mt-1 justify-end">
                              {v.fee_paid < v.fee && (
                                <button onClick={() => handleVisitPayment(v)} className="text-teal-600 text-xs font-medium hover:underline">Pay</button>
                              )}
                              <button onClick={() => openEditVisit(v)} className="text-teal-600 text-xs font-medium">✏️</button>
                              <button onClick={() => handleDeleteVisit(v)} className="text-red-400 text-xs font-medium">🗑️</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {visits.length > 0 && (
                    <div className="px-4 py-3 bg-teal-50 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-xs font-semibold text-teal-700">All visits total</span>
                      <div className="flex gap-4 flex-wrap">
                        <span className="text-xs text-teal-700">Billed: <strong>{symbol} {visitTotalFee}</strong></span>
                        <span className="text-xs text-green-700">Paid: <strong>{symbol} {visitTotalPaid}</strong></span>
                        <span className="text-xs text-orange-600">Pending: <strong>{symbol} {visitTotalPending}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "appointments" && (
                <div>
                  {appointments.length === 0 ? (
                    <p className="text-center py-8 text-blue-400 text-sm">No appointments booked yet</p>
                  ) : (
                    appointments.map((a, i) => (
                      <div key={a.id} className="px-4 md:px-5 py-4 border-b border-teal-50 hover:bg-blue-50">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-teal-800">Appointment {i + 1} — {a.treatment || "General"}</p>
                            <p className="text-xs text-teal-500 mt-0.5">📅 {formatDate(a.date)} · ⏰ {a.time}</p>
                            {a.notes && <p className="text-xs text-teal-400 mt-1">{a.notes}</p>}
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <StatusBadge status={a.status} />
                            {a.status === "Scheduled" && (
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => updateAppointmentStatus(a.id, "Completed")} className="text-green-600 text-xs font-medium">✓ Done</button>
                                <button onClick={() => updateAppointmentStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium">✗ Cancel</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "medical" && (
                <div className="p-4 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-teal-800">Medical History</h3>
                    <button onClick={() => setShowMedicalForm(!showMedicalForm)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                      {medicalHistory ? "✏️ Edit" : "+ Add"}
                    </button>
                  </div>
                  {showMedicalForm && (
                    <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-red-700 mb-1">Blood Group</label>
                          <select value={medicalForm.blood_group} onChange={e => setMedicalForm({...medicalForm, blood_group: e.target.value})} className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                            <option value="">Select</option>
                            <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                            <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-red-700 mb-1">Allergies</label>
                          <input placeholder="e.g. Penicillin, Latex" value={medicalForm.allergies} onChange={e => setMedicalForm({...medicalForm, allergies: e.target.value})} className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-red-700 mb-1">Medical Conditions</label>
                          <input placeholder="e.g. Diabetes, Hypertension" value={medicalForm.medical_conditions} onChange={e => setMedicalForm({...medicalForm, medical_conditions: e.target.value})} className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-red-700 mb-1">Current Medications</label>
                          <input placeholder="e.g. Metformin, Aspirin" value={medicalForm.current_medications} onChange={e => setMedicalForm({...medicalForm, current_medications: e.target.value})} className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-red-700 mb-1">Previous Surgeries</label>
                          <input placeholder="e.g. Appendectomy 2019" value={medicalForm.previous_surgeries} onChange={e => setMedicalForm({...medicalForm, previous_surgeries: e.target.value})} className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-red-700 mb-1">Additional Notes</label>
                          <textarea placeholder="Any other important medical information..." value={medicalForm.notes} onChange={e => setMedicalForm({...medicalForm, notes: e.target.value})} rows={3} className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button onClick={handleSaveMedical} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{loading ? "Saving..." : "Save"}</button>
                        <button onClick={() => setShowMedicalForm(false)} className="border border-red-200 text-red-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                  {medicalHistory ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                        <p className="text-xs font-semibold text-red-700 mb-1">Blood Group</p>
                        <p className="text-lg font-bold text-red-800">{medicalHistory.blood_group || "—"}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                        <p className="text-xs font-semibold text-orange-700 mb-1">Allergies</p>
                        <p className="text-sm text-orange-800">{medicalHistory.allergies || "None recorded"}</p>
                      </div>
                      <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                        <p className="text-xs font-semibold text-teal-700 mb-1">Medical Conditions</p>
                        <p className="text-sm text-teal-800">{medicalHistory.medical_conditions || "None recorded"}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Current Medications</p>
                        <p className="text-sm text-blue-800">{medicalHistory.current_medications || "None recorded"}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                        <p className="text-xs font-semibold text-purple-700 mb-1">Previous Surgeries</p>
                        <p className="text-sm text-purple-800">{medicalHistory.previous_surgeries || "None recorded"}</p>
                      </div>
                      {medicalHistory.notes && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Additional Notes</p>
                          <p className="text-sm text-gray-800">{medicalHistory.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-teal-400 text-sm mb-3">No medical history recorded yet</p>
                      <button onClick={() => setShowMedicalForm(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Medical History</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-teal-800">Patients</h2>
                <p className="text-sm text-teal-600 mt-1">Total: {patients.length} patients</p>
              </div>
              <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add Patient</button>
            </div>

            <div className="mb-5">
              <input placeholder="Search by name or patient number..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-teal-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>

            {showAnyForm && (
              <div className="bg-white rounded-xl p-4 md:p-6 border border-teal-100 mb-6">
                <h3 className="text-sm font-semibold text-teal-800 mb-4">{editingPatientId ? "Edit Patient" : "New Patient"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                  <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Phone Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Age" type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option>Male</option><option>Female</option>
                  </select>
                  <select value={form.doctor_name} onChange={e => setForm({...form, doctor_name: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  <input placeholder="Initial Treatment" value={form.treatment} onChange={e => setForm({...form, treatment: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 md:col-span-2" />
                </div>
                <ToothChart selected={selectedTeeth} onToggle={toggleTooth} />
                <div className="grid grid-cols-2 gap-3 md:gap-4 mt-4">
                  <input placeholder="Initial Fee" type="number" value={form.fee_total} onChange={e => setForm({...form, fee_total: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input placeholder="Fee Paid" type="number" value={form.fee_paid} onChange={e => setForm({...form, fee_paid: e.target.value})} className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={editingPatientId ? handleEditPatient : handleAdd} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{loading ? "Saving..." : editingPatientId ? "Update Patient" : "Save Patient"}</button>
                  <button onClick={resetForm} className="border border-teal-200 text-teal-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-teal-100 overflow-hidden">
              {/* Mobile */}
              <div className="md:hidden divide-y divide-teal-50">
                {filteredPatients.length === 0 ? (
                  <p className="text-center py-10 text-teal-400 text-sm">No patients found</p>
                ) : (
                  filteredPatients.map(p => (
                    <div key={p.id} className="p-4">
                      <div className="flex justify-between items-start mb-1" onClick={() => openPatient(p)}>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-teal-800 text-sm">{p.name}</p>
                            <span className="text-xs text-teal-300">#{getClinicPatientNumber(p.id)}</span>
                          </div>
                          <p className="text-xs text-teal-400">{p.phone} · {p.gender} · {p.age}y</p>
                          <p className="text-xs text-teal-300">{formatDate(p.created_at)}</p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-xs text-teal-600 mb-1" onClick={() => openPatient(p)}>{p.treatment} {p.doctor_name ? `· Dr. ${p.doctor_name}` : ""}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-teal-500">
                          Billed: {symbol} {invSummary(p.id).totalBilled.toLocaleString()} · Paid: {symbol} {invSummary(p.id).totalPaid.toLocaleString()}
                          {invSummary(p.id).outstanding > 0 && <span className="text-orange-500"> · Due: {symbol} {invSummary(p.id).outstanding.toLocaleString()}</span>}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => { setReceiptPatient(p); setShowReceipt(true); }} className="text-teal-600 text-xs">🖨️</button>
                          <button onClick={() => openEditPatient(p)} className="text-teal-600 text-xs font-medium">✏️</button>
                          <button onClick={() => router.push(`/dashboard/patients/${p.id}`)} className="text-purple-600 text-xs font-medium">History</button>
                          {invSummary(p.id).outstanding > 0 && (
                            <button onClick={() => openPayModal(p)} className="text-white bg-teal-600 hover:bg-teal-700 text-xs font-medium px-2 py-1 rounded-lg">Pay</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-teal-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-teal-700 font-medium">#</th>
                      <th className="text-left px-4 py-3 text-teal-700 font-medium">Name</th>
                      <th className="text-left px-4 py-3 text-teal-700 font-medium">Registered</th>
                      <th className="text-left px-4 py-3 text-teal-700 font-medium">Doctor</th>
                      <th className="text-left px-4 py-3 text-teal-700 font-medium">Treatment</th>
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
                        <tr key={p.id} className="border-t border-teal-50 hover:bg-teal-50">
                          <td className="px-4 py-3 text-teal-400 text-xs cursor-pointer" onClick={() => openPatient(p)}>#{getClinicPatientNumber(p.id)}</td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => openPatient(p)}>
                            <p className="font-medium text-teal-800">{p.name}</p>
                            <p className="text-xs text-teal-400">{p.phone} · {p.gender} · {p.age}y</p>
                          </td>
                          <td className="px-4 py-3 text-teal-500 text-xs cursor-pointer" onClick={() => openPatient(p)}>
                            {formatDate(p.created_at)}
                          </td>
                          <td className="px-4 py-3 text-teal-700 cursor-pointer" onClick={() => openPatient(p)}>{p.doctor_name || "-"}</td>
                          <td className="px-4 py-3 text-teal-700 cursor-pointer" onClick={() => openPatient(p)}>{p.treatment}</td>
                          <td className="px-4 py-3 text-teal-700 cursor-pointer" onClick={() => openPatient(p)}>{symbol} {invSummary(p.id).totalBilled.toLocaleString()}</td>
                          <td className="px-4 py-3 text-green-700 cursor-pointer" onClick={() => openPatient(p)}>{symbol} {invSummary(p.id).totalPaid.toLocaleString()}</td>
                          <td className="px-4 py-3 text-orange-600 cursor-pointer font-medium" onClick={() => openPatient(p)}>{symbol} {invSummary(p.id).outstanding.toLocaleString()}</td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => openPatient(p)}><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => { setReceiptPatient(p); setShowReceipt(true); }} className="text-teal-600 text-xs font-medium">🖨️</button>
                              <button onClick={() => openEditPatient(p)} className="text-teal-600 text-xs font-medium">✏️</button>
                              <button onClick={() => router.push(`/dashboard/patients/${p.id}`)} className="text-purple-600 text-xs font-semibold hover:underline">History</button>
                              {invSummary(p.id).outstanding > 0 && (
                                <button onClick={() => openPayModal(p)} className="text-white bg-teal-600 hover:bg-teal-700 text-xs font-medium px-2 py-1 rounded-lg">Pay</button>
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
          </div>
        )}
      </div>

      {/* Quick Pay Modal */}
      {payingPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-teal-800 mb-1">Record Payment</h3>
            <p className="text-xs text-teal-500 mb-4">{payingPatient.name} · Balance: {symbol} {invSummary(payingPatient.id).outstanding.toLocaleString()}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-teal-600 mb-1 block">Amount *</label>
                <input
                  type="number" min="0" step="0.01"
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full border border-teal-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="text-xs text-teal-600 mb-1 block">Payment Method</label>
                <select
                  value={payForm.method}
                  onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                  className="w-full border border-teal-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {["Cash", "Card", "Bank Transfer", "Other"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-teal-600 mb-1 block">Notes (optional)</label>
                <input
                  value={payForm.notes}
                  onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Any notes..."
                  className="w-full border border-teal-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              {payError && <p className="text-red-500 text-xs">{payError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleQuickPayment}
                  disabled={payLoading}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                >
                  {payLoading ? "Saving..." : "Confirm Payment"}
                </button>
                <button
                  onClick={() => setPayingPatient(null)}
                  className="flex-1 border border-teal-200 text-teal-700 py-2.5 rounded-xl text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}