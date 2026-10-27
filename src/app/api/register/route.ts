import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isRateLimited, TOO_MANY } from "@/lib/rateLimit";
import { passwordError } from "@/lib/passwordRules";
import { seedClinicSettings } from "@/lib/clinicSetup";

export async function POST(request: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  if (await isRateLimited(admin, request, "register", { limit: 10, windowMs: 60 * 60 * 1000 }))
    return NextResponse.json(TOO_MANY, { status: 429 });

  const { clinicName, email, password, phone, address, name } = await request.json();
  const staffName = typeof name === "string" && name.trim() ? name.trim() : clinicName;

  if (!clinicName || !email || !password)
    return NextResponse.json({ error: "Clinic name, email and password are required." }, { status: 400 });

  const pwError = passwordError(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  // 1. Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: staffName },
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
    name: staffName,
    email,
    role: "admin",
    status: "Active",
    permissions: "Dashboard,Patients,Appointments,Queue,Treatment Plans,Recalls,Doctors,Commissions,Lab Records,Billing,Materials,Purchases,Expenses,Reports,Staff,Settings",
    user_id: userId,
    clinic_id: clinic.id,
  }]);
  if (staffErr) {
    // Rollback both auth user and orphaned clinic record
    await admin.auth.admin.deleteUser(userId);
    await admin.from("clinics").delete().eq("id", clinic.id);
    return NextResponse.json({ error: staffErr.message }, { status: 400 });
  }

  // 4. Settings row with the signup details (a failure here must not undo a working account)
  const settingsErr = await seedClinicSettings(admin, clinic.id, { name: clinicName, email, phone, address });
  if (settingsErr) console.error("Could not seed settings for new clinic:", settingsErr.message);

  return NextResponse.json({ success: true });
}
