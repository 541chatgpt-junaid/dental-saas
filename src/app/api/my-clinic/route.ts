import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getClinicForUser, invalidateClinic, invalidateUser } from "@/lib/clinicCache";

async function currentUser() {
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
  return user;
}

// GET — the caller's clinic id + name. The auth check always runs; only the
// clinic lookups behind it are cached (see lib/clinicCache.ts).
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ clinicId: null, clinicName: null });

  const clinic = await getClinicForUser(user.id);
  if (!clinic) return NextResponse.json({ clinicId: null, clinicName: null });
  return NextResponse.json(clinic);
}

// POST — expire the caller's cached clinic data right after they edit it
// (e.g. the Settings page), so the next GET reads fresh data. Only ever
// expires the caller's own entries.
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clinic = await getClinicForUser(user.id);
  if (clinic) invalidateClinic(clinic.clinicId);
  invalidateUser(user.id);
  return NextResponse.json({ success: true });
}
