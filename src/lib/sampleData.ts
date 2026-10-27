// The sample patients and appointments a new clinic can load from the setup
// wizard. Every row is flagged is_sample so one click removes them again.
// No invoices or payments are created, so billing totals are never touched.

export const SAMPLE_PATIENTS = [
  { name: "Sample · Ayesha Noor", phone: "0300 0000001", gender: "Female", age: 29, treatment: "Scaling & polishing" },
  { name: "Sample · Bilal Ahmed", phone: "0300 0000002", gender: "Male", age: 41, treatment: "Root canal treatment" },
  { name: "Sample · Sana Malik", phone: "0300 0000003", gender: "Female", age: 8, treatment: "Check-up" },
];

/** Appointment slots for the sample patients: [days from today, time] */
export const SAMPLE_APPOINTMENTS: [number, string][] = [[0, "10:00"], [0, "11:30"], [1, "10:30"]];

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
