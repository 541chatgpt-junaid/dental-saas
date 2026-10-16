import { NextResponse } from "next/server";
import { adminClient, verifySuperAdmin } from "@/lib/superAdmin";

const STATUSES = ["new", "contacted", "done"];

// GET — all demo requests, newest first
export async function GET() {
  if (!(await verifySuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { data, error } = await adminClient()
    .from("demo_requests")
    .select("id, name, phone, clinic, plan, clinic_size, features, status, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — update follow-up status: { id, status }
export async function PATCH(request: Request) {
  if (!(await verifySuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, status } = await request.json().catch(() => ({}));
  if (typeof id !== "string" || !STATUSES.includes(status))
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { error } = await adminClient().from("demo_requests").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
