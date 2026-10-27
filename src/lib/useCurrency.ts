import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useClinic } from "@/lib/ClinicContext";

const currencyMap: Record<string, string> = {
  PKR: "Rs", USD: "$", AED: "AED", GBP: "£",
  EUR: "€", SAR: "SAR", CAD: "CA$", AUD: "A$",
};

// Auto detect currency by timezone/locale
const getAutoCurrency = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Karachi") || tz.includes("Pakistan")) return "PKR";
    if (tz.includes("London") || tz.includes("Europe/London")) return "GBP";
    if (tz.includes("Dubai") || tz.includes("Abu_Dhabi")) return "AED";
    if (tz.includes("Riyadh") || tz.includes("Saudi")) return "SAR";
    if (tz.includes("New_York") || tz.includes("Chicago") || tz.includes("America")) return "USD";
    if (tz.includes("Sydney") || tz.includes("Melbourne")) return "AUD";
    if (tz.includes("Toronto") || tz.includes("Vancouver")) return "CAD";
    if (tz.includes("Europe")) return "EUR";
  } catch {}
  return "PKR";
};

export function useCurrency() {
  const [symbol, setSymbol] = useState("Rs");
  const [code, setCode] = useState("PKR");
  const { clinicId, loading } = useClinic();

  useEffect(() => {
    if (loading) return;
    const fetchCurrency = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // The clinic's settings row (the one the Settings page edits). Not filtered by user_id:
      // settings belong to the clinic, and that column is not part of the table.
      let q = supabase.from("settings").select("currency");
      if (clinicId) q = q.eq("clinic_id", clinicId);
      const { data } = await q.order("id").limit(1).maybeSingle();

      if (data?.currency) {
        setCode(data.currency);
        setSymbol(currencyMap[data.currency] || data.currency);
      } else {
        // Auto detect
        const autoCurrency = getAutoCurrency();
        setCode(autoCurrency);
        setSymbol(currencyMap[autoCurrency] || autoCurrency);
      }
    };
    fetchCurrency();
  }, [clinicId, loading]);

  return { symbol, code };
}