import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Payment-provider credentials are stored encrypted (AES-256-GCM) so a database
// export or a leaked row never contains a usable secret. The key lives only in
// the server environment (PAYMENT_SECRETS_KEY, 32 random bytes as base64).
// Server only.

function key(): Buffer | null {
  const raw = process.env.PAYMENT_SECRETS_KEY;
  if (!raw) return null;
  const k = Buffer.from(raw, "base64");
  return k.length === 32 ? k : null;
}

export const secretBoxReady = () => key() !== null;

export function seal(value: unknown): string {
  const k = key();
  if (!k) throw new Error("PAYMENT_SECRETS_KEY is not set (32 random bytes, base64).");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([c.update(JSON.stringify(value), "utf8"), c.final()]);
  return `v1.${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${enc.toString("base64")}`;
}

export function open<T = Record<string, string>>(sealed: string): T | null {
  const k = key();
  const [v, iv, tag, data] = sealed.split(".");
  if (!k || v !== "v1" || !iv || !tag || !data) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}
