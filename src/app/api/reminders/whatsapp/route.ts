import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";
import { secretBoxReady } from "@/lib/secretBox";
import { describeConnection, saveConnection } from "@/lib/reminders/whatsapp";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can connect WhatsApp.", 403);
  if (!secretBoxReady()) return fail("The server has no PAYMENT_SECRETS_KEY, so credentials cannot be stored safely.", 503);
  const b = await request.json().catch(() => null);
  const err = await saveConnection(o.db, o.clinicId, { enabled: b?.enabled === true, phoneNumberId: String(b?.phoneNumberId ?? ""), token: String(b?.token ?? "") });
  if (err) return fail(err);
  return NextResponse.json({ success: true, whatsapp: await describeConnection(o.db, o.clinicId) });
}

export async function DELETE() {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can disconnect WhatsApp.", 403);
  await o.db.from("clinic_whatsapp").delete().eq("clinic_id", o.clinicId);
  return NextResponse.json({ success: true, whatsapp: await describeConnection(o.db, o.clinicId) });
}
