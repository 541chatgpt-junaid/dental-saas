import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { clean } from "@/lib/formInput";
import { isRateLimited, TOO_MANY } from "@/lib/rateLimit";
import { availableSlots, isISODate, loadBookingContext } from "@/lib/booking";
import { ADVANCE_NOTE } from "@/lib/ledger";
import { appOrigin, clinicCurrency, linkForInvoice } from "@/lib/payments/engine";
import { enabledProviders } from "@/lib/payments/config";
import { symbolFor } from "@/lib/currency";

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const NOT_FOUND = NextResponse.json({ error: "This booking page is not available." }, { status: 404 });

/** The advance fee is only asked for when the clinic has set one AND can actually take online payments */
async function advanceOffer(db: ReturnType<typeof admin>, clinicId: string, fee: number) {
  if (fee <= 0) return null;
  const currency = await clinicCurrency(db, clinicId);
  if (!(await enabledProviders(db, clinicId, currency)).length) return null;
  return { fee, currency, symbol: symbolFor(currency) };
}

// GET — public clinic info for the booking page
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await loadBookingContext(admin(), slug);
  if (!ctx) return NOT_FOUND;
  const { settings, clinic, doctors } = ctx;
  const advance = await advanceOffer(admin(), ctx.settings.clinic_id, Number(settings.advance_fee) || 0);
  return NextResponse.json({
    advance,
    clinic,
    doctors: doctors.map(d => ({ name: d.name, specialization: d.specialization, working_days: d.working_days })),
    settings: { slot_minutes: settings.slot_minutes, days_ahead: settings.days_ahead, working_days: settings.working_days, note: settings.note },
  });
}

// POST — create a booking request (appointment with status "Requested")
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (clean(body.website, 200)) return NextResponse.json({ success: true }); // honeypot

  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const reason = clean(body.reason, 200);
  const doctor = clean(body.doctor, 100);
  const date = body.date;
  const time = clean(body.time, 5);
  if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 7) return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  if (!isISODate(date) || !/^\d{2}:\d{2}$/.test(time)) return NextResponse.json({ error: "Please choose a date and time." }, { status: 400 });

  const db = admin();
  if (await isRateLimited(db, request, "booking", { limit: 5, windowMs: 60 * 60 * 1000 }))
    return NextResponse.json(TOO_MANY, { status: 429 });

  const ctx = await loadBookingContext(db, slug);
  if (!ctx) return NOT_FOUND;

  // Re-check the slot so two people can't grab the same time
  const slot = (await availableSlots(db, ctx, date, doctor)).find(s => s.time === time);
  if (!slot) return NextResponse.json({ error: "Sorry, that time was just taken. Please pick another slot." }, { status: 409 });

  // Every appointment links to a patient: match an existing patient in this
  // clinic by phone, otherwise create one from the booking (name + phone are
  // already validated above). A booking can never be left patient-less.
  const clinicId = ctx.settings.clinic_id;
  const digits = phone.replace(/\D/g, "");
  let patientId: number | null = null;
  const { data: existing } = await db.from("patients").select("id, phone").eq("clinic_id", clinicId);
  const match = (existing || []).find(p => (p.phone || "").replace(/\D/g, "") === digits && digits.length >= 7);
  if (match) patientId = match.id;
  else {
    const { data: created } = await db.from("patients")
      .insert([{ clinic_id: clinicId, name, phone, status: "Pending" }]).select("id").single();
    patientId = created?.id ?? null;
  }
  if (!patientId) {
    console.error("Online booking could not resolve a patient for", slug);
    return NextResponse.json({ error: "Could not save your booking. Please call the clinic." }, { status: 500 });
  }

  const row = {
    clinic_id: clinicId,
    patient_id: patientId,
    patient_name: name,
    doctor_name: slot.doctor || "",
    date, time,
    treatment: reason || "Online booking",
    status: "Requested",
    notes: `Online booking · ${phone}`,
  };
  let { data: appt, error } = await db.from("appointments").insert([{ ...row, phone, source: "online" }]).select("id").single();
  // Older schemas without the phone/source columns: phone is still kept in notes
  if (error && /phone|source/.test(error.message)) ({ data: appt, error } = await db.from("appointments").insert([row]).select("id").single());
  if (error || !appt) {
    console.error("Online booking insert failed:", error?.message);
    return NextResponse.json({ error: "Could not save your booking. Please call the clinic." }, { status: 500 });
  }

  // Advance booking fee: a hidden (draft) invoice plus a payment link. The invoice
  // only joins the ledger when the payment is confirmed; the booking stands either way.
  let pay: { url: string; fee: number; symbol: string } | null = null;
  const offer = await advanceOffer(db, clinicId, Number(ctx.settings.advance_fee) || 0);
  if (offer) {
    try {
      const { data: num } = await db.rpc("generate_invoice_number", { p_clinic_id: clinicId });
      const { data: inv } = await db.from("invoices").insert([{
        clinic_id: clinicId, patient_id: patientId, invoice_number: num, status: "draft", subtotal: offer.fee, discount: 0, total: offer.fee,
        amount_paid: 0, notes: `${ADVANCE_NOTE} Advance booking fee for ${date} ${time}`,
      }]).select("id").single();
      if (inv) {
        await db.from("invoice_items").insert([{ invoice_id: inv.id, clinic_id: clinicId, description: "Advance booking fee", quantity: 1, unit_price: offer.fee }]);
        await db.from("appointments").update({ advance_invoice_id: inv.id }).eq("id", appt.id);
        const link = await linkForInvoice(db, { clinicId, invoiceId: inv.id, userId: null, hours: 48 });
        pay = { url: `${appOrigin(request)}/pay/${link.token}`, fee: offer.fee, symbol: offer.symbol };
      }
    } catch (e) {
      console.error("Advance fee setup failed:", e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ success: true, date, time, doctor: slot.doctor || null, pay });
}
