import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getAuthenticatedClinicId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await admin.from("staff").select("clinic_id").eq("user_id", user.id).maybeSingle();
  return data?.clinic_id ?? null;
}

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "treatment";

/** A code unique within the clinic, derived from the name */
async function uniqueTreatmentCode(
  db: ReturnType<typeof admin>,
  clinicId: string,
  name: string,
  existing: { name: string }[],
): Promise<string> {
  const { data } = await db.from("treatment_presets").select("code").eq("clinic_id", clinicId);
  const taken = new Set((data || []).map((r: { code: string | null }) => r.code).filter(Boolean));
  const base = slug(name);
  let cand = base, n = 1;
  while (taken.has(cand)) { n += 1; cand = `${base}-${n}`; }
  return cand;
}

// GET /api/presets?type=treatments|prescriptions
export async function GET(request: Request) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "treatments") {
    const { data, error } = await admin()
      .from("treatment_presets")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  if (type === "prescriptions") {
    const { data, error } = await admin()
      .from("prescription_presets")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// POST /api/presets  — body: { type, ...fields }
export async function POST(request: Request) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, ...fields } = body;

  if (type === "treatments") {
    const name = String(fields.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Treatment name is required." }, { status: 400 });
    const db = admin();
    // Reject a duplicate (case/spacing-insensitive) so the master list stays canonical
    const { data: existing } = await db.from("treatment_presets").select("id, name").eq("clinic_id", clinicId);
    const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if ((existing || []).some(e => key(e.name) === key(name)))
      return NextResponse.json({ error: "That treatment is already in the list." }, { status: 409 });
    const code = await uniqueTreatmentCode(db, clinicId, name, existing || []);
    let { error } = await db.from("treatment_presets").insert([{ clinic_id: clinicId, name, price: fields.price ?? 0, code }]);
    // Older database without the code column: insert without it
    if (error && /code/.test(error.message)) ({ error } = await db.from("treatment_presets").insert([{ clinic_id: clinicId, name, price: fields.price ?? 0 }]));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, code });
  }

  if (type === "prescriptions") {
    const rows = fields.rows as { medicine: string; dosage: string; frequency: string; duration: string; notes: string }[];
    const { error } = await admin()
      .from("prescription_presets")
      .insert(rows.map(r => ({
        clinic_id: clinicId,
        group_name: fields.group_name,
        medicine: r.medicine,
        dosage: r.dosage,
        frequency: r.frequency,
        duration: r.duration,
        notes: r.notes,
      })));
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// PATCH /api/presets  — body: { type, id, ...fields }
export async function PATCH(request: Request) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, id, ...fields } = body;

  if (type === "treatments") {
    const { error } = await admin()
      .from("treatment_presets")
      .update({ name: fields.name, price: fields.price ?? 0 })
      .eq("id", id)
      .eq("clinic_id", clinicId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (type === "prescriptions") {
    const { error } = await admin()
      .from("prescription_presets")
      .update({
        group_name: fields.group_name,
        medicine: fields.medicine,
        dosage: fields.dosage,
        frequency: fields.frequency,
        duration: fields.duration,
        notes: fields.notes,
      })
      .eq("id", id)
      .eq("clinic_id", clinicId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

// DELETE /api/presets?type=treatments|prescriptions&id=xxx
export async function DELETE(request: Request) {
  const clinicId = await getAuthenticatedClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const table = type === "treatments" ? "treatment_presets" : type === "prescriptions" ? "prescription_presets" : null;
  if (!table) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const { error } = await admin().from(table).delete().eq("id", id).eq("clinic_id", clinicId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
