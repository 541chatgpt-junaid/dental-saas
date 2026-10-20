import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { availableSlots, isISODate, loadBookingContext } from "@/lib/booking";

// GET ?date=YYYY-MM-DD&doctor=Name — free start times (no patient details are exposed)
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const doctor = (url.searchParams.get("doctor") || "").slice(0, 100);
  if (!isISODate(date)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const ctx = await loadBookingContext(admin, slug);
  if (!ctx) return NextResponse.json({ error: "This booking page is not available." }, { status: 404 });
  const slots = await availableSlots(admin, ctx, date, doctor);
  return NextResponse.json({ slots: slots.map(s => s.time) }, { headers: { "Cache-Control": "no-store" } });
}
