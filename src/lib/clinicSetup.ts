import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Give a new clinic its Settings row straight away, filled with what was
 * entered at signup, so Settings opens with those details instead of blank.
 * Currency is left empty on purpose: the app auto-detects it until it is chosen.
 */
export async function seedClinicSettings(
  admin: SupabaseClient,
  clinicId: string,
  d: { name: string; email?: string | null; phone?: string | null; address?: string | null },
) {
  const { data: existing } = await admin.from("settings").select("id").eq("clinic_id", clinicId).limit(1).maybeSingle();
  if (existing) return null;
  const { error } = await admin.from("settings").insert([{
    clinic_id: clinicId, clinic_name: d.name, clinic_email: d.email ?? null,
    clinic_phone: d.phone ?? null, clinic_address: d.address ?? null,
  }]);
  return error;
}
