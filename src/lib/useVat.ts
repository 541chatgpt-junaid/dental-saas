import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useClinic } from "@/lib/ClinicContext";
import { NO_VAT, vatConfigOf, type VatConfig } from "@/lib/vat";

/** The clinic's VAT settings (rate, on/off, registration number). "Off" until the clinic switches VAT on. */
export function useVat(): VatConfig {
  const [cfg, setCfg] = useState<VatConfig>(NO_VAT);
  const { clinicId, loading } = useClinic();
  useEffect(() => {
    if (loading) return;
    let live = true;
    (async () => {
      let q = createClient().from("settings").select("*");
      if (clinicId) q = q.eq("clinic_id", clinicId);
      const { data } = await q.order("id").limit(1).maybeSingle();
      if (live) setCfg(vatConfigOf(data));
    })();
    return () => { live = false; };
  }, [clinicId, loading]);
  return cfg;
}
