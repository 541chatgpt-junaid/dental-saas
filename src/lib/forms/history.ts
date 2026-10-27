// The patient-filled medical history form: what it asks, and how an answer is
// merged into the patient's existing medical_history without overwriting what
// staff already recorded.

export const COMMON_ALLERGIES = ["Penicillin", "Local anaesthetic", "Latex", "Aspirin", "Ibuprofen / NSAIDs", "Iodine"] as const;
export const COMMON_CONDITIONS = ["Diabetes", "High blood pressure", "Heart disease", "Asthma", "Bleeding disorder", "Hepatitis", "Epilepsy", "Kidney disease", "Pregnant"] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export interface HistoryAnswers {
  allergies: string[];
  allergies_other: string;
  conditions: string[];
  conditions_other: string;
  medications: string;
  surgeries: string;
  blood_group: string;
  notes: string;
}

export const EMPTY_ANSWERS: HistoryAnswers = { allergies: [], allergies_other: "", conditions: [], conditions_other: "", medications: "", surgeries: "", blood_group: "", notes: "" };

const trim = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const list = (v: unknown, allowed: readonly string[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && allowed.includes(x)) : []);

/** Never trust the browser: keep only known choices and bounded text */
export function cleanAnswers(raw: unknown): HistoryAnswers {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const bg = trim(r.blood_group, 4);
  return {
    allergies: list(r.allergies, COMMON_ALLERGIES), allergies_other: trim(r.allergies_other, 300),
    conditions: list(r.conditions, COMMON_CONDITIONS), conditions_other: trim(r.conditions_other, 300),
    medications: trim(r.medications, 500), surgeries: trim(r.surgeries, 500),
    blood_group: (BLOOD_GROUPS as readonly string[]).includes(bg) ? bg : "", notes: trim(r.notes, 1000),
  };
}

const items = (s: string) => s.split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Add new comma-separated items to an existing list, ignoring ones already there (any letter case) */
export function mergeList(existing: string | null | undefined, additions: string[]): { text: string; added: string[] } {
  const have = items(existing || "");
  const added: string[] = [];
  for (const a of additions.map(x => x.trim()).filter(Boolean)) {
    if (!have.some(h => same(h, a)) && !added.some(h => same(h, a))) added.push(a);
  }
  return { text: [...have, ...added].join(", "), added };
}

/** Free text: append only when the same words are not already there */
export function mergeText(existing: string | null | undefined, addition: string): string {
  const e = (existing || "").trim();
  if (!addition) return e;
  if (e.toLowerCase().includes(addition.toLowerCase())) return e;
  return e ? `${e}; ${addition}` : addition;
}

export interface HistoryRow { allergies?: string | null; blood_group?: string | null; medical_conditions?: string | null; current_medications?: string | null; previous_surgeries?: string | null; notes?: string | null }

/** The new medical_history values after merging the patient's answers, and what was newly flagged */
export function mergeHistory(existing: HistoryRow | null, a: HistoryAnswers, dateLabel: string) {
  const allergies = mergeList(existing?.allergies, [...a.allergies, ...items(a.allergies_other)]);
  const conditions = mergeList(existing?.medical_conditions, [...a.conditions, ...items(a.conditions_other)]);
  const note = a.notes ? `Patient form ${dateLabel}: ${a.notes}` : "";
  return {
    values: {
      allergies: allergies.text,
      medical_conditions: conditions.text,
      current_medications: mergeText(existing?.current_medications, a.medications),
      previous_surgeries: mergeText(existing?.previous_surgeries, a.surgeries),
      blood_group: (existing?.blood_group || "").trim() || a.blood_group,
      notes: note ? mergeText(existing?.notes, note) : (existing?.notes || ""),
    },
    flagged: { allergies: allergies.added, conditions: conditions.added },
  };
}
