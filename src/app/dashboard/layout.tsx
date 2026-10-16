import { ClinicProvider } from "@/lib/ClinicContext";
import SessionGuard from "@/components/SessionGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClinicProvider>
      <SessionGuard />
      <div className="de-app">{children}</div>
    </ClinicProvider>
  );
}
