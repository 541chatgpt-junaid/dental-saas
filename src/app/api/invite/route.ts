import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { passwordError } from "@/lib/passwordRules";

export async function POST(request: Request) {
  const { email, password, name } = await request.json();

  const pwError = passwordError(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create user with email + password
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: data.user.id });
}