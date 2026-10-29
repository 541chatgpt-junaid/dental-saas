import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cronDenied } from "@/lib/cronAuth";
import { clinicsDueForBackup, runBackup } from "@/lib/backup";

// Called on a schedule (see CRON_SECRET). Takes an automatic snapshot of each clinic
// that has none in the last 20 hours, a few clinics per call so it stays inside the
// time limit; the next call carries on. Safe to call as often as you like.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  const denied = cronDenied(request);
  if (denied) return denied;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const due = await clinicsDueForBackup(db);
  let done = 0; const failed: string[] = [];
  for (const id of due) {
    try { await runBackup(db, id, "auto", null); done++; }
    catch (e) { console.error("Automatic backup failed:", e instanceof Error ? e.message : e); failed.push(id); }
  }
  return NextResponse.json({ success: true, backedUp: done, failed: failed.length, waiting: Math.max(0, (await clinicsDueForBackup(db, 1000)).length) });
}

export const GET = handle;
export const POST = handle;
