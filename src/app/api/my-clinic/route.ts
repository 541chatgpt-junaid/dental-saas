import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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
  if (!user) return NextResponse.json({ clinicId: null, clinicName: null });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: staffData } = await admin
    .from("staff")
    .select("clinic_id")
    .eq("user_id", user.id)
    .single();

  if (!staffData?.clinic_id) {
    return NextResponse.json({ clinicId: null, clinicName: null });
  }

  const { data: clinicData } = await admin
    .from("clinics")
    .select("name")
    .eq("id", staffData.clinic_id)
    .single();

  return NextResponse.json({
    clinicId: staffData.clinic_id,
    clinicName: clinicData?.name ?? null,
  });
}
