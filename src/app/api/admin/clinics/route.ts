import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifySuperAdmin(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = adminClient();
  const { data } = await admin
    .from("staff")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return data?.role === "superadmin" ? user.id : null;
}

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
    return NextResponse.json({ error: "name, email and adminPassword required" }, { status: 400 });

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
    permissions: "Dashboard,Patients,Appointments,Doctors,Lab Records,Materials,Expenses,Reports,Staff,Settings",
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
  await admin.from("clinics").update({ is_active }).eq("id", clinicId);
  return NextResponse.json({ success: true });
}
