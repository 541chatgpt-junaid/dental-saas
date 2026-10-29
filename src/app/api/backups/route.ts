import { NextResponse } from "next/server";
import { clinicOwner } from "@/lib/serverUser";
import { BUCKET, loadSnapshot, restoreMissing, runBackup } from "@/lib/backup";
import { isRateLimited } from "@/lib/rateLimit";

// The clinic owner's view of the clinic's backups: list, take one now, download one,
// and put back records that were deleted by mistake.
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const maxDuration = 60;

export async function GET(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can see backups.", 403);
  const dl = new URL(request.url).searchParams.get("download");
  if (dl) {
    const { data: rec } = await o.db.from("clinic_backups").select("path, created_at").eq("id", dl).eq("clinic_id", o.clinicId).maybeSingle();
    if (!rec) return fail("Backup not found.", 404);
    const { data: blob } = await o.db.storage.from(BUCKET).download(rec.path);
    if (!blob) return fail("The backup file is missing.", 404);
    return new Response(await blob.arrayBuffer(), { headers: { "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename="dentease-backup-${String(rec.created_at).slice(0, 10)}.json.gz"` } });
  }
  const { data } = await o.db.from("clinic_backups").select("id, kind, size_bytes, row_counts, created_at").eq("clinic_id", o.clinicId).order("created_at", { ascending: false });
  return NextResponse.json({ backups: data || [] });
}

export async function POST(request: Request) {
  const o = await clinicOwner();
  if (!o) return fail("Only the clinic owner can manage backups.", 403);
  if (await isRateLimited(o.db, request, `backup:${o.clinicId}`, { limit: 12, windowMs: 3_600_000 })) return fail("Too many backup requests. Please wait a little.", 429);
  const b = await request.json().catch(() => null);
  try {
    if (b?.action === "backup") {
      const rec = await runBackup(o.db, o.clinicId, "manual", null);
      return NextResponse.json({ success: true, backup: rec });
    }
    if (b?.action === "restore" && typeof b.id === "string") {
      const snap = await loadSnapshot(o.db, o.clinicId, b.id);
      if (!snap) return fail("That backup could not be read.", 404);
      const r = await restoreMissing(o.db, o.clinicId, snap);
      return NextResponse.json({ success: true, ...r });
    }
  } catch (e) {
    console.error("Backup action failed:", e instanceof Error ? e.message : e);
    return fail("That did not work. Please try again.", 500);
  }
  return fail("Unknown action.");
}
