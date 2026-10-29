import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";
import { isRateLimited } from "@/lib/rateLimit";
import { aiConfig, AI_SETUP_HELP } from "@/lib/ai/provider";

type Staff = NonNullable<Awaited<ReturnType<typeof staffContext>>>;
export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

/** Signed-in staff with the right module, AI switched on for the clinic and configured on the server, and under the hourly cap */
export async function aiGuard(request: Request, module: string | "owner"): Promise<{ s: Staff } | { res: NextResponse }> {
  const s = await staffContext();
  if (!s) return { res: fail("Not signed in.", 401) };
  if (module === "owner" ? !s.owner : !s.can(module)) return { res: fail(module === "owner" ? "Only the clinic owner can do this." : `You need access to ${module} to use this.`, 403) };
  const { data: set } = await s.db.from("ai_settings").select("enabled").eq("clinic_id", s.clinicId).maybeSingle();
  if (!set?.enabled) return { res: fail("AI drafting is switched off. The clinic owner can switch it on in Settings > AI assistant.", 403) };
  if (!aiConfig()) return { res: fail(s.owner ? `AI is not set up on this server. ${AI_SETUP_HELP}` : "AI is not set up on this server. Ask the person who runs DentEase.", 503) };
  if (await isRateLimited(s.db, request, `ai:${s.clinicId}`, { limit: 60, windowMs: 3_600_000 })) return { res: fail("You have used a lot of AI drafts this hour. Please wait a little.", 429) };
  return { s };
}
