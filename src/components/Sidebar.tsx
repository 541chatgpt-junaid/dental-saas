"use client";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Patients", href: "/dashboard/patients" },
  { label: "Appointments", href: "/dashboard/appointments" },
  { label: "Doctors", href: "/dashboard/doctors" },
  { label: "Lab Records", href: "/dashboard/labs" },
  { label: "Materials", href: "/dashboard/materials" },
  { label: "Expenses", href: "/dashboard/expenses" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Staff", href: "/dashboard/staff" },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="w-56 bg-teal-800 text-white flex flex-col p-5 min-h-screen">
      <h1 className="text-xl font-semibold mb-8 tracking-tight">
        Dent<span className="text-teal-300">Ease</span>
      </h1>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const cls = isActive
            ? "px-4 py-2.5 rounded-lg text-sm bg-teal-600 text-white font-medium"
            : "px-4 py-2.5 rounded-lg text-sm text-teal-200 hover:bg-teal-700";
          return (
            <a key={item.href} href={item.href} className={cls}>
              {item.label}
            </a>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="text-teal-300 hover:text-white text-sm text-left px-4 py-2.5"
      >
        Sign Out
      </button>
    </div>
  );
}