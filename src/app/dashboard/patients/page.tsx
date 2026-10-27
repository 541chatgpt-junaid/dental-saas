"use client";
import { useState, useEffect } from "react";
import { doctorName } from "@/lib/personName";
import { formatDate } from "@/lib/dateFormat";
import EmptyState from "@/components/EmptyState";
import { SkeletonRows } from "@/components/Skeleton";
import { ArrowLeft, Calendar, Check, Clock, Mail, Pencil, Printer, Trash2, TriangleAlert, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Receipt from "@/components/Receipt";
import TreatmentSelect from "@/components/TreatmentSelect";
import { useCurrency } from "@/lib/useCurrency";
import { useClinic } from "@/lib/ClinicContext";
import { effectiveApptStatus } from "@/lib/appointments";
import FormError from "@/components/FormError";
import { dateOrToday, firstError, readAmount, saveErrorMessage, todayISO } from "@/lib/formSave";
import {
  billingByPatient, createInvoice, loadLedger, markMigrated, NO_BILLS, payPatientBalance, recordPayment,
  REGISTRATION_NOTE, setSingleItem, VISIT_NOTE, type Ledgered, type LedgerInvoiceRow, type PatientBilling,
} from "@/lib/ledger";

interface Patient {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  address: string;
  age: number;
  gender: string;
  dob: string | null;
  cnic: string | null;
  email: string | null;
  blood_group: string | null;
  emergency_contact: string | null;
  guardian: string | null;
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

interface Prescription {
  id: string;
  patient_id: number;
  visit_id: number | null;
  medicine: string;
  dosage: string | null;
  duration: string | null;
  notes: string | null;
  created_at: string;
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

type LedgerInvoice = Ledgered<LedgerInvoiceRow>;

const upperRight = [18,17,16,15,14,13,12,11];
const upperLeft = [21,22,23,24,25,26,27,28];
const lowerRight = [48,47,46,45,44,43,42,41];
const lowerLeft = [31,32,33,34,35,36,37,38];

/** A visit-day payment is dated on the visit day (noon, so the day survives any timezone) */
const visitDateTime = (d: string) => (d && d !== new Date().toISOString().split("T")[0] ? `${d}T12:00:00.000Z` : new Date().toISOString());


export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [invoiceSummaryMap, setInvoiceSummaryMap] = useState<Record<number, PatientBilling>>({});
  const [ledgerInvoices, setLedgerInvoices] = useState<LedgerInvoice[]>([]);
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
  // Save errors per form: shown inside the form, which stays open with what was typed
  const [patientError, setPatientError] = useState("");
  const [visitError, setVisitError] = useState("");
  const [medicalError, setMedicalError] = useState("");
  const [apptError, setApptError] = useState("");
  const [activeTab, setActiveTab] = useState<"visits"|"chart"|"rx"|"appointments"|"medical">("visits");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [rxForm, setRxForm] = useState({ medicine: "", dosage: "", duration: "", visit_id: "" });
  const [rxError, setRxError] = useState("");
  const [rxLoading, setRxLoading] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [medicalForm, setMedicalForm] = useState({
    allergies: "", blood_group: "", medical_conditions: "",
    current_medications: "", previous_surgeries: "", notes: "",
  });
  const [appointmentForm, setAppointmentForm] = useState({
    date: todayISO(), time: "", treatment: "", notes: "",
  });
  const [visitForm, setVisitForm] = useState({
    doctor_name: "", treatment: "", notes: "", fee: "", fee_paid: "",
    visit_date: todayISO(), status: "Pending",
  });
  const [form, setForm] = useState({
    name: "", phone: "", address: "", age: "",
    gender: "Male", treatment: "", doctor_name: "",
    dob: "", cnic: "", email: "", blood_group: "", emergency_contact: "", guardian: "",
    fee_total: "", fee_paid: "",
  });
  const [prescriptionPresets, setPrescriptionPresets] = useState<{ id: string; group_name: string; medicine: string; dosage: string; frequency: string; duration: string; notes: string }[]>([]);
  const router = useRouter();
  const { symbol } = useCurrency();
  const { clinicId } = useClinic();

  const [listLoading, setListLoading] = useState(true);

  const fetchPatients = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: true });
    if (data) {
      setAllPatients(data);
      setPatients([...data].reverse());
    }
    setListLoading(false);
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
    const { data } = await supabase.from("medical_history").select("*").eq("patient_id", patientId).maybeSingle();
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

  // Every money figure on this page comes from the ledger (invoices + payments)
  const fetchInvoiceSummaries = async () => {
    try {
      const { invoices } = await loadLedger(createClient(), {
        clinicId,
        select: "id, patient_id, visit_id, status, subtotal, discount, total, amount_paid, due_date, created_at, notes",
      });
      setLedgerInvoices(invoices);
      setInvoiceSummaryMap(billingByPatient(invoices));
    } catch (e) {
      console.error("Could not load billing:", e);
    }
  };

  const invSummary = (patientId: number): PatientBilling => invoiceSummaryMap[patientId] ?? NO_BILLS;

  const registrationInvoice = (patientId: number) =>
    ledgerInvoices.find(i => i.patient_id === patientId && i.notes === REGISTRATION_NOTE && i.counted);
  const visitInvoice = (visitId: number) => ledgerInvoices.find(i => i.visit_id === visitId && i.counted);
  const visitBill = (v: Visit) => {
    const inv = visitInvoice(v.id);
    return inv
      ? { fee: inv.total, paid: inv.amount_paid, due: Math.max(0, inv.balance), status: inv.state }
      : { fee: 0, paid: 0, due: 0, status: "—" };
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
    fetchInvoiceSummaries();
  }, [router]);

  useEffect(() => {
    fetch("/api/presets?type=prescriptions")
      .then(r => r.json())
      .then(json => setPrescriptionPresets(json.data || []));
  }, []);

  const getClinicPatientNumber = (patientId: number) => {
    const index = allPatients.findIndex(p => p.id === patientId);
    return index + 1;
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", address: "", age: "", gender: "Male", treatment: "", doctor_name: "", dob: "", cnic: "", email: "", blood_group: "", emergency_contact: "", guardian: "", fee_total: "", fee_paid: "" });
    setSelectedTeeth([]);
    setShowForm(false);
    setEditingPatientId(null);
    setPatientError("");
  };

  const resetVisitForm = () => {
    setVisitForm({ doctor_name: "", treatment: "", notes: "", fee: "", fee_paid: "", visit_date: todayISO(), status: "Pending" });
    setVisitTeeth([]);
    setShowVisitForm(false);
    setEditingVisitId(null);
    setVisitError("");
  };

  const toggleTooth = (num: number) => {
    setSelectedTeeth(prev => prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]);
  };

  const toggleVisitTooth = (num: number) => {
    setVisitTeeth(prev => prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]);
  };

  /** Validate the patient form; returns an error message naming the problem, or null */
  const patientFormError = () => {
    const fee = readAmount(form.fee_total, "Fee");
    const paid = readAmount(form.fee_paid, "Fee paid");
    const age = readAmount(form.age, "Age");
    const cnic = form.cnic.trim();
    const email = form.email.trim();
    // CNIC: 13 digits, with or without the usual dashes (12345-1234567-1)
    const cnicOk = !cnic || /^\d{5}-?\d{7}-?\d$/.test(cnic);
    const emailOk = !email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    const dobFuture = form.dob && form.dob > todayISO();
    return firstError(
      !form.name.trim() && "Patient name is required.",
      !form.phone.trim() && "Phone number is required.",
      !cnicOk && "CNIC should be 13 digits, e.g. 12345-1234567-1.",
      !emailOk && "Please enter a valid email address.",
      dobFuture && "Date of birth can't be in the future.",
      age.error, fee.error, paid.error,
      paid.value > fee.value && "Fee paid can't be more than the fee.",
    );
  };

  const handleAdd = async () => {
    const invalid = patientFormError();
    if (invalid) { setPatientError(invalid); return; }
    const fee_total = parseInt(form.fee_total) || 0;
    const fee_paid = parseInt(form.fee_paid) || 0;
    setPatientError("");
    setLoading(true);
    const supabase = createClient();
    const status = fee_paid >= fee_total && fee_total > 0 ? "Paid" : fee_paid > 0 ? "Partial" : "Pending";

    // fee_total / fee_paid / status are kept only as a record of what was typed at registration;
    // the bill itself is the registration invoice below
    const row = {
      name: form.name.trim(), phone: form.phone.trim(), address: form.address,
      age: parseInt(form.age) || 0, gender: form.gender,
      dob: form.dob || null, cnic: form.cnic.trim() || null, email: form.email.trim() || null,
      blood_group: form.blood_group.trim() || null, emergency_contact: form.emergency_contact.trim() || null, guardian: form.guardian.trim() || null,
      treatment: form.treatment, tooth_number: selectedTeeth.join(", "),
      doctor_name: form.doctor_name, fee_total, fee_paid, status,
      clinic_id: clinicId,
    };
    // Older database without the new columns: insert without them so nothing breaks
    const stripNew = (r: Record<string, unknown>) => { const { dob, cnic, email, blood_group, emergency_contact, guardian, ...rest } = r; void dob; void cnic; void email; void blood_group; void emergency_contact; void guardian; return rest; };
    let { data: patient, error } = await supabase.from("patients").insert([{ ...row, ledger_migrated_at: new Date().toISOString() }]).select().single();
    if (error?.message.includes("ledger_migrated_at")) ({ data: patient, error } = await supabase.from("patients").insert([row]).select().single());
    if (error && /dob|cnic|email|blood_group|emergency_contact|guardian/.test(error.message)) ({ data: patient, error } = await supabase.from("patients").insert([{ ...stripNew(row), ledger_migrated_at: new Date().toISOString() }]).select().single());
    if (error || !patient) {
      setLoading(false);
      setPatientError(saveErrorMessage(error || { message: "no record came back" }, "patient"));
      return;
    }

    if (fee_total > 0) {
      const { id: invoiceId, error: invErr } = await createInvoice(supabase, {
        clinicId, patientId: patient.id, notes: REGISTRATION_NOTE,
        items: [{ description: form.treatment || "Registration / consultation", quantity: 1, unit_price: fee_total }],
      });
      if (invErr) alert(`Patient saved, but the invoice could not be created: ${invErr}`);
      if (invoiceId && fee_paid > 0) {
        const payErr = await recordPayment(supabase, { clinicId, invoiceId, patientId: patient.id, amount: fee_paid, note: "Paid at registration" });
        if (payErr) alert(`Patient saved, but the payment could not be recorded: ${payErr}`);
      }
    }

    resetForm();
    setLoading(false);
    fetchPatients();
    fetchInvoiceSummaries();
  };

  const handleEditPatient = async () => {
    if (!editingPatientId) return;
    const fee_total = parseInt(form.fee_total) || 0;
    const fee_paid = parseInt(form.fee_paid) || 0;
    const reg = registrationInvoice(editingPatientId);
    const invalid = firstError(
      patientFormError(),
      reg && fee_paid < reg.amount_paid &&
        `${symbol} ${reg.amount_paid.toLocaleString()} is already recorded as paid on the registration invoice. Payments stay in the payment history and can't be reduced here.`,
    );
    if (invalid) { setPatientError(invalid); return; }
    setPatientError("");
    setLoading(true);
    const supabase = createClient();

    const baseUpd = {
      name: form.name.trim(), phone: form.phone.trim(), address: form.address,
      age: parseInt(form.age) || 0, gender: form.gender,
      treatment: form.treatment, tooth_number: selectedTeeth.join(", "),
      doctor_name: form.doctor_name,
    };
    const newUpd = {
      dob: form.dob || null, cnic: form.cnic.trim() || null, email: form.email.trim() || null,
      blood_group: form.blood_group.trim() || null, emergency_contact: form.emergency_contact.trim() || null, guardian: form.guardian.trim() || null,
    };
    let { error } = await supabase.from("patients").update({ ...baseUpd, ...newUpd }).eq("id", editingPatientId);
    // Older database without the new columns: update only the base fields
    if (error && /dob|cnic|email|blood_group|emergency_contact|guardian/.test(error.message)) ({ error } = await supabase.from("patients").update(baseUpd).eq("id", editingPatientId));
    if (error) { setLoading(false); setPatientError(saveErrorMessage(error, "patient")); return; }

    let invoiceId = reg ? String(reg.id) : null;
    let billErr: string | null = null;
    if (reg && fee_total !== reg.total) {
      billErr = await setSingleItem(supabase, clinicId, String(reg.id), form.treatment || "Registration / consultation", fee_total);
    } else if (!reg && fee_total > 0) {
      ({ id: invoiceId, error: billErr } = await createInvoice(supabase, {
        clinicId, patientId: editingPatientId, notes: REGISTRATION_NOTE,
        items: [{ description: form.treatment || "Registration / consultation", quantity: 1, unit_price: fee_total }],
      }));
    }
    const extra = fee_paid - (reg?.amount_paid || 0);
    if (!billErr && invoiceId && extra > 0) {
      const payErr = await recordPayment(supabase, { clinicId, invoiceId, patientId: editingPatientId, amount: extra, note: "Paid at registration" });
      if (payErr) billErr = `the payment could not be recorded: ${payErr}`;
    }
    if (billErr) {
      // Patient details are saved; keep the form open so the fee can be saved again
      setLoading(false);
      fetchPatients();
      fetchInvoiceSummaries();
      setPatientError(`Patient details saved, but the registration fee was not: ${billErr}`);
      return;
    }

    resetForm();
    setLoading(false);
    fetchPatients();
    fetchInvoiceSummaries();
  };

  const openEditPatient = (p: Patient) => {
    setEditingPatientId(p.id);
    setPatientError("");
    setForm({
      name: p.name, phone: p.phone || "", address: p.address || "",
      age: p.age?.toString() || "", gender: p.gender || "Male",
      treatment: p.treatment || "", doctor_name: p.doctor_name || "",
      dob: p.dob || "", cnic: p.cnic || "", email: p.email || "",
      blood_group: p.blood_group || "", emergency_contact: p.emergency_contact || "", guardian: p.guardian || "",
      fee_total: registrationInvoice(p.id)?.total.toString() || "",
      fee_paid: registrationInvoice(p.id)?.amount_paid.toString() || "",
    });
    setSelectedTeeth(p.tooth_number ? p.tooth_number.split(", ").map(Number).filter(Boolean) : []);
    setShowForm(false);
  };

  /** Validate the visit form; returns an error message naming the problem, or null */
  const visitFormError = () => {
    const fee = readAmount(visitForm.fee, "Visit fee");
    const paid = readAmount(visitForm.fee_paid, "Fee paid");
    return firstError(
      fee.error, paid.error,
      paid.value > fee.value && "Fee paid can't be more than the visit fee.",
    );
  };

  const handleAddVisit = async () => {
    if (!selectedPatient) return;
    const invalid = visitFormError();
    if (invalid) { setVisitError(invalid); return; }
    const visitFee = parseInt(visitForm.fee) || 0;
    const visitFeePaid = parseInt(visitForm.fee_paid) || 0;
    setVisitError("");
    setLoading(true);
    const supabase = createClient();
    const visitStatus = visitFeePaid >= visitFee && visitFee > 0 ? "Paid" : visitFeePaid > 0 ? "Partial" : "Pending";

    const row = {
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      doctor_name: visitForm.doctor_name,
      treatment: visitForm.treatment,
      tooth_number: visitTeeth.join(", "),
      notes: visitForm.notes,
      fee: visitFee,
      fee_paid: visitFeePaid,
      visit_date: dateOrToday(visitForm.visit_date),
      status: visitStatus,
      clinic_id: clinicId,
    };
    const first = await supabase.from("visits").insert([{ ...row, ledger_migrated_at: new Date().toISOString() }]).select().single();
    const saved = first.error?.message.includes("ledger_migrated_at") ? await supabase.from("visits").insert([row]).select().single() : first;
    const visit = saved.data;
    if (saved.error || !visit) {
      setLoading(false);
      setVisitError(saveErrorMessage(saved.error || { message: "no record came back" }, "visit"));
      return;
    }

    // The visit fee is billed as its own invoice, linked to the visit
    if (visitFee > 0) {
      const { id: invoiceId, error: invErr } = await createInvoice(supabase, {
        clinicId, patientId: selectedPatient.id, visitId: visit.id, notes: VISIT_NOTE,
        items: [{ description: visitForm.treatment || "Visit", quantity: 1, unit_price: visitFee }],
      });
      if (invErr) alert(`Visit saved, but the invoice could not be created: ${invErr}`);
      if (invoiceId && visitFeePaid > 0) {
        const payErr = await recordPayment(supabase, { clinicId, invoiceId, patientId: selectedPatient.id, amount: visitFeePaid, date: visitDateTime(row.visit_date), note: "Paid at visit" });
        if (payErr) alert(`Visit saved, but the payment could not be recorded: ${payErr}`);
      }
    }

    resetVisitForm();
    setLoading(false);
    fetchVisits(selectedPatient.id);
    fetchInvoiceSummaries();
  };

  const handleEditVisit = async () => {
    if (!selectedPatient || !editingVisitId) return;
    const visitFee = parseInt(visitForm.fee) || 0;
    const visitFeePaid = parseInt(visitForm.fee_paid) || 0;
    const inv = visitInvoice(editingVisitId);
    const invalid = firstError(
      visitFormError(),
      inv && visitFeePaid < inv.amount_paid &&
        `${symbol} ${inv.amount_paid.toLocaleString()} is already recorded as paid for this visit. Payments stay in the payment history and can't be reduced here.`,
    );
    if (invalid) { setVisitError(invalid); return; }
    setVisitError("");
    setLoading(true);
    const supabase = createClient();
    const visitStatus = visitFeePaid >= visitFee && visitFee > 0 ? "Paid" : visitFeePaid > 0 ? "Partial" : "Pending";

    const { error } = await supabase.from("visits").update({
      doctor_name: visitForm.doctor_name,
      treatment: visitForm.treatment,
      tooth_number: visitTeeth.join(", "),
      notes: visitForm.notes,
      fee: visitFee,
      fee_paid: visitFeePaid,
      visit_date: dateOrToday(visitForm.visit_date),
      status: visitStatus,
    }).eq("id", editingVisitId);
    if (error) { setLoading(false); setVisitError(saveErrorMessage(error, "visit")); return; }

    let invoiceId = inv ? String(inv.id) : null;
    let billErr: string | null = null;
    if (inv && visitFee !== inv.total) {
      billErr = await setSingleItem(supabase, clinicId, String(inv.id), visitForm.treatment || "Visit", visitFee);
    } else if (!inv && visitFee > 0) {
      ({ id: invoiceId, error: billErr } = await createInvoice(supabase, {
        clinicId, patientId: selectedPatient.id, visitId: editingVisitId, notes: VISIT_NOTE,
        items: [{ description: visitForm.treatment || "Visit", quantity: 1, unit_price: visitFee }],
      }));
      await markMigrated(supabase, "visits", editingVisitId);
    }
    const extra = visitFeePaid - (inv?.amount_paid || 0);
    if (!billErr && invoiceId && extra > 0) {
      const payErr = await recordPayment(supabase, { clinicId, invoiceId, patientId: selectedPatient.id, amount: extra, note: "Paid at visit" });
      if (payErr) billErr = `the payment could not be recorded: ${payErr}`;
    }
    if (billErr) {
      setLoading(false);
      fetchVisits(selectedPatient.id);
      fetchInvoiceSummaries();
      setVisitError(`Visit details saved, but the visit fee was not: ${billErr}`);
      return;
    }

    resetVisitForm();
    setLoading(false);
    fetchVisits(selectedPatient.id);
    fetchInvoiceSummaries();
  };

  const openEditVisit = (v: Visit) => {
    setEditingVisitId(v.id);
    setVisitError("");
    setVisitForm({
      doctor_name: v.doctor_name || "",
      treatment: v.treatment || "",
      notes: v.notes || "",
      fee: visitBill(v).fee.toString(),
      fee_paid: visitBill(v).paid.toString(),
      visit_date: v.visit_date || new Date().toISOString().split("T")[0],
      status: v.status || "Pending",
    });
    setVisitTeeth(v.tooth_number ? v.tooth_number.split(", ").map(Number).filter(Boolean) : []);
    setShowVisitForm(true);
  };

  const handleDeleteVisit = async (v: Visit) => {
    const inv = visitInvoice(v.id);
    if (!selectedPatient || !confirm(inv ? "Delete this visit? Its invoice will be cancelled." : "Delete this visit?")) return;
    const supabase = createClient();
    // Cancelled invoices are left out of every total; the invoice number stays used
    if (inv) {
      const { error } = await supabase.from("invoices").update({ status: "cancelled", visit_id: null }).eq("id", inv.id);
      if (error) { alert(saveErrorMessage(error, "visit invoice")); return; }
    }
    const { error } = await supabase.from("visits").delete().eq("id", v.id);
    if (error) alert(saveErrorMessage(error, "visit").replace("save", "delete"));
    fetchVisits(selectedPatient.id);
    fetchInvoiceSummaries();
  };

  const handleVisitPayment = async (v: Visit) => {
    if (!selectedPatient) return;
    const inv = visitInvoice(v.id);
    if (!inv) return;
    const amount = prompt(`Additional payment for — ${v.treatment}:`, String(Math.max(0, inv.balance)));
    if (!amount) return;
    const extra = parseFloat(amount);
    if (!extra || extra <= 0) return;
    if (extra > inv.balance) { alert(`Only ${symbol} ${inv.balance.toLocaleString()} is due on this visit.`); return; }
    const err = await recordPayment(createClient(), { clinicId, invoiceId: String(inv.id), patientId: selectedPatient.id, amount: extra });
    if (err) alert(err);
    fetchInvoiceSummaries();
  };

  const handleSaveMedical = async () => {
    if (!selectedPatient) return;
    setLoading(true);
    setMedicalError("");
    const supabase = createClient();
    let error;
    if (medicalHistory) {
      ({ error } = await supabase.from("medical_history").update({
        allergies: medicalForm.allergies, blood_group: medicalForm.blood_group,
        medical_conditions: medicalForm.medical_conditions, current_medications: medicalForm.current_medications,
        previous_surgeries: medicalForm.previous_surgeries, notes: medicalForm.notes,
      }).eq("id", medicalHistory.id));
    } else {
      ({ error } = await supabase.from("medical_history").insert([{
        patient_id: selectedPatient.id, patient_name: selectedPatient.name, clinic_id: clinicId,
        allergies: medicalForm.allergies, blood_group: medicalForm.blood_group,
        medical_conditions: medicalForm.medical_conditions, current_medications: medicalForm.current_medications,
        previous_surgeries: medicalForm.previous_surgeries, notes: medicalForm.notes,
      }]));
    }
    setLoading(false);
    if (error) { setMedicalError(saveErrorMessage(error, "medical history")); return; }
    setShowMedicalForm(false);
    fetchMedicalHistory(selectedPatient.id);
  };

  const handleAddAppointment = async () => {
    if (!selectedPatient) return;
    if (!appointmentForm.time) { setApptError("Pick a time for the appointment."); return; }
    setLoading(true);
    setApptError("");
    const supabase = createClient();
    const { error } = await supabase.from("appointments").insert([{
      patient_id: selectedPatient.id, patient_name: selectedPatient.name,
      doctor_name: selectedPatient.doctor_name || "",
      date: dateOrToday(appointmentForm.date), time: appointmentForm.time,
      treatment: appointmentForm.treatment, notes: appointmentForm.notes,
      status: "Scheduled", clinic_id: clinicId,
    }]);
    if (error) { setLoading(false); setApptError(saveErrorMessage(error, "appointment")); return; }
    setAppointmentForm({ date: todayISO(), time: "", treatment: "", notes: "" });
    setShowAppointmentForm(false);
    setLoading(false);
    fetchAppointments(selectedPatient.id);
    setActiveTab("appointments");
  };

  const updateAppointmentStatus = async (apptId: number, newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", apptId);
    if (error) alert(saveErrorMessage(error, "appointment status"));
    if (selectedPatient) fetchAppointments(selectedPatient.id);
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
    // Settles the patient's open invoices oldest first, one payment row per invoice
    const err = await payPatientBalance(createClient(), {
      clinicId, patientId: payingPatient.id, amount, method: payForm.method, note: payForm.notes || null,
    });
    setPayLoading(false);
    if (err) { setPayError(err); return; }

    setPayingPatient(null);
    fetchInvoiceSummaries();
  };

  const fetchPrescriptions = async (patientId: number) => {
    const { data } = await createClient().from("prescriptions").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
    setPrescriptions(data || []);
  };

  const addPrescription = async () => {
    if (!selectedPatient) return;
    if (!rxForm.medicine.trim()) { setRxError("Medicine name is required."); return; }
    setRxLoading(true);
    setRxError("");
    const { error } = await createClient().from("prescriptions").insert([{
      clinic_id: clinicId, patient_id: selectedPatient.id,
      visit_id: rxForm.visit_id ? Number(rxForm.visit_id) : null,
      medicine: rxForm.medicine.trim(), dosage: rxForm.dosage.trim() || null, duration: rxForm.duration.trim() || null,
    }]);
    setRxLoading(false);
    // Clinical saves follow the same rule: a failed save shows an error, never a silent loss
    if (error) { setRxError(saveErrorMessage(error, "prescription")); return; }
    setRxForm({ medicine: "", dosage: "", duration: "", visit_id: "" });
    fetchPrescriptions(selectedPatient.id);
  };

  const deletePrescription = async (rx: Prescription) => {
    if (!selectedPatient || !confirm("Delete this prescription?")) return;
    const { error } = await createClient().from("prescriptions").delete().eq("id", rx.id);
    if (error) { alert(saveErrorMessage(error, "prescription").replace("save", "delete")); return; }
    fetchPrescriptions(selectedPatient.id);
  };

  // Tooth-wise chart history derived from visits (each entry links to its visit + master treatment)
  const chartEntries = visits.flatMap(v =>
    (v.tooth_number ? v.tooth_number.split(",").map(t => t.trim()).filter(Boolean) : ["—"]).map(tooth => ({
      tooth, treatment: v.treatment || "—", date: v.visit_date, doctor: v.doctor_name, notes: v.notes, visitId: v.id,
    }))
  ).sort((a, b) => (Number(a.tooth) || 999) - (Number(b.tooth) || 999) || String(b.date).localeCompare(String(a.date)));

  const openPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveTab("visits");
    setRxForm({ medicine: "", dosage: "", duration: "", visit_id: "" });
    setRxError("");
    fetchVisits(patient.id);
    fetchAppointments(patient.id);
    fetchMedicalHistory(patient.id);
    fetchPrescriptions(patient.id);
  };

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    getClinicPatientNumber(p.id).toString().includes(search)
  );

  const visitTotalFee = visits.reduce((s, v) => s + visitBill(v).fee, 0);
  const visitTotalPaid = visits.reduce((s, v) => s + visitBill(v).paid, 0);
  const visitTotalPending = visits.reduce((s, v) => s + visitBill(v).due, 0);

  const ToothBtn = ({ num, selected, onToggle }: { num: number; selected: number[]; onToggle: (n: number) => void }) => (
    <button type="button" onClick={() => onToggle(num)}
      className={`w-6 h-6 md:w-8 md:h-8 text-xs rounded border font-medium transition-colors ${
        selected.includes(num) ? "bg-brand-600 text-white border-brand-600" : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"
      }`}>
      {num}
    </button>
  );

  const ToothChart = ({ selected, onToggle }: { selected: number[]; onToggle: (n: number) => void }) => (
    <div className="p-3 md:p-4 border border-brand-100 rounded-xl bg-brand-50 overflow-x-auto md:col-span-2">
      <p className="text-xs font-semibold text-brand-700 mb-3">Select Tooth (FDI Numbering)</p>
      <div className="flex flex-col items-center gap-1 min-w-max mx-auto">
        <div className="flex gap-0.5 md:gap-1 items-center">
          <span className="text-xs text-brand-400 w-12 md:w-16 text-right">Upper R</span>
          <div className="flex gap-0.5 md:gap-1">{upperRight.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <div className="w-px h-6 md:h-8 bg-brand-300 mx-0.5 md:mx-1"></div>
          <div className="flex gap-0.5 md:gap-1">{upperLeft.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <span className="text-xs text-brand-400 w-12 md:w-16">Upper L</span>
        </div>
        <div className="w-full border-t border-brand-200 my-1"></div>
        <div className="flex gap-0.5 md:gap-1 items-center">
          <span className="text-xs text-brand-400 w-12 md:w-16 text-right">Lower R</span>
          <div className="flex gap-0.5 md:gap-1">{lowerRight.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <div className="w-px h-6 md:h-8 bg-brand-300 mx-0.5 md:mx-1"></div>
          <div className="flex gap-0.5 md:gap-1">{lowerLeft.map(n => <ToothBtn key={n} num={n} selected={selected} onToggle={onToggle} />)}</div>
          <span className="text-xs text-brand-400 w-12 md:w-16">Lower L</span>
        </div>
      </div>
      {selected.length > 0 && <p className="text-xs text-brand-600 mt-2 text-center">Selected: {selected.join(", ")}</p>}
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      status === "Paid" ? "bg-green-100 text-green-700" :
      status === "Partial" ? "bg-yellow-100 text-yellow-700" :
      status === "Completed" ? "bg-green-100 text-green-700" :
      status === "Scheduled" ? "bg-blue-100 text-blue-700" :
      status === "Cancelled" ? "bg-red-100 text-red-700" :
      status === "Overdue" ? "bg-red-100 text-red-700" :
      status === "—" ? "bg-gray-100 text-gray-500" :
      "bg-orange-100 text-orange-700"
    }`}>{status}</span>
  );

  const showAnyForm = showForm || !!editingPatientId;

  return (
    <div className="min-h-screen flex bg-brand-50">
      <Sidebar />
      <div className="animate-page flex-1 p-4 md:p-8 mt-14 md:mt-0">
        {showReceipt && receiptPatient && (
          <Receipt patient={receiptPatient} billing={invSummary(receiptPatient.id)} onClose={() => setShowReceipt(false)} />
        )}

        {selectedPatient ? (
          <div>
            <button onClick={() => setSelectedPatient(null)} className="text-brand-600 text-sm mb-4 hover:underline"><ArrowLeft className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Back to Patients</button>

            <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
              {medicalHistory && (medicalHistory.allergies?.trim() || medicalHistory.medical_conditions?.trim() || medicalHistory.blood_group?.trim()) && (
                <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700"><TriangleAlert className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Medical alert</p>
                  <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-red-800">
                    {medicalHistory.allergies?.trim() && <span><strong>Allergies:</strong> {medicalHistory.allergies}</span>}
                    {medicalHistory.medical_conditions?.trim() && <span><strong>Conditions:</strong> {medicalHistory.medical_conditions}</span>}
                    {medicalHistory.blood_group?.trim() && <span><strong>Blood group:</strong> {medicalHistory.blood_group}</span>}
                  </div>
                </div>
              )}
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg md:text-xl font-semibold text-brand-800">{selectedPatient.name}</h2>
                    <span className="text-xs text-brand-400 bg-brand-50 px-2 py-0.5 rounded-full">#{getClinicPatientNumber(selectedPatient.id)}</span>
                    <StatusBadge status={invSummary(selectedPatient.id).status} />
                  </div>
                  <p className="text-xs md:text-sm text-brand-500 mt-1">
                    {selectedPatient.phone} · {selectedPatient.gender} · {selectedPatient.age} yrs · {selectedPatient.address}
                  </p>
                  <p className="text-xs text-brand-400 mt-0.5">
                    Registered: {formatDate(selectedPatient.created_at)}
                  </p>
                  {(selectedPatient.dob || selectedPatient.cnic || selectedPatient.email || selectedPatient.blood_group || selectedPatient.emergency_contact || selectedPatient.guardian) && (
                    <p className="text-xs text-brand-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {selectedPatient.dob && <span>DOB: {formatDate(selectedPatient.dob)}</span>}
                      {selectedPatient.cnic && <span>CNIC: {selectedPatient.cnic}</span>}
                      {selectedPatient.email && <span><Mail className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{selectedPatient.email}</span>}
                      {selectedPatient.blood_group && <span>Blood: {selectedPatient.blood_group}</span>}
                      {selectedPatient.emergency_contact && <span>Emergency: {selectedPatient.emergency_contact}</span>}
                      {selectedPatient.guardian && <span>Guardian: {selectedPatient.guardian}</span>}
                    </p>
                  )}
                  {selectedPatient.treatment && (
                    <p className="text-xs text-brand-400 mt-0.5">
                      Initial: {selectedPatient.treatment} {selectedPatient.tooth_number ? `· Tooth: ${selectedPatient.tooth_number}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setReceiptPatient(selectedPatient); setShowReceipt(true); }} className="border border-brand-300 text-brand-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-brand-50"><Printer className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Receipt</button>
                  <button onClick={() => { setShowAppointmentForm(!showAppointmentForm); setShowVisitForm(false); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium">+ Appointment</button>
                  <button onClick={() => { resetVisitForm(); setShowVisitForm(!showVisitForm); setShowAppointmentForm(false); }} className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-xs font-medium">+ Visit</button>
                </div>
              </div>

              {(() => {
                const inv = invSummary(selectedPatient.id);
                return (
                  <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4">
                    <div className="bg-brand-50 rounded-lg p-2 md:p-3">
                      <p className="text-xs text-brand-600">Total Billed</p>
                      <p className="text-base md:text-lg font-semibold text-brand-800">{symbol} {inv.totalBilled.toLocaleString()}</p>
                      <p className="text-xs text-brand-400">{visits.length} visits</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 md:p-3">
                      <p className="text-xs text-green-600">Total Collected</p>
                      <p className="text-base md:text-lg font-semibold text-green-700">{symbol} {inv.totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 md:p-3">
                      <p className="text-xs text-orange-600">Still Pending</p>
                      <p className="text-base md:text-lg font-semibold text-orange-600">{symbol} {inv.outstanding.toLocaleString()}</p>
                    </div>
                    <div className="bg-brand-50 rounded-lg p-2 md:p-3">
                      <p className="text-xs text-brand-600">Last Visit</p>
                      <p className="text-sm font-semibold text-brand-800">{visits[0]?.visit_date ? formatDate(visits[0].visit_date) : "—"}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {showAppointmentForm && (
              <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-blue-100 mb-6">
                <h3 className="text-sm font-semibold text-blue-800 mb-4">New Appointment — {selectedPatient.name}</h3>
                <FormError message={apptError} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-brand-600 mb-1">Date</label>
                    <input type="date" value={appointmentForm.date} onChange={e => setAppointmentForm({...appointmentForm, date: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  </div>
                  <div>
                    <label className="block text-xs text-brand-600 mb-1">Time</label>
                    <input type="time" value={appointmentForm.time} onChange={e => setAppointmentForm({...appointmentForm, time: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  </div>
                  <TreatmentSelect value={appointmentForm.treatment} placeholder="Select treatment"
                    onPick={(name) => setAppointmentForm({ ...appointmentForm, treatment: name })} />
                  <input placeholder="Notes (optional)" value={appointmentForm.notes} onChange={e => setAppointmentForm({...appointmentForm, notes: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleAddAppointment} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{loading ? "Saving..." : "Book Appointment"}</button>
                  <button onClick={() => setShowAppointmentForm(false)} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            {showVisitForm && (
              <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
                <h3 className="text-sm font-semibold text-brand-800 mb-4">{editingVisitId ? "Edit Visit" : "New Visit"} — {selectedPatient.name}</h3>
                <FormError message={visitError} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-brand-600 mb-1">Visit Date</label>
                    <input type="date" value={visitForm.visit_date} onChange={e => setVisitForm({...visitForm, visit_date: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  </div>
                  <select value={visitForm.doctor_name} onChange={e => setVisitForm({...visitForm, doctor_name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.name}>{doctorName(d.name)}</option>)}
                  </select>
                  <div>
                    <TreatmentSelect value={visitForm.treatment} placeholder="Select treatment done"
                      onPick={(name, fee) => setVisitForm(f => ({ ...f, treatment: name, fee: f.fee || (fee ? String(fee) : "") }))} />
                  </div>
                  <input placeholder={`Visit Fee (${symbol})`} type="number" value={visitForm.fee} onChange={e => setVisitForm({...visitForm, fee: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <input placeholder={`Fee Paid Now (${symbol})`} type="number" value={visitForm.fee_paid} onChange={e => setVisitForm({...visitForm, fee_paid: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <div className="md:col-span-2">
                    <input placeholder="Notes / Prescription" value={visitForm.notes} onChange={e => setVisitForm({...visitForm, notes: e.target.value})} className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
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
                          <p className="text-xs text-brand-500 font-medium">Quick Prescription Presets:</p>
                          {Object.entries(rxGroups).map(([groupName, meds]) => (
                            <div key={groupName} className="border border-brand-100 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between bg-brand-50 px-3 py-1.5">
                                <span className="text-xs font-semibold text-brand-700">{groupName}</span>
                                <button
                                  type="button"
                                  onClick={() => appendNotes(meds.map(formatRx).join("\n"))}
                                  className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-brand-700"
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
                                    className="text-xs px-2.5 py-1 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors"
                                  >
                                    + {rx.medicine}
                                    {rx.dosage && <span className="text-brand-400 ml-1">{rx.dosage}</span>}
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
                  <div className="mt-3 bg-brand-50 rounded-lg px-4 py-2 flex justify-between items-center">
                    <span className="text-xs text-brand-600">This visit remaining:</span>
                    <span className="text-sm font-semibold text-orange-600">{symbol} {(parseInt(visitForm.fee) || 0) - (parseInt(visitForm.fee_paid) || 0)}</span>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={editingVisitId ? handleEditVisit : handleAddVisit} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{loading ? "Saving..." : editingVisitId ? "Update Visit" : "Save Visit"}</button>
                  <button onClick={resetVisitForm} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
              <div className="flex border-b border-brand-100 overflow-x-auto">
                <button onClick={() => setActiveTab("visits")} className={`flex-1 py-3 text-xs md:text-sm font-medium whitespace-nowrap px-2 ${activeTab === "visits" ? "bg-brand-50 text-brand-800 border-b-2 border-brand-600" : "text-brand-500"}`}>
                  Visits ({visits.length})
                </button>
                <button onClick={() => setActiveTab("chart")} className={`flex-1 py-3 text-xs md:text-sm font-medium whitespace-nowrap px-2 ${activeTab === "chart" ? "bg-brand-50 text-brand-800 border-b-2 border-brand-600" : "text-brand-500"}`}>
                  Chart ({chartEntries.length})
                </button>
                <button onClick={() => setActiveTab("rx")} className={`flex-1 py-3 text-xs md:text-sm font-medium whitespace-nowrap px-2 ${activeTab === "rx" ? "bg-brand-50 text-brand-800 border-b-2 border-brand-600" : "text-brand-500"}`}>
                  Rx ({prescriptions.length})
                </button>
                <button onClick={() => setActiveTab("appointments")} className={`flex-1 py-3 text-xs md:text-sm font-medium whitespace-nowrap px-2 ${activeTab === "appointments" ? "bg-blue-50 text-blue-800 border-b-2 border-blue-600" : "text-brand-500"}`}>
                  Appointments ({appointments.length})
                </button>
                <button onClick={() => setActiveTab("medical")} className={`flex-1 py-3 text-xs md:text-sm font-medium whitespace-nowrap px-2 ${activeTab === "medical" ? "bg-red-50 text-red-800 border-b-2 border-red-400" : "text-brand-500"}`}>
                  Medical
                </button>
              </div>

              {activeTab === "visits" && (
                <div>
                  {visits.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-brand-400 text-sm mb-1">No visits recorded yet</p>
                      <p className="text-brand-300 text-xs">Click "+ Visit" to add first visit</p>
                    </div>
                  ) : (
                    visits.map((v, i) => (
                      <div key={v.id} className="px-4 md:px-5 py-4 border-b border-brand-50 hover:bg-brand-50">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-sm font-semibold text-brand-800">Visit {visits.length - i}</p>
                              <StatusBadge status={visitBill(v).status} />
                              <span className="text-xs text-brand-400 bg-brand-50 px-2 py-0.5 rounded-full">
                                <Calendar className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{formatDate(v.visit_date)}
                              </span>
                            </div>
                            <p className="text-sm text-brand-700">{v.treatment}</p>
                            <p className="text-xs text-brand-500 mt-0.5">
                              {doctorName(v.doctor_name) || "—"} {v.tooth_number ? `· Tooth: ${v.tooth_number}` : ""}
                            </p>
                            {v.notes && <p className="text-xs text-brand-400 mt-1 italic">{v.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-brand-800">{symbol} {visitBill(v).fee.toLocaleString()}</p>
                            <p className="text-xs text-green-600">Paid: {symbol} {visitBill(v).paid.toLocaleString()}</p>
                            <p className="text-xs text-orange-500">Due: {symbol} {visitBill(v).due.toLocaleString()}</p>
                            <div className="flex gap-2 mt-1 justify-end">
                              {visitBill(v).due > 0 && (
                                <button onClick={() => handleVisitPayment(v)} className="text-brand-600 text-xs font-medium hover:underline">Pay</button>
                              )}
                              <button aria-label="Edit" title="Edit" onClick={() => openEditVisit(v)} className="text-brand-600 text-xs font-medium"><Pencil className="inline h-4 w-4" aria-hidden="true" /></button>
                              <button aria-label="Delete" title="Delete" onClick={() => handleDeleteVisit(v)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {visits.length > 0 && (
                    <div className="px-4 py-3 bg-brand-50 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-xs font-semibold text-brand-700">All visits total</span>
                      <div className="flex gap-4 flex-wrap">
                        <span className="text-xs text-brand-700">Billed: <strong>{symbol} {visitTotalFee.toLocaleString()}</strong></span>
                        <span className="text-xs text-green-700">Paid: <strong>{symbol} {visitTotalPaid.toLocaleString()}</strong></span>
                        <span className="text-xs text-orange-600">Pending: <strong>{symbol} {visitTotalPending.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "chart" && (
                <div className="p-4 md:p-5">
                  {chartEntries.length === 0 ? (
                    <p className="text-center py-10 text-sm text-brand-400">No charted work yet. Record a visit with a tooth and treatment.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-brand-500 mb-2">Tooth-wise history of work done, newest first per tooth.</p>
                      {chartEntries.map((e, i) => (
                        <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-semibold">{e.tooth}</span>
                            <div>
                              <p className="text-sm font-medium text-brand-800">{e.treatment}</p>
                              <p className="text-xs text-brand-400">{doctorName(e.doctor) || "—"}{e.notes ? ` · ${e.notes}` : ""}</p>
                            </div>
                          </div>
                          <span className="text-xs text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full"><Calendar className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{formatDate(e.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "rx" && (
                <div className="p-4 md:p-5">
                  <div className="mb-4 rounded-lg border border-brand-100 p-3">
                    <p className="text-xs font-semibold text-brand-700 mb-2">Add prescription</p>
                    <FormError message={rxError} />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input placeholder="Medicine *" value={rxForm.medicine} onChange={e => setRxForm({ ...rxForm, medicine: e.target.value })} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold md:col-span-2" />
                      <input placeholder="Dosage (e.g. 500mg 2×/day)" value={rxForm.dosage} onChange={e => setRxForm({ ...rxForm, dosage: e.target.value })} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                      <input placeholder="Duration (e.g. 5 days)" value={rxForm.duration} onChange={e => setRxForm({ ...rxForm, duration: e.target.value })} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                      <select value={rxForm.visit_id} onChange={e => setRxForm({ ...rxForm, visit_id: e.target.value })} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold md:col-span-3">
                        <option value="">Link to a visit (optional)</option>
                        {visits.map(v => <option key={v.id} value={v.id}>{formatDate(v.visit_date)} — {v.treatment || "Visit"}</option>)}
                      </select>
                      <button onClick={addPrescription} disabled={rxLoading} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{rxLoading ? "Saving…" : "Add"}</button>
                    </div>
                  </div>
                  {prescriptions.length === 0 ? (
                    <p className="text-center py-8 text-sm text-brand-400">No prescriptions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {prescriptions.map(rx => {
                        const v = visits.find(x => x.id === rx.visit_id);
                        return (
                          <div key={rx.id} className="flex items-start justify-between gap-2 rounded-lg border border-brand-100 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-brand-800">{rx.medicine} {rx.dosage && <span className="text-brand-500 font-normal">· {rx.dosage}</span>} {rx.duration && <span className="text-brand-400 font-normal">· {rx.duration}</span>}</p>
                              <p className="text-xs text-brand-400">{formatDate(rx.created_at)}{v ? ` · from visit ${formatDate(v.visit_date)}${v.treatment ? ` (${v.treatment})` : ""}` : ""}</p>
                            </div>
                            <button aria-label="Delete" title="Delete" onClick={() => deletePrescription(rx)} className="text-red-400 text-xs font-medium"><Trash2 className="inline h-4 w-4" aria-hidden="true" /></button>
                          </div>
                        );
                      })}
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
                      <div key={a.id} className="px-4 md:px-5 py-4 border-b border-brand-50 hover:bg-blue-50">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-800">Appointment {i + 1} — {a.treatment || "General"}</p>
                            <p className="text-xs text-brand-500 mt-0.5"><Calendar className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{formatDate(a.date)} · <Clock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{a.time}</p>
                            {a.notes && <p className="text-xs text-brand-400 mt-1">{a.notes}</p>}
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <StatusBadge status={effectiveApptStatus(a)} />
                            {effectiveApptStatus(a) === "Scheduled" && (
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => updateAppointmentStatus(a.id, "Completed")} className="text-green-600 text-xs font-medium"><Check className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Done</button>
                                <button onClick={() => updateAppointmentStatus(a.id, "Cancelled")} className="text-red-500 text-xs font-medium"><X className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Cancel</button>
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
                    <h3 className="text-sm font-semibold text-brand-800">Medical History</h3>
                    <button onClick={() => setShowMedicalForm(!showMedicalForm)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                      {medicalHistory ? <><Pencil className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />Edit</> : "+ Add"}
                    </button>
                  </div>
                  {showMedicalForm && (
                    <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-100">
                      <FormError message={medicalError} />
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
                      <div className="bg-brand-50 rounded-lg p-3 border border-brand-100">
                        <p className="text-xs font-semibold text-brand-700 mb-1">Medical Conditions</p>
                        <p className="text-sm text-brand-800">{medicalHistory.medical_conditions || "None recorded"}</p>
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
                        <div className="bg-brand-50 rounded-lg p-3 border border-brand-100">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Additional Notes</p>
                          <p className="text-sm text-brand-800">{medicalHistory.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-brand-400 text-sm mb-3">No medical history recorded yet</p>
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
                <h2 className="text-xl md:text-2xl font-semibold text-brand-800">Patients</h2>
                <p className="text-sm text-brand-600 mt-1">Total: {patients.length} patients</p>
              </div>
              <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-medium">+ Add Patient</button>
            </div>

            <div className="mb-5">
              <input placeholder="Search by name or patient number..." value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-brand-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold bg-white" />
            </div>

            {showAnyForm && (
              <div className="form-panel bg-white rounded-xl p-4 md:p-6 border border-brand-100 mb-6">
                <h3 className="text-sm font-semibold text-brand-800 mb-4">{editingPatientId ? "Edit Patient" : "New Patient"}</h3>
                <FormError message={patientError} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                  <input placeholder="Full Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <input placeholder="Phone Number *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <input placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <input placeholder="Age" type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                    <option>Male</option><option>Female</option>
                  </select>
                  <select value={form.doctor_name} onChange={e => setForm({...form, doctor_name: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                    <option value="">Select Doctor</option>
                    {doctors.map(d => <option key={d.id} value={d.name}>{doctorName(d.name)}</option>)}
                  </select>
                  <div className="md:col-span-2">
                    <TreatmentSelect value={form.treatment} placeholder="Initial treatment"
                      onPick={(name, fee) => setForm(f => ({ ...f, treatment: name, fee_total: f.fee_total || (fee ? String(fee) : "") }))} />
                  </div>
                  <label className="block text-xs text-brand-500">Date of birth
                    <input type="date" value={form.dob} max={todayISO()} onChange={e => setForm({...form, dob: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold w-full mt-1" />
                  </label>
                  <input placeholder="CNIC (e.g. 12345-1234567-1)" value={form.cnic} onChange={e => setForm({...form, cnic: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <select value={form.blood_group} onChange={e => setForm({...form, blood_group: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold">
                    <option value="">Blood group</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                  <input placeholder="Emergency contact" value={form.emergency_contact} onChange={e => setForm({...form, emergency_contact: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <input placeholder="Guardian / next of kin" value={form.guardian} onChange={e => setForm({...form, guardian: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                </div>
                <ToothChart selected={selectedTeeth} onToggle={toggleTooth} />
                <div className="grid grid-cols-2 gap-3 md:gap-4 mt-4">
                  <input placeholder="Initial Fee" type="number" value={form.fee_total} onChange={e => setForm({...form, fee_total: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                  <input placeholder="Fee Paid" type="number" value={form.fee_paid} onChange={e => setForm({...form, fee_paid: e.target.value})} className="border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold" />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={editingPatientId ? handleEditPatient : handleAdd} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">{loading ? "Saving..." : editingPatientId ? "Update Patient" : "Save Patient"}</button>
                  <button onClick={resetForm} className="border border-brand-200 text-brand-700 px-5 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
              {/* Mobile */}
              <div className="md:hidden divide-y divide-brand-50">
                {listLoading ? (
                  <div className="p-3"><SkeletonRows rows={5} label="Loading patients" /></div>
                ) : filteredPatients.length === 0 ? (
                  <EmptyState icon={Users} title="No patients found" hint="Try a different search, or add your first patient." />
                ) : (
                  filteredPatients.map(p => (
                    <div key={p.id} className="p-4">
                      <div className="flex justify-between items-start mb-1" onClick={() => openPatient(p)}>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-brand-800 text-sm">{p.name}</p>
                            <span className="text-xs text-brand-300">#{getClinicPatientNumber(p.id)}</span>
                          </div>
                          <p className="text-xs text-brand-400">{p.phone} · {p.gender} · {p.age}y</p>
                          <p className="text-xs text-brand-300">{formatDate(p.created_at)}</p>
                        </div>
                        <StatusBadge status={invSummary(p.id).status} />
                      </div>
                      <p className="text-xs text-brand-600 mb-1" onClick={() => openPatient(p)}>{p.treatment} {p.doctor_name ? `· ${doctorName(p.doctor_name)}` : ""}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-brand-500">
                          Billed: {symbol} {invSummary(p.id).totalBilled.toLocaleString()} · Paid: {symbol} {invSummary(p.id).totalPaid.toLocaleString()}
                          {invSummary(p.id).outstanding > 0 && <span className="text-orange-500"> · Due: {symbol} {invSummary(p.id).outstanding.toLocaleString()}</span>}
                        </p>
                        <div className="flex gap-2">
                          <button aria-label="Print" title="Print" onClick={() => { setReceiptPatient(p); setShowReceipt(true); }} className="text-brand-600 text-xs"><Printer className="inline h-4 w-4" aria-hidden="true" /></button>
                          <button aria-label="Edit" title="Edit" onClick={() => openEditPatient(p)} className="text-brand-600 text-xs font-medium"><Pencil className="inline h-4 w-4" aria-hidden="true" /></button>
                          <button onClick={() => router.push(`/dashboard/patients/${p.id}`)} className="text-purple-600 text-xs font-medium">History</button>
                          {invSummary(p.id).outstanding > 0 && (
                            <button onClick={() => openPayModal(p)} className="text-white bg-brand-600 hover:bg-brand-700 text-xs font-medium px-2 py-1 rounded-lg">Pay</button>
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
                  <thead className="bg-brand-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">#</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Name</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Registered</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Doctor</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Treatment</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Total Fee</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Paid</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Remaining</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-brand-700 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listLoading ? (
                      <tr><td colSpan={10}><div className="p-3"><SkeletonRows rows={5} label="Loading patients" /></div></td></tr>
                    ) : filteredPatients.length === 0 ? (
                      <tr><td colSpan={10}><EmptyState icon={Users} title="No patients found" hint="Try a different search, or add your first patient." /></td></tr>
                    ) : (
                      filteredPatients.map(p => (
                        <tr key={p.id} className="border-t border-brand-50 hover:bg-brand-50">
                          <td className="px-4 py-3 text-brand-400 text-xs cursor-pointer" onClick={() => openPatient(p)}>#{getClinicPatientNumber(p.id)}</td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => openPatient(p)}>
                            <p className="font-medium text-brand-800">{p.name}</p>
                            <p className="text-xs text-brand-400">{p.phone} · {p.gender} · {p.age}y</p>
                          </td>
                          <td className="px-4 py-3 text-brand-500 text-xs cursor-pointer" onClick={() => openPatient(p)}>
                            {formatDate(p.created_at)}
                          </td>
                          <td className="px-4 py-3 text-brand-700 cursor-pointer" onClick={() => openPatient(p)}>{doctorName(p.doctor_name) || "-"}</td>
                          <td className="px-4 py-3 text-brand-700 cursor-pointer" onClick={() => openPatient(p)}>{p.treatment}</td>
                          <td className="px-4 py-3 text-brand-700 cursor-pointer" onClick={() => openPatient(p)}>{symbol} {invSummary(p.id).totalBilled.toLocaleString()}</td>
                          <td className="px-4 py-3 text-green-700 cursor-pointer" onClick={() => openPatient(p)}>{symbol} {invSummary(p.id).totalPaid.toLocaleString()}</td>
                          <td className="px-4 py-3 text-orange-600 cursor-pointer font-medium" onClick={() => openPatient(p)}>{symbol} {invSummary(p.id).outstanding.toLocaleString()}</td>
                          <td className="px-4 py-3 cursor-pointer" onClick={() => openPatient(p)}><StatusBadge status={invSummary(p.id).status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button aria-label="Print" title="Print" onClick={() => { setReceiptPatient(p); setShowReceipt(true); }} className="text-brand-600 text-xs font-medium"><Printer className="inline h-4 w-4" aria-hidden="true" /></button>
                              <button aria-label="Edit" title="Edit" onClick={() => openEditPatient(p)} className="text-brand-600 text-xs font-medium"><Pencil className="inline h-4 w-4" aria-hidden="true" /></button>
                              <button onClick={() => router.push(`/dashboard/patients/${p.id}`)} className="text-purple-600 text-xs font-semibold hover:underline">History</button>
                              {invSummary(p.id).outstanding > 0 && (
                                <button onClick={() => openPayModal(p)} className="text-white bg-brand-600 hover:bg-brand-700 text-xs font-medium px-2 py-1 rounded-lg">Pay</button>
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
        <div className="fixed inset-0 modal-backdrop bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-brand-800 mb-1">Record Payment</h3>
            <p className="text-xs text-brand-500 mb-4">{payingPatient.name} · Balance: {symbol} {invSummary(payingPatient.id).outstanding.toLocaleString()}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-brand-600 mb-1 block">Amount *</label>
                <input
                  type="number" min="0" step="0.01"
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-brand-600 mb-1 block">Payment Method</label>
                <select
                  value={payForm.method}
                  onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                  className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                >
                  {["Cash", "Card", "Bank Transfer", "Other"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-brand-600 mb-1 block">Notes (optional)</label>
                <input
                  value={payForm.notes}
                  onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Any notes..."
                  className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                />
              </div>
              {payError && <p className="text-red-500 text-xs">{payError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleQuickPayment}
                  disabled={payLoading}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                >
                  {payLoading ? "Saving..." : "Confirm Payment"}
                </button>
                <button
                  onClick={() => setPayingPatient(null)}
                  className="flex-1 border border-brand-200 text-brand-700 py-2.5 rounded-xl text-sm"
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