import type { SupabaseClient } from "@supabase/supabase-js";
import { open, seal } from "@/lib/secretBox";
import { PROVIDER_IDS, PROVIDER_META, type ProviderConfig, type ProviderId } from "./types";

// Each clinic connects its OWN merchant account, so patients' money goes to the
// clinic, never through DentEase. Credentials are encrypted at rest and are
// never sent back to the browser. Server only.

interface Row { provider: ProviderId; enabled: boolean; environment: "sandbox" | "live"; config_enc: string }

export async function loadProvider(db: SupabaseClient, clinicId: string, provider: ProviderId): Promise<{ enabled: boolean; config: ProviderConfig } | null> {
  const { data } = await db.from("clinic_payment_providers").select("provider, enabled, environment, config_enc").eq("clinic_id", clinicId).eq("provider", provider).maybeSingle();
  const row = data as Row | null;
  if (!row) return null;
  const values = open(row.config_enc);
  if (!values) return null;
  return { enabled: row.enabled, config: { environment: row.environment, values } };
}

/** Providers the clinic has switched on and that can charge in this currency */
export async function enabledProviders(db: SupabaseClient, clinicId: string, currency: string): Promise<ProviderId[]> {
  const { data } = await db.from("clinic_payment_providers").select("provider, enabled, config_enc").eq("clinic_id", clinicId).eq("enabled", true);
  return PROVIDER_IDS.filter(id => {
    const row = (data || []).find(r => r.provider === id);
    const meta = PROVIDER_META[id];
    return !!row && !!open(row.config_enc) && (!meta.currencies || meta.currencies.includes(currency));
  });
}

/** What Settings may show: which fields are filled in, never their values */
export async function describeProviders(db: SupabaseClient, clinicId: string) {
  const { data } = await db.from("clinic_payment_providers").select("provider, enabled, environment, config_enc").eq("clinic_id", clinicId);
  return PROVIDER_IDS.map(id => {
    const row = (data || []).find(r => r.provider === id) as Row | undefined;
    const values = row ? open(row.config_enc) : null;
    return {
      provider: id, label: PROVIDER_META[id].label, enabled: !!row?.enabled, environment: row?.environment ?? "sandbox",
      filled: Object.fromEntries(PROVIDER_META[id].fields.map(f => [f.key, !!values?.[f.key]])),
      // Non-secret fields can be shown back so they can be checked
      shown: Object.fromEntries(PROVIDER_META[id].fields.filter(f => !f.secret).map(f => [f.key, values?.[f.key] ?? ""])),
    };
  });
}

export async function saveProvider(db: SupabaseClient, clinicId: string, provider: ProviderId, input: { enabled: boolean; environment: "sandbox" | "live"; values: Record<string, unknown> }): Promise<string | null> {
  const meta = PROVIDER_META[provider];
  const existing = await loadProvider(db, clinicId, provider);
  const merged: Record<string, string> = {};
  for (const f of meta.fields) {
    const given = typeof input.values[f.key] === "string" ? (input.values[f.key] as string).trim() : "";
    // A blank field keeps what is already stored, so secrets never have to be re-entered
    merged[f.key] = given || existing?.config.values[f.key] || "";
  }
  if (input.enabled) {
    const missing = meta.fields.filter(f => !merged[f.key]).map(f => f.label);
    if (missing.length) return `Fill in ${missing.join(", ")} before switching ${meta.label} on.`;
  }
  const { error } = await db.from("clinic_payment_providers").upsert({
    clinic_id: clinicId, provider, enabled: input.enabled, environment: meta.environments ? input.environment : "live",
    config_enc: seal(merged), updated_at: new Date().toISOString(),
  }, { onConflict: "clinic_id,provider" });
  return error ? "Could not save the payment settings. Please try again." : null;
}
