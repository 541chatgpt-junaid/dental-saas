import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { clinicName, phone, address } = await request.json();

  if (!clinicName)
    return NextResponse.json({ error: "Clinic name is required." }, { status: 400 });

  // Get the authenticated user from the session cookie
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Guard: don't create duplicate clinic if user already has one
  const { data: existing } = await admin
    .from("staff")
    .select("clinic_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.clinic_id)
    return NextResponse.json({ error: "Clinic already set up for this account." }, { status: 400 });

  const { data: clinic, error: clinicErr } = await admin
    .from("clinics")
    .insert([{ name: clinicName, email: user.email, phone: phone || null, address: address || null }])
    .select()
    .single();
  if (clinicErr) return NextResponse.json({ error: clinicErr.message }, { status: 400 });

  const { error: staffErr } = await admin.from("staff").insert([{
    name: user.user_metadata?.full_name || clinicName,
    email: user.email,
    role: "admin",
    status: "Active",
    permissions: "Dashboard,Patients,Appointments,Doctors,Lab Records,Billing,Materials,Expenses,Reports,Staff,Settings",
    user_id: user.id,
    clinic_id: clinic.id,
  }]);

  if (staffErr) {
    await admin.from("clinics").delete().eq("id", clinic.id);
    return NextResponse.json({ error: staffErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
