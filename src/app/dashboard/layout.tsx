import { ClinicProvider } from "@/lib/ClinicContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ClinicProvider>{children}</ClinicProvider>;
}
