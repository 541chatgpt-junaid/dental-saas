import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifySuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = adminClient();
  const { data } = await admin.from("staff").select("role").eq("user_id", user.id).single();
  return data?.role === "superadmin";
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => {
        const v = String(r[h] ?? "").replace(/"/g, '""');
        return `"${v}"`;
      }).join(",")
    ),
  ];
  return lines.join("\n");
}

export async function GET(request: Request) {
  const ok = await verifySuperAdmin();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get("clinicId");
  if (!clinicId) return NextResponse.json({ error: "clinicId required" }, { status: 400 });

  const admin = adminClient();
  const [{ data: patients }, { data: visits }, { data: labs }] = await Promise.all([
    admin.from("patients").select("*").eq("clinic_id", clinicId),
    admin.from("visits").select("*").eq("clinic_id", clinicId),
    admin.from("labs").select("*").eq("clinic_id", clinicId),
  ]);

  const sections = [
    "=== PATIENTS ===\n" + toCSV(patients ?? []),
    "=== VISITS ===\n" + toCSV(visits ?? []),
    "=== LABS ===\n" + toCSV(labs ?? []),
  ].join("\n\n");

  return new NextResponse(sections, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="clinic_${clinicId}.csv"`,
    },
  });
}
