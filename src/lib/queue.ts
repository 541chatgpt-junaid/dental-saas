export type QueueStatus = "waiting" | "in_chair" | "done" | "skipped";

export interface Token {
  id: string; token_no: number; patient_id: number | null; patient_name: string; phone: string | null;
  doctor_name: string | null; reason: string | null; status: QueueStatus; called_at: string | null; created_at: string;
}

/** The clinic's local calendar day, so tokens restart at 1 every morning */
export const localToday = () => new Date().toLocaleDateString("en-CA");
