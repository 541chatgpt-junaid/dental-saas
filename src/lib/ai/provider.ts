// The AI provider, taken ONLY from the server's environment. There is no key,
// provider or model baked into the code. Server only.
//
//   ANTHROPIC_API_KEY                         -> Anthropic Messages API
//   OPENAI_API_KEY (or AI_API_KEY + AI_BASE_URL) + AI_MODEL
//                                             -> any OpenAI-compatible chat endpoint
//   AI_PROVIDER = anthropic | openai          -> force the choice
//   AI_API_KEY, AI_MODEL, AI_BASE_URL         -> override the key / model / endpoint

export interface AiConfig { provider: "anthropic" | "openai"; apiKey: string; model: string; baseUrl: string }

const env = (k: string) => (process.env[k] || "").trim();

export function aiConfig(): AiConfig | null {
  const forced = env("AI_PROVIDER").toLowerCase();
  const provider = forced === "anthropic" || forced === "openai" ? forced
    : env("ANTHROPIC_API_KEY") ? "anthropic"
    : env("OPENAI_API_KEY") || (env("AI_API_KEY") && env("AI_BASE_URL")) ? "openai" : null;
  if (!provider) return null;
  const apiKey = env("AI_API_KEY") || env(provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY");
  if (!apiKey) return null;
  // Anthropic has a documented default endpoint; for an OpenAI-compatible service the model must be named explicitly
  const model = env("AI_MODEL") || (provider === "anthropic" ? "claude-sonnet-5-5" : "");
  if (!model) return null;
  const baseUrl = (env("AI_BASE_URL") || (provider === "anthropic" ? "https://api.anthropic.com" : "https://api.openai.com/v1")).replace(/\/$/, "");
  return { provider, apiKey, model, baseUrl };
}

/** What an operator must set when no provider is configured (shown to the clinic owner; never contains a value) */
export const AI_SETUP_HELP = "Set ANTHROPIC_API_KEY on the server (optionally AI_MODEL), or, for an OpenAI-compatible service, AI_PROVIDER=openai with AI_API_KEY, AI_BASE_URL and AI_MODEL.";

export class AiError extends Error {
  constructor(message: string, readonly status = 502) { super(message); }
}

export async function complete(system: string, user: string, maxTokens = 900): Promise<{ text: string; provider: string; model: string }> {
  const cfg = aiConfig();
  if (!cfg) throw new AiError("AI is not set up on this server.", 503);
  const url = cfg.provider === "anthropic" ? `${cfg.baseUrl}/v1/messages` : `${cfg.baseUrl}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let body: unknown;
  if (cfg.provider === "anthropic") {
    headers["x-api-key"] = cfg.apiKey; headers["anthropic-version"] = "2023-06-01";
    body = { model: cfg.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] };
  } else {
    headers.Authorization = `Bearer ${cfg.apiKey}`;
    body = { model: cfg.model, messages: [{ role: "system", content: system }, { role: "user", content: user }] };
  }
  let res: Response;
  try { res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(45_000) }); }
  catch { throw new AiError("Could not reach the AI service. Please try again."); }
  if (res.status === 401 || res.status === 403) throw new AiError("The AI service refused the server's key. Ask the person who runs DentEase to check it.", 502);
  if (res.status === 429) throw new AiError("The AI service is busy. Please try again in a minute.", 503);
  if (!res.ok) throw new AiError("The AI service could not answer. Please try again.");
  const json = await res.json().catch(() => null);
  const text = cfg.provider === "anthropic"
    ? (json?.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("")
    : json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new AiError("The AI service returned nothing. Please try again.");
  return { text, provider: cfg.provider, model: cfg.model };
}

/** The first JSON object in a model reply (models sometimes wrap it in prose or code fences) */
export function parseJson<T = Record<string, unknown>>(text: string): T | null {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)) as T; } catch { return null; }
}
