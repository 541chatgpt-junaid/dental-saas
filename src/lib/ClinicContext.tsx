"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "./supabase";

interface ClinicContextType {
  clinicId: string | null;
  clinicName: string | null;
  loading: boolean;
}

const ClinicContext = createContext<ClinicContextType>({
  clinicId: null,
  clinicName: null,
  loading: true,
});

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: staffData } = await supabase
        .from("staff")
        .select("clinic_id")
        .eq("user_id", user.id)
        .single();

      if (staffData?.clinic_id) {
        setClinicId(staffData.clinic_id);

        const { data: clinicData } = await supabase
          .from("clinics")
          .select("name")
          .eq("id", staffData.clinic_id)
          .single();
        setClinicName(clinicData?.name ?? null);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <ClinicContext.Provider value={{ clinicId, clinicName, loading }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
