import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { clinicName, email, password, phone, address } = await request.json();

  if (!clinicName || !email || !password)
    return NextResponse.json({ error: "Clinic name, email and password are required." }, { status: 400 });

  if (password.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: clinicName },
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

  const userId = authData.user.id;

  // 2. Create clinic record
  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .insert([{ name: clinicName, email, phone, address }])
    .select()
    .single();
  if (clinicErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: clinicErr.message }, { status: 400 });
  }

  // 3. Create admin staff record linking user to clinic
  const { error: staffErr } = await admin.from("staff").insert([{
    name: clinicName,
    email,
    role: "admin",
    status: "Active",
    permissions: "Dashboard,Patients,Appointments,Doctors,Lab Records,Materials,Expenses,Reports,Staff,Settings",
    user_id: userId,
    clinic_id: clinic.id,
  }]);
  if (staffErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: staffErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
