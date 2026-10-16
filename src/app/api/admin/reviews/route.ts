import { NextResponse } from "next/server";
import { adminClient, verifySuperAdmin } from "@/lib/superAdmin";

// GET — all landing page reviews, newest first
export async function GET() {
  if (!(await verifySuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { data, error } = await adminClient()
    .from("reviews")
    .select("id, name, clinic, rating, review, is_approved, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — approve or hide a review: { id, is_approved }
export async function PATCH(request: Request) {
  if (!(await verifySuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, is_approved } = await request.json().catch(() => ({}));
  if (typeof id !== "string" || typeof is_approved !== "boolean")
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { error } = await adminClient().from("reviews").update({ is_approved }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE — remove a review: { id }
export async function DELETE(request: Request) {
  if (!(await verifySuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { error } = await adminClient().from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
