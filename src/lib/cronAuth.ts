import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Shared check for the scheduler endpoints: the caller must send the server's CRON_SECRET as a Bearer token. */
export function cronDenied(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set on the server." }, { status: 503 });
  const given = Buffer.from((request.headers.get("authorization") || "").replace(/^Bearer /i, ""));
  const want = Buffer.from(secret);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
