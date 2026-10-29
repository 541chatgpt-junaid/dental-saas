import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai/provider";
import { aiGuard, fail } from "@/lib/ai/guard";
import { draftRecall, draftReviewReply, draftReviewRequest, recallFacts, replyFacts, reviewFacts, type Drafted, type Language } from "@/lib/ai/tools";

// Draft a recall message, a review request or a reply to a review. The result is a DRAFT:
// nothing is sent or saved on a patient's record here. Staff read, edit and approve it
// (see /api/ai/approve).
export const maxDuration = 60;

const clean = (o: Record<string, unknown>) => JSON.parse(JSON.stringify(o)) as Record<string, unknown>;

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const tool = b?.tool;
  if (tool !== "recall" && tool !== "review_request" && tool !== "review_reply") return fail("Choose what to draft.");
  const g = await aiGuard(request, tool === "recall" ? "Recalls" : tool === "review_request" ? "Appointments" : "owner");
  if ("res" in g) return g.res;
  const { s } = g;
  const language: Language = b?.language === "Roman Urdu" ? "Roman Urdu" : "English";

  let patientId: number | null = null, ref: string | null = null, out: Drafted;
  try {
    if (tool === "review_reply") {
      const text = String(b?.reviewText ?? "").trim();
      if (text.length < 10) return fail("Paste the review text first.");
      const rating = Number(b?.rating);
      const f = await replyFacts(s.db, s.clinicId, { reviewerName: String(b?.reviewerName ?? ""), rating: rating >= 1 && rating <= 5 ? rating : null, reviewText: text });
      out = await draftReviewReply(f.facts);
    } else {
      const f = tool === "recall" ? await recallFacts(s.db, s.clinicId, String(b?.recallId ?? "")) : await reviewFacts(s.db, s.clinicId, Number(b?.appointmentId));
      if ("error" in f) return fail(String(f.error), 404);
      // The same rule as the automatic messages: no contact consent on record, no message
      if (f.patient.contact_consent !== true) return fail("This patient has no contact consent on record, so no message can be drafted or sent. Record their agreement on the patient record first.", 409);
      if (f.phone.replace(/\D/g, "").length < 7) return fail("This patient has no phone number on record.", 409);
      patientId = f.patient.id; ref = tool === "recall" ? String(b.recallId) : String(b.appointmentId);
      out = tool === "recall" ? await draftRecall(f.facts, language) : await draftReviewRequest(f.facts, language);
    }
  } catch (e) {
    if (e instanceof AiError) return fail(e.message, e.status);
    console.error("AI draft failed:", e instanceof Error ? e.message : e);
    return fail("The AI could not draft that. Please try again.", 500);
  }

  const { data: row, error } = await s.db.from("ai_drafts").insert([{
    clinic_id: s.clinicId, patient_id: patientId, tool, ref, facts: clean(out.facts), draft: { message: out.message, usedTemplate: out.usedTemplate },
    warnings: out.warnings, provider: out.provider, model: out.model, created_by: s.userId,
  }]).select("id").single();
  if (error || !row) return fail("Could not record the draft. Please try again.", 500);
  return NextResponse.json({ draftId: row.id, message: out.message, warnings: out.warnings, usedTemplate: out.usedTemplate, sent: clean(out.facts) });
}
