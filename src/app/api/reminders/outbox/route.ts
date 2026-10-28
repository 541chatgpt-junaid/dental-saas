import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";

// A message left "ready" (clinic has no WhatsApp API connected) was sent by hand
// from WhatsApp; staff mark it so it leaves the queue.
export async function POST(request: Request) {
  const s = await staffContext();
  if (!s || !s.appointments) return NextResponse.json({ error: "You need access to Appointments." }, { status: 403 });
  const b = await request.json().catch(() => null);
  const { data, error } = await s.db.from("message_outbox").update({ status: "sent", sent_via: "manual", sent_at: new Date().toISOString() })
    .eq("id", String(b?.id ?? "")).eq("clinic_id", s.clinicId).eq("status", "ready").select("id");
  if (error) return NextResponse.json({ error: "Could not update. Please try again." }, { status: 500 });
  return NextResponse.json({ success: true, updated: data?.length ?? 0 });
}
