"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Patients", href: "/dashboard/patients" },
  { label: "Appointments", href: "/dashboard/appointments" },
  { label: "Doctors", href: "/dashboard/doctors" },
  { label: "Lab Records", href: "/dashboard/labs" },
  { label: "Materials", href: "/dashboard/materials" },
  { label: "Purchases", href: "/dashboard/purchases" },
  { label: "Expenses", href: "/dashboard/expenses" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Staff", href: "/dashboard/staff" },
  { label: "⚙️ Settings", href: "/dashboard/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-teal-800 text-white flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">
          Dent<span className="text-teal-300">Ease</span>
        </h1>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white text-2xl font-bold"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMenuOpen(false)}>
          <div className="bg-teal-800 w-64 h-full flex flex-col p-5" onClick={e => e.stopPropagation()}>
            <h1 className="text-xl font-semibold mb-6 text-white tracking-tight">
              Dent<span className="text-teal-300">Ease</span>
            </h1>
            <nav className="flex flex-col gap-1 flex-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const cls = isActive
                  ? "px-4 py-2.5 rounded-lg text-sm bg-teal-600 text-white font-medium"
                  : "px-4 py-2.5 rounded-lg text-sm text-teal-200 hover:bg-teal-700";
                return (
                  <a key={item.href} href={item.href} className={cls} onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="text-teal-300 hover:text-white text-sm text-left px-4 py-2.5 mt-4"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-56 bg-teal-800 text-white flex-col p-5 min-h-screen">
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
    </>
  );
}