import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai/provider";
import { aiGuard, fail } from "@/lib/ai/guard";
import { draftVisitNote } from "@/lib/ai/tools";

// AI scribe: a dictated (or typed) note becomes a structured visit-note DRAFT. It is not saved
// anywhere on the patient's record: staff review it, then it fills the visit form, which they save as usual.
export const maxDuration = 60;

export async function POST(request: Request) {
  const g = await aiGuard(request, "Patients");
  if ("res" in g) return g.res;
  const { s } = g;
  const b = await request.json().catch(() => null);
  const transcript = String(b?.transcript ?? "").replace(/\s+/g, " ").trim();
  if (transcript.length < 15) return fail("Dictate or type the visit note first.");
  if (transcript.length > 6000) return fail("That note is too long for one draft. Split it into parts.");
  const patientId = Number.isInteger(Number(b?.patientId)) ? Number(b.patientId) : null;
  if (patientId !== null) {
    const { data: p } = await s.db.from("patients").select("id").eq("id", patientId).eq("clinic_id", s.clinicId).maybeSingle();
    if (!p) return fail("Patient not found.", 404);
  }
  const { data: tr } = await s.db.from("treatment_presets").select("name").eq("clinic_id", s.clinicId).order("name");
  try {
    const r = await draftVisitNote(transcript, (tr || []).map(t => String(t.name)));
    const { data: row, error } = await s.db.from("ai_drafts").insert([{
      clinic_id: s.clinicId, patient_id: patientId, tool: "visit_note", facts: r.facts, draft: r.draft, warnings: r.draft.leftOut, provider: r.provider, model: r.model, created_by: s.userId,
    }]).select("id").single();
    if (error || !row) return fail("Could not record the draft. Please try again.", 500);
    return NextResponse.json({ draftId: row.id, draft: r.draft });
  } catch (e) {
    if (e instanceof AiError) return fail(e.message, e.status);
    console.error("AI scribe failed:", e instanceof Error ? e.message : e);
    return fail("The AI could not draft that. Please try again.", 500);
  }
}
