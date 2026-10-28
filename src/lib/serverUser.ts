import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/** The signed-in user from the session cookie (null when signed out). Server only. */
export async function currentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** The signed-in clinic owner (role admin or superadmin) with a service-role client, or null. Server only. */
export async function clinicOwner() {
  const user = await currentUser();
  if (!user) return null;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await db.from("staff").select("clinic_id, role").eq("user_id", user.id).maybeSingle();
  const role = String(data?.role || "").toLowerCase();
  if (!data?.clinic_id || (role !== "admin" && role !== "superadmin")) return null;
  return { db, clinicId: data.clinic_id as string, email: user.email ?? "" };
}

/**
 * The signed-in staff member with their clinic and what they may do, plus a
 * service-role client. `billing` is true for owners and for staff granted the
 * Billing module. Null when signed out or not part of a clinic. Server only.
 */
export async function staffContext() {
  const user = await currentUser();
  if (!user) return null;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await db.from("staff").select("clinic_id, role, status, permissions").eq("user_id", user.id).maybeSingle();
  if (!data?.clinic_id || data.status === "Inactive") return null;
  const role = String(data.role || "").toLowerCase();
  const owner = role === "admin" || role === "superadmin";
  const perms = String(data.permissions || "").split(",").map((p: string) => p.trim());
  return { db, userId: user.id, clinicId: data.clinic_id as string, owner, billing: owner || perms.includes("Billing"), patients: owner || perms.includes("Patients"), appointments: owner || perms.includes("Appointments") };
}
