"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3, BellRing, ListOrdered, Boxes, ClipboardList, HandCoins, CalendarCheck, FlaskConical, LayoutDashboard, LogOut, Menu, Receipt, Settings,
  Moon, ShoppingCart, Stethoscope, Sun, UserCog, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { clearRememberMe } from "@/lib/rememberMe";
import { useTheme } from "@/lib/useTheme";

// `permission` matches the names the middleware checks (staff.permissions)
const navItems: { label: string; href: string; icon: LucideIcon; permission?: string }[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/dashboard/patients", icon: Users, permission: "Patients" },
  { label: "Appointments", href: "/dashboard/appointments", icon: CalendarCheck, permission: "Appointments" },
  { label: "Walk-in Queue", href: "/dashboard/queue", icon: ListOrdered, permission: "Queue" },
  { label: "Treatment Plans", href: "/dashboard/treatment-plans", icon: ClipboardList, permission: "Treatment Plans" },
  { label: "Recalls", href: "/dashboard/recalls", icon: BellRing, permission: "Recalls" },
  { label: "Doctors", href: "/dashboard/doctors", icon: Stethoscope, permission: "Doctors" },
  { label: "Commissions", href: "/dashboard/commissions", icon: HandCoins, permission: "Commissions" },
  { label: "Lab Records", href: "/dashboard/labs", icon: FlaskConical, permission: "Lab Records" },
  { label: "Advanced Billing", href: "/dashboard/billing", icon: Receipt, permission: "Billing" },
  { label: "Inventory", href: "/dashboard/materials", icon: Boxes, permission: "Materials" },
  { label: "Purchases", href: "/dashboard/purchases", icon: ShoppingCart, permission: "Purchases" },
  { label: "Expenses", href: "/dashboard/expenses", icon: Wallet, permission: "Expenses" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, permission: "Reports" },
  { label: "Staff", href: "/dashboard/staff", icon: UserCog, permission: "Staff" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, permission: "Settings" },
];

function ToothMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        d="M15 6c-5.5 0-9.5 4.2-9.5 10.2 0 5.6 2.2 8.6 3.2 13.6 1.2 6 2 12.2 6.2 12.2 3.2 0 3.4-5.2 4.4-9 .8-3 2-5 4.7-5s3.9 2 4.7 5c1 3.8 1.2 9 4.4 9 4.2 0 5-6.2 6.2-12.2 1-5 3.2-8 3.2-13.6C42.5 10.2 38.5 6 33 6c-4 0-5.8 2-9 2s-5-2-9-2z" />
      <path stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M9 21h7.5l2.2-4.5 3.2 9 2.4-4.5H32" />
    </svg>
  );
}

function Wordmark({ size = "text-xl" }: { size?: string }) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-2 font-display font-semibold tracking-tight text-white ${size}`}>
      <ToothMark className="h-7 w-7" />
      <span>Dent<span className="text-gold">Ease</span></span>
    </Link>
  );
}

function NavLink({ href, label, icon: Icon, pathname, index, onClick, animate }: {
  href: string; label: string; icon: LucideIcon; pathname: string; index: number; onClick?: () => void; animate?: boolean;
}) {
  const isActive = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      style={animate ? { animationDelay: `${80 + index * 35}ms` } : undefined}
      className={`group relative flex ${animate ? "animate-fade-up" : ""} items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-all duration-500 ${
        isActive ? "bg-white/10 font-medium text-white" : "text-white/65 hover:translate-x-1 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span
        className={`absolute inset-y-2 left-0 w-[3px] origin-center rounded-full bg-gold transition-transform duration-500 ${isActive ? "scale-y-100" : "scale-y-0"}`}
        aria-hidden="true"
      />
      <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors duration-500 ${isActive ? "text-gold" : "text-white/50 group-hover:text-gold"}`} strokeWidth={1.8} />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // null = everything (owners, or while loading); otherwise the staff member's permissions
  const [allowed, setAllowed] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("staff").select("role, permissions").eq("user_id", user.id).maybeSingle();
      if (cancelled || !data) return;
      const role = String(data.role || "").toLowerCase();
      if (role === "admin" || role === "superadmin") return;
      setAllowed(data.permissions ? String(data.permissions).split(",").map((p: string) => p.trim()) : []);
    })();
    return () => { cancelled = true; };
  }, []);
  const visibleItems = navItems.filter(item => !item.permission || !allowed || allowed.includes(item.permission));
  const { dark, toggle } = useTheme();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearRememberMe();
    router.push("/");
  };

  const nav = (onClick?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Dashboard">
      {visibleItems.map((item, i) => (
        <NavLink key={item.href} {...item} pathname={pathname} index={i} onClick={onClick} animate={!!onClick} />
      ))}
    </nav>
  );

  const signOut = (
    <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4">
      <button
        onClick={toggle}
        aria-pressed={dark}
        className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm text-white/60 hover:bg-white/5 hover:text-gold"
      >
        {dark ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
        {dark ? "Light mode" : "Dark mode"}
      </button>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm text-white/60 hover:bg-white/5 hover:text-gold"
      >
        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} /> Sign Out
      </button>
    </div>
  );


  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-navy px-4 py-3 text-white shadow-[0_8px_24px_rgba(15,29,61,.25)] md:hidden">
        <Wordmark size="text-lg" />
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 animate-fade-in bg-navy/60 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="flex h-full w-72 animate-drawer-in flex-col overflow-y-auto bg-navy p-5 pt-20 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {nav(() => setMenuOpen(false))}
            {signOut}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="relative hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-navy p-5 text-white md:sticky md:top-0 md:flex md:h-screen"
        style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.10) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }}
      >
        <div className="mb-8 animate-fade-in px-1.5">
          <Wordmark />
        </div>
        {nav()}
        {signOut}
      </aside>
    </>
  );
}
