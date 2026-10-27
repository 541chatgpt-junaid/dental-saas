import { ClinicProvider } from "@/lib/ClinicContext";
import SessionGuard from "@/components/SessionGuard";
import OnboardingGate from "@/components/OnboardingGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClinicProvider>
      <SessionGuard />
      <OnboardingGate />
      <div className="de-app">{children}</div>
    </ClinicProvider>
  );
}
