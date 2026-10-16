"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { clearRememberMe, sessionShouldEnd } from "@/lib/rememberMe";

/** Signs the user out if they unticked "Remember me" and have since closed the browser. */
export default function SessionGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!sessionShouldEnd()) return;
    clearRememberMe();
    createClient().auth.signOut().finally(() => router.replace("/login"));
  }, [router]);
  return null;
}
