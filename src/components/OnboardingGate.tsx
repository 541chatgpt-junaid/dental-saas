"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Sends a clinic owner who has not finished the 3-step setup to the wizard, from any dashboard page. */
export default function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/dashboard/onboarding")) return;
    fetch("/api/onboarding").then(r => r.json()).then(d => { if (d.needed) router.replace("/dashboard/onboarding"); }).catch(() => {});
  }, [pathname, router]);
  return null;
}
