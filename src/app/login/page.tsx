"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AuthForm, { type LoginValues, type SignupValues } from "@/components/AuthForm";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async ({ email, password }: LoginValues) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const handleSignup = async ({ fullName, clinicName, email, password }: SignupValues) => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName, clinicName, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || "Could not create your account. Please try again.");
    // Account is created already confirmed, so sign straight in
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Account created. Please sign in with your new password.");
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  };

  return (
    <AuthForm
      onLogin={handleLogin}
      onSignup={handleSignup}
      onGoogle={handleGoogle}
      onSuccess={() => router.push("/dashboard/patients")}
    />
  );
}
