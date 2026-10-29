import { NextResponse } from "next/server";
import { staffContext } from "@/lib/serverUser";
import { aiConfig, AI_SETUP_HELP } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

// Whether AI drafting can be used: configured on the server (never reveals the key) and switched on by the clinic.
export async function GET() {
  const s = await staffContext();
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const cfg = aiConfig();
  const { data } = await s.db.from("ai_settings").select("enabled").eq("clinic_id", s.clinicId).maybeSingle();
  return NextResponse.json({
    configured: !!cfg, provider: cfg?.provider ?? null, model: cfg?.model ?? null, enabled: !!data?.enabled, ready: !!cfg && !!data?.enabled,
    owner: s.owner, help: !cfg && s.owner ? AI_SETUP_HELP : null,
  }, { headers: { "Cache-Control": "no-store" } });
}
