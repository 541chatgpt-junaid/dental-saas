import { NextResponse } from "next/server";
import { adminClient, verifySuperAdmin } from "@/lib/superAdmin";
import { invalidateClinic } from "@/lib/clinicCache";

// GET — list all clinics with counts
export async function GET() {
  const uid = await verifySuperAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const admin = adminClient();
  const { data: clinics } = await admin
    .from("clinics")
    .select("*")
    .order("created_at", { ascending: false });

  if (!clinics) return NextResponse.json([]);

  const enriched = await Promise.all(
    clinics.map(async (clinic) => {
      const [{ count: patientCount }, { count: visitCount }] = await Promise.all([
        admin.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinic.id),
        admin.from("visits").select("*", { count: "exact", head: true }).eq("clinic_id", clinic.id),
      ]);
      return { ...clinic, patient_count: patientCount ?? 0, visit_count: visitCount ?? 0 };
    })
  );

  return NextResponse.json(enriched);
}

// POST — create new clinic
export async function POST(request: Request) {
  const uid = await verifySuperAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { name, email, phone, address, adminPassword } = await request.json();
  if (!name || !email || !adminPassword)
    return NextResponse.json({ error: "Name, email and admin password are required." }, { status: 400 });

  const admin = adminClient();

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email, password: adminPassword, email_confirm: true,
    user_metadata: { name },
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .insert([{ name, email, phone, address }])
    .select()
    .single();
  if (clinicErr) return NextResponse.json({ error: clinicErr.message }, { status: 400 });

  await admin.from("staff").insert([{
    name, email, role: "admin", status: "Active",
    permissions: "Dashboard,Patients,Appointments,Queue,Treatment Plans,Recalls,Doctors,Commissions,Lab Records,Billing,Materials,Purchases,Expenses,Reports,Staff,Settings",
    user_id: authUser.user.id,
    clinic_id: clinic.id,
  }]);

  return NextResponse.json({ success: true, clinic });
}

// PATCH — toggle clinic is_active
export async function PATCH(request: Request) {
  const uid = await verifySuperAdmin();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { clinicId, is_active } = await request.json();
  const admin = adminClient();
  const { error } = await admin.from("clinics").update({ is_active }).eq("id", clinicId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  invalidateClinic(clinicId);
  return NextResponse.json({ success: true });
}
