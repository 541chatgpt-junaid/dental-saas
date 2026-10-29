import { useEffect, useState } from "react";

export interface AiStatus { configured: boolean; enabled: boolean; ready: boolean; owner: boolean; provider: string | null; model: string | null; help: string | null }

/** Whether AI drafting can be used here (configured on the server and switched on by the clinic). Buttons only show when `ready`. */
export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/ai/status", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(j => { if (live) setStatus(j); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return status;
}
