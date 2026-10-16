import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type Options = { limit: number; windowMs: number };

// Per-instance fallback. Serverless instances do not share memory, so the
// api_rate_limits table is the real limit; this still slows a burst that
// lands on one instance, and covers the period before the table exists.
const memory = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function memoryLimited(key: string, { limit, windowMs }: Options): boolean {
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter(t => now - t < windowMs);
  const limited = hits.length >= limit;
  if (!limited) hits.push(now);
  memory.set(key, hits);
  if (memory.size > 5000) memory.clear();
  return limited;
}

/**
 * Returns true when this client has already made `limit` requests to `route`
 * within `windowMs`. IPs are stored hashed. Fails open if the table is missing,
 * so forms keep working before supabase_rate_limits.sql has been run.
 */
export async function isRateLimited(admin: SupabaseClient, request: Request, route: string, opts: Options): Promise<boolean> {
  const key = `${route}:${createHash("sha256").update(clientIp(request)).digest("hex").slice(0, 32)}`;
  if (memoryLimited(key, opts)) return true;

  const since = new Date(Date.now() - opts.windowMs).toISOString();
  const { count, error } = await admin
    .from("api_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", since);
  if (error) {
    console.warn("Rate limit check skipped:", error.message);
    return false;
  }
  if ((count ?? 0) >= opts.limit) return true;

  await admin.from("api_rate_limits").insert([{ key }]);
  // Housekeeping: drop this key's rows that are outside the window
  await admin.from("api_rate_limits").delete().eq("key", key).lt("created_at", since);
  return false;
}

export const TOO_MANY = { error: "Too many attempts. Please try again later." };
