import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { billingByPatient, loadLedger, countedPayments } from "@/lib/ledger";
import { invoiceSheet, patientSheet, paymentSheet } from "@/lib/exportBook";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifySuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = adminClient();
  const { data } = await admin.from("staff").select("role").eq("user_id", user.id).maybeSingle();
  return data?.role === "superadmin";
}

export async function GET(request: Request) {
  const ok = await verifySuperAdmin();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get("clinicId");
  if (!clinicId) return NextResponse.json({ error: "clinicId is required." }, { status: 400 });

  const admin = adminClient();
  const [{ data: clinic }, { data: patients }, { data: visits }, { data: labs }, ledger] = await Promise.all([
    admin.from("clinics").select("name").eq("id", clinicId).maybeSingle(),
    admin.from("patients").select("*").eq("clinic_id", clinicId).order("id"),
    admin.from("visits").select("*").eq("clinic_id", clinicId),
    admin.from("labs").select("*").eq("clinic_id", clinicId),
    // The ledger, not the old fee columns on patients: totals here match every screen
    loadLedger(admin, { clinicId }).catch(() => null),
  ]);
  if (!ledger) return NextResponse.json({ error: "Could not read the billing ledger." }, { status: 500 });

  const invoices = ledger.invoices;
  const payments = countedPayments(ledger.payments, invoices);
  const names = new Map((patients ?? []).map(p => [p.id as number, String(p.name ?? "")]));
  const nameOf = (id: number | null) => (id == null ? "" : names.get(id) ?? "");
  const counted = invoices.filter(i => i.counted);

  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: object[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
  add("Summary", [
    { Category: "Clinic", Value: clinic?.name ?? clinicId },
    { Category: "Patients", Value: (patients ?? []).length },
    { Category: "Total Billed", Value: counted.reduce((t, i) => t + i.total, 0) },
    { Category: "Total Collected", Value: payments.reduce((t, p) => t + (Number(p.amount) || 0), 0) },
    { Category: "Pending (open invoice balances)", Value: counted.reduce((t, i) => t + Math.max(0, i.balance), 0) },
  ]);
  add("Patients", patientSheet(patients ?? [], billingByPatient(invoices)));
  add("Invoices", invoiceSheet(invoices, nameOf));
  add("Payments", paymentSheet(payments, nameOf));
  add("Visits", visits ?? []);
  add("Labs", labs ?? []);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const safe = String(clinic?.name ?? clinicId).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "clinic";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dentease-${safe}.xlsx"`,
    },
  });
}
