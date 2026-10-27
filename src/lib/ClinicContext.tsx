"use client";
import { createContext, useContext, useEffect, useState } from "react";

interface ClinicContextType {
  clinicId: string | null;
  clinicName: string | null;
  loading: boolean;
  /** Expire the server cache for this clinic and reload it — call after editing clinic details */
  refresh: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType>({
  clinicId: null,
  clinicName: null,
  loading: true,
  refresh: async () => {},
});

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, []);

  // Edits must show immediately: expire the server cache first, then reload
  const refresh = async () => {
    await fetch("/api/my-clinic", { method: "POST" }).catch(() => {});
    await load();
  };

  return (
    <ClinicContext.Provider value={{ clinicId, clinicName, loading, refresh }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
