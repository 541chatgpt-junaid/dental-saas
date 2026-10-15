import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { clean } from "@/lib/formInput";

const PLANS = ["Start free", "Guided demo", "Multi-branch"];
const SIZES = ["Solo dentist", "2–5 chairs", "6–10 chairs", "10+ chairs"];
const FEATURES = ["Appointment booking", "Patient records", "Billing & receipts", "Staff scheduling", "Lab case tracking", "Revenue reports"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Honeypot: real visitors never fill the hidden "website" field
  if (clean(body.website, 200)) return NextResponse.json({ success: true });

  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const clinic = clean(body.clinic, 150);
  const plan = clean(body.plan, 50);
  const clinicSize = clean(body.clinicSize, 50);
  const features = Array.isArray(body.features)
    ? body.features.filter((f: unknown): f is string => typeof f === "string" && FEATURES.includes(f))
    : [];

  if (name.length < 2)
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 7)
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  if (!PLANS.includes(plan) || !SIZES.includes(clinicSize) || features.length === 0)
    return NextResponse.json({ error: "Please complete all steps of the form." }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await admin.from("demo_requests").insert([{
    name, phone, clinic: clinic || null, plan, clinic_size: clinicSize, features,
  }]);
  if (error) return NextResponse.json({ error: "Could not send your request. Please try again." }, { status: 500 });

  return NextResponse.json({ success: true });
}
