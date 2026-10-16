import { ClinicProvider } from "@/lib/ClinicContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClinicProvider>
      <div className="de-app">{children}</div>
    </ClinicProvider>
  );
}
