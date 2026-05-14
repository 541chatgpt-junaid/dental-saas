"use client";
import { createContext, useContext, useEffect, useState } from "react";

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
    fetch("/api/my-clinic")
      .then(r => r.json())
      .then(({ clinicId, clinicName }) => {
        if (clinicId) {
          setClinicId(clinicId);
          setClinicName(clinicName ?? null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
