import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAll } from "@/lib/reminders/engine";
import { appOrigin } from "@/lib/payments/engine";

// Called every ~15 minutes by whatever scheduler the deployment uses (Vercel Cron,
// an external cron service, GitHub Actions...). It does the whole job and is safe
// to call as often as you like: each message is sent at most once.
// Protected by CRON_SECRET: send it as "Authorization: Bearer <secret>".

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set on the server." }, { status: 503 });
  const given = Buffer.from((request.headers.get("authorization") || "").replace(/^Bearer /i, ""));
  const want = Buffer.from(secret);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const report = await runAll(db, appOrigin(request));
  return NextResponse.json({ success: true, ...report });
}

export const GET = handle;
export const POST = handle;
