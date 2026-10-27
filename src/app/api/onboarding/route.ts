import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/serverUser";
import { invalidateClinic } from "@/lib/clinicCache";
import { clean } from "@/lib/formInput";
import { WEEKDAYS } from "@/lib/weekdays";
import { SAMPLE_APPOINTMENTS, SAMPLE_PATIENTS, addDays } from "@/lib/sampleData";

// The 3-step setup wizard for a new clinic, and removal of its sample data.
// Only the clinic owner (role "admin") may use it; the clinic always comes
// from the signed-in user, never from the request.

const CURRENCIES = ["PKR", "USD", "AED", "GBP", "EUR", "SAR", "CAD", "AUD"];
const TIME_RE = /^\d{2}:\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function owner() {
  const user = await currentUser();
  if (!user) return null;
  const db = admin();
  const { data } = await db.from("staff").select("clinic_id, role").eq("user_id", user.id).maybeSingle();
  const role = String(data?.role || "").toLowerCase();
  if (!data?.clinic_id || (role !== "admin" && role !== "superadmin")) return null;
  return { db, clinicId: data.clinic_id as string, email: user.email ?? "" };
}

async function sampleCount(db: ReturnType<typeof admin>, clinicId: string) {
  const { count } = await db.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("is_sample", true);
  return count ?? 0;
}

// GET — does this clinic still need the wizard, what to prefill, how much sample data is there
export async function GET() {
  const o = await owner();
  if (!o) return NextResponse.json({ needed: false, sampleCount: 0 });
  const { db, clinicId, email } = o;
  const [{ data: clinic }, { data: settings }, samples] = await Promise.all([
    db.from("clinics").select("name, email, phone, address, onboarding_completed_at").eq("id", clinicId).maybeSingle(),
    db.from("settings").select("clinic_name, clinic_email, clinic_phone, clinic_address, currency").eq("clinic_id", clinicId).limit(1).maybeSingle(),
    sampleCount(db, clinicId),
  ]);
  return NextResponse.json({
    needed: !!clinic && !clinic.onboarding_completed_at,
    sampleCount: samples,
    profile: {
      clinic_name: settings?.clinic_name || clinic?.name || "",
      clinic_phone: settings?.clinic_phone || clinic?.phone || "",
      clinic_address: settings?.clinic_address || clinic?.address || "",
      clinic_email: settings?.clinic_email || clinic?.email || email,
      currency: settings?.currency || "",
    },
  });
}

export async function POST(request: Request) {
  const o = await owner();
  if (!o) return fail("Not allowed.", 403);
  const { db, clinicId } = o;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request.");

  // Step 1 — clinic details (the same fields as Settings)
  if (body.step === "profile") {
    const name = clean(body.clinic_name, 120);
    if (!name) return fail("Clinic name is required.");
    const phone = clean(body.clinic_phone, 30), address = clean(body.clinic_address, 200);
    const currency = CURRENCIES.includes(body.currency) ? body.currency : null;
    const { data: clinic } = await db.from("clinics").select("email").eq("id", clinicId).maybeSingle();
    const row = { clinic_name: name, clinic_phone: phone, clinic_address: address, clinic_email: clinic?.email ?? o.email, currency };
    const { data: existing } = await db.from("settings").select("id").eq("clinic_id", clinicId).limit(1).maybeSingle();
    const { error } = existing
      ? await db.from("settings").update(row).eq("id", existing.id)
      : await db.from("settings").insert([{ ...row, clinic_id: clinicId }]);
    if (error) return fail("Could not save your clinic details. Please try again.", 500);
    await db.from("clinics").update({ name, phone: phone || null, address: address || null }).eq("id", clinicId);
    invalidateClinic(clinicId);
    return NextResponse.json({ success: true });
  }

  // Step 2 — the first doctor, with working days
  if (body.step === "doctor") {
    const name = clean(body.name, 100);
    if (!name) return fail("Doctor name is required.");
    const days = (Array.isArray(body.working_days) ? body.working_days : []).filter((d: unknown) => WEEKDAYS.includes(d as string));
    if (!days.length) return fail("Choose at least one working day.");
    const start = TIME_RE.test(body.timing_start) ? body.timing_start : "09:00";
    const end = TIME_RE.test(body.timing_end) ? body.timing_end : "17:00";
    if (end <= start) return fail("End time must be after start time.");
    const { error } = await db.from("doctors").insert([{
      clinic_id: clinicId, name, specialization: clean(body.specialization, 100), status: "Active",
      timing_start: start, timing_end: end, working_days: WEEKDAYS.filter(d => days.includes(d)).join(", "),
    }]);
    if (error) return fail("Could not save the doctor. Please try again.", 500);
    return NextResponse.json({ success: true });
  }

  // Step 3 — optionally load sample data, then mark the wizard finished
  if (body.step === "finish") {
    let loaded = 0;
    if (body.sample === true && ISO_RE.test(body.today) && (await sampleCount(db, clinicId)) === 0) {
      const { data: doctor } = await db.from("doctors").select("name").eq("clinic_id", clinicId).eq("status", "Active").order("id").limit(1).maybeSingle();
      const { data: patients, error } = await db.from("patients")
        .insert(SAMPLE_PATIENTS.map(p => ({ ...p, clinic_id: clinicId, status: "Pending", doctor_name: doctor?.name ?? "", is_sample: true })))
        .select("id, name, phone");
      if (error || !patients?.length) return fail("Could not add the sample data. Please try again.", 500);
      loaded = patients.length;
      const { error: apptErr } = await db.from("appointments").insert(SAMPLE_APPOINTMENTS.map(([offset, time], i) => ({
        clinic_id: clinicId, patient_id: patients[i % patients.length].id, patient_name: patients[i % patients.length].name,
        phone: patients[i % patients.length].phone, doctor_name: doctor?.name ?? "", date: addDays(body.today, offset), time,
        treatment: SAMPLE_PATIENTS[i % patients.length].treatment, status: "Scheduled", notes: "Sample appointment", is_sample: true,
      })));
      if (apptErr) return fail("Could not add the sample appointments. Please try again.", 500);
    }
    const { error } = await db.from("clinics").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", clinicId);
    if (error) return fail("Could not finish the setup. Please try again.", 500);
    return NextResponse.json({ success: true, loaded });
  }

  return fail("Invalid request.");
}

// DELETE — remove the sample data (and anything attached to the sample patients)
export async function DELETE() {
  const o = await owner();
  if (!o) return fail("Not allowed.", 403);
  const { db, clinicId } = o;
  const { data: rows } = await db.from("patients").select("id").eq("clinic_id", clinicId).eq("is_sample", true);
  const ids = (rows ?? []).map(r => r.id as number);
  if (!ids.length) return NextResponse.json({ success: true, removed: 0 });

  // Invoices block patient deletion; their items and payments go with them
  const tables = ["invoices", "visits", "prescriptions", "medical_history", "appointments"];
  for (const table of tables) {
    const { error } = await db.from(table).delete().eq("clinic_id", clinicId).in("patient_id", ids);
    if (error && !/does not exist|schema cache/i.test(error.message)) return fail(`Could not remove the sample ${table.replace("_", " ")}.`, 500);
  }
  await db.from("appointments").delete().eq("clinic_id", clinicId).eq("is_sample", true);
  const { error } = await db.from("patients").delete().eq("clinic_id", clinicId).in("id", ids);
  if (error) return fail("Could not remove the sample patients.", 500);
  return NextResponse.json({ success: true, removed: ids.length });
}
