import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

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

  useEffect(() => {
    const fetchCurrency = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("settings")
        .select("currency")
        .eq("user_id", user.id)
        .single();

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
  }, []);

  return { symbol, code };
}