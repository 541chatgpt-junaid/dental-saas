import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field
  if (typeof body.website === "string" && body.website.trim())
    return NextResponse.json({ success: true });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const clinic = typeof body.clinic === "string" ? body.clinic.trim() : "";
  const review = typeof body.review === "string" ? body.review.trim() : "";
  const rating = Number(body.rating);

  if (name.length < 2 || name.length > 80)
    return NextResponse.json({ error: "Please enter your name (2–80 characters)." }, { status: 400 });
  if (clinic.length > 120)
    return NextResponse.json({ error: "Clinic name is too long (max 120 characters)." }, { status: 400 });
  if (review.length < 10 || review.length > 1000)
    return NextResponse.json({ error: "Review must be between 10 and 1000 characters." }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: "Please select a rating from 1 to 5 stars." }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await admin
    .from("reviews")
    .insert([{ name, clinic: clinic || null, review, rating }]);
  if (error) {
    console.error("Review insert failed:", error.message);
    return NextResponse.json({ error: "Could not submit your review. Please try again later." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
