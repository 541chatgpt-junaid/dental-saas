import { formatDate } from "@/lib/dateFormat";
import { doctorName } from "@/lib/personName";
import { NO_BILLS, type Ledgered, type LedgerInvoiceRow, type LedgerPaymentRow, type PatientBilling } from "@/lib/ledger";

// Spreadsheet rows shared by the clinic Reports export and the admin export,
// so both files carry the same ledger figures the screens show.

type Invoice = Ledgered<LedgerInvoiceRow & { invoice_number?: string | null }>;
type Payment = LedgerPaymentRow & { invoice?: Invoice };
type Patient = { id: number; name?: string | null; phone?: string | null; age?: unknown; gender?: string | null; doctor_name?: string | null; treatment?: string | null; created_at?: string | null };

export const patientSheet = (patients: Patient[], billing: Record<number, PatientBilling>) =>
  patients.map(p => {
    const b = billing[p.id] ?? NO_BILLS;
    return {
      ID: p.id, Name: p.name ?? "", Phone: p.phone ?? "", Age: p.age ?? "", Gender: p.gender ?? "",
      Doctor: doctorName(p.doctor_name), Treatment: p.treatment ?? "",
      "Total Billed": b.totalBilled, Paid: b.totalPaid, Remaining: b.outstanding, Status: b.status,
      Date: formatDate(p.created_at),
    };
  });

export const invoiceSheet = (invoices: Invoice[], patientName: (id: number | null) => string) =>
  invoices.map(i => ({
    "Invoice #": i.invoice_number ?? "", Patient: patientName(i.patient_id), Date: formatDate(i.created_at),
    "Due Date": i.due_date ? formatDate(i.due_date) : "", Status: i.state, "Counts in totals": i.counted ? "Yes" : "No",
    Total: i.total, Paid: i.amount_paid, Balance: i.balance,
  }));

/** Only payments on counted invoices, the same set every total uses */
export const paymentSheet = (payments: Payment[], patientName: (id: number | null) => string) =>
  payments.map(p => ({
    Date: formatDate(p.payment_date), "Invoice #": p.invoice?.invoice_number ?? "",
    Patient: patientName(p.invoice?.patient_id ?? null), Method: p.payment_method ?? "", Amount: Number(p.amount) || 0,
  }));
