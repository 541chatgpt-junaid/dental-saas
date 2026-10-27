import { NextResponse } from "next/server";
import { appOrigin, serviceClient, settleAttempt } from "@/lib/payments/engine";
import { loadProvider } from "@/lib/payments/config";
import { easypayConfirmForm, easypayInquire } from "@/lib/payments/easypaisa";

// Easypay sends the customer back here. The redirect itself proves nothing, so
// each visit asks Easypaisa directly whether the order was paid, and only that
// answer (with its amount) is used. The first visit carries an auth token that
// Easypay wants posted back to confirm the payment.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export async function GET(request: Request, { params }: { params: Promise<{ clinicId: string; ref: string }> }) {
  const { clinicId, ref } = await params;
  const db = serviceClient();
  const { data: att } = await db.from("payment_attempts").select("id, link_id, clinic_id, status, provider").eq("ref", ref).maybeSingle();
  if (!att || att.clinic_id !== clinicId || att.provider !== "easypaisa") return new NextResponse("Unknown payment.", { status: 404 });
  const prov = await loadProvider(db, clinicId, "easypaisa");
  if (!prov) return new NextResponse("Easypaisa is not set up for this clinic.", { status: 400 });
  const origin = appOrigin(request);
  const { data: link } = await db.from("payment_links").select("token").eq("id", att.link_id).maybeSingle();
  const back = `${origin}/pay/${link?.token ?? ""}?ref=${ref}`;

  const result = att.status === "paid" ? { paid: true } : await easypayInquire(prov.config, ref).catch(() => null);
  if (result?.paid && att.status !== "paid") {
    const r = result as { paid: boolean; amount: number; providerRef: string };
    await settleAttempt(db, ref, { provider: "easypaisa", providerRef: r.providerRef, amount: r.amount, currency: "PKR", clinicId });
  }
  if (result?.paid) return NextResponse.redirect(back, 303);

  const authToken = new URL(request.url).searchParams.get("auth_token");
  if (authToken && att.status === "pending") {
    const f = easypayConfirmForm(prov.config, authToken, `${origin}/api/payments/easypaisa/return/${clinicId}/${ref}`);
    const inputs = Object.entries(f.fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join("");
    return new NextResponse(`<!doctype html><meta charset="utf-8"><title>Confirming payment…</title><body onload="document.forms[0].submit()"><p style="font-family:sans-serif">Confirming your payment…</p><form method="POST" action="${esc(f.action)}">${inputs}<noscript><button>Continue</button></noscript></form></body>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return NextResponse.redirect(back + "&failed=1", 303);
}
