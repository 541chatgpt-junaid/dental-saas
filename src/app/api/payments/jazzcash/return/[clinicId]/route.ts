import { NextResponse } from "next/server";
import { appOrigin, serviceClient, settleAttempt } from "@/lib/payments/engine";
import { loadProvider } from "@/lib/payments/config";
import { jazzVerify } from "@/lib/payments/jazzcash";

// JazzCash posts the customer's result here. The signed hash is verified with
// the clinic's integrity salt; unsigned or altered posts are refused.

export async function POST(request: Request, { params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params;
  const form = await request.formData().catch(() => null);
  const fields: Record<string, string> = {};
  form?.forEach((v, k) => { if (typeof v === "string") fields[k] = v; });
  const db = serviceClient();
  const prov = await loadProvider(db, clinicId, "jazzcash");
  const r = prov ? jazzVerify(prov.config, fields) : null;
  if (!r || !r.ref) return new NextResponse("We could not verify this payment result. If money left your account, contact the clinic.", { status: 400 });

  const { data: att } = await db.from("payment_attempts").select("id, link_id, clinic_id").eq("ref", r.ref).maybeSingle();
  if (!att || att.clinic_id !== clinicId) return new NextResponse("Unknown payment.", { status: 404 });
  let flag = "";
  if (r.ok) await settleAttempt(db, r.ref, { provider: "jazzcash", providerRef: r.providerRef || `T${r.ref}`, amount: r.amount, currency: "PKR", clinicId });
  else { await db.from("payment_attempts").update({ status: "failed" }).eq("id", att.id).eq("status", "pending"); flag = "&failed=1"; }
  const { data: link } = await db.from("payment_links").select("token").eq("id", att.link_id).maybeSingle();
  return NextResponse.redirect(`${appOrigin(request)}/pay/${link?.token ?? ""}?ref=${r.ref}${flag}`, 303);
}
