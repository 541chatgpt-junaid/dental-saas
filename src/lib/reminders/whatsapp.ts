import type { SupabaseClient } from "@supabase/supabase-js";
import { open, seal } from "@/lib/secretBox";
import { waNumber } from "@/lib/whatsapp";

// Sends through the clinic's OWN WhatsApp Business (Cloud API) account, so
// messages come from the clinic's number and DentEase holds no sender of its own.
// The access token is stored encrypted and never returned to the browser.
// Server only.

const base = () => (process.env.WHATSAPP_API_BASE || "https://graph.facebook.com/v21.0").replace(/\/$/, "");

export interface Connection { enabled: boolean; phoneNumberId: string; token: string }

export async function loadConnection(db: SupabaseClient, clinicId: string): Promise<Connection | null> {
  const { data } = await db.from("clinic_whatsapp").select("enabled, phone_number_id, token_enc").eq("clinic_id", clinicId).maybeSingle();
  if (!data) return null;
  const v = open<{ token: string }>(data.token_enc);
  return v?.token ? { enabled: !!data.enabled, phoneNumberId: data.phone_number_id, token: v.token } : null;
}

export async function describeConnection(db: SupabaseClient, clinicId: string) {
  const { data } = await db.from("clinic_whatsapp").select("enabled, phone_number_id, token_enc").eq("clinic_id", clinicId).maybeSingle();
  return { connected: !!data && !!open(data.token_enc), enabled: !!data?.enabled, phoneNumberId: data?.phone_number_id ?? "" };
}

export async function saveConnection(db: SupabaseClient, clinicId: string, input: { enabled: boolean; phoneNumberId: string; token: string }): Promise<string | null> {
  const existing = await loadConnection(db, clinicId);
  const phoneNumberId = input.phoneNumberId.trim();
  const token = input.token.trim() || existing?.token || "";
  if (!/^\d{5,25}$/.test(phoneNumberId)) return "Enter the WhatsApp phone number ID (digits only).";
  if (!token) return "Enter the access token.";
  const { error } = await db.from("clinic_whatsapp").upsert({ clinic_id: clinicId, enabled: input.enabled, phone_number_id: phoneNumberId, token_enc: seal({ token }), updated_at: new Date().toISOString() });
  return error ? "Could not save. Please try again." : null;
}

export type SendResult = { ok: true; ref: string } | { ok: false; error: string };

export async function sendWhatsApp(c: Connection, to: string, message: { text: string } | { template: string; lang: string; params: string[] }): Promise<SendResult> {
  const payload = "template" in message
    ? { messaging_product: "whatsapp", to: waNumber(to), type: "template", template: { name: message.template, language: { code: message.lang }, components: [{ type: "body", parameters: message.params.map(text => ({ type: "text", text })) }] } }
    : { messaging_product: "whatsapp", to: waNumber(to), type: "text", text: { body: message.text, preview_url: false } };
  try {
    const res = await fetch(`${base()}/${c.phoneNumberId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    const json = await res.json().catch(() => ({}));
    const ref = json?.messages?.[0]?.id;
    if (res.ok && ref) return { ok: true, ref: String(ref) };
    return { ok: false, error: String(json?.error?.message || `WhatsApp refused the message (${res.status})`).slice(0, 300) };
  } catch {
    return { ok: false, error: "Could not reach WhatsApp." };
  }
}
