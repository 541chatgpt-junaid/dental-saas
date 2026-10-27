"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useClinic } from "@/lib/ClinicContext";
import { localToday, type Token } from "@/lib/queue";

/** Full-screen "Now serving" board for a TV in the waiting area. Refreshes every 5 seconds. */
export default function QueueDisplay() {
  const { clinicName } = useClinic();
  const [tokens, setTokens] = useState<Token[]>([]);
  // The clock is client-only: the server cannot know the viewer's time or timezone, so both
  // sides first render the same placeholder and the real time appears after mount.
  const [now, setNow] = useState<Date | null>(null);
  const [sound, setSound] = useState(false);
  const announced = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient().from("queue_tokens").select("*")
      .eq("token_date", localToday()).order("token_no", { ascending: true });
    if (data) setTokens(data as Token[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
    const poll = setInterval(load, 5000);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the client-only clock after mount
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [load]);

  const serving = tokens.filter(t => t.status === "in_chair").sort((a, b) => (b.called_at || "").localeCompare(a.called_at || ""));
  const next = tokens.filter(t => t.status === "waiting").slice(0, 6);

  // Chime + spoken announcement when a new token is called (needs one click to enable, per browser rules)
  useEffect(() => {
    const ids = new Set(serving.map(t => `${t.id}:${t.called_at}`));
    if (announced.current === null) { announced.current = ids; return; }
    const fresh = serving.filter(t => !announced.current!.has(`${t.id}:${t.called_at}`));
    announced.current = ids;
    if (!sound || !fresh.length) return;
    try {
      const ctx = new AudioContext();
      [880, 660].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.35);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 0.3);
        o.start(ctx.currentTime + i * 0.35); o.stop(ctx.currentTime + i * 0.35 + 0.3);
      });
      fresh.forEach(t => {
        const u = new SpeechSynthesisUtterance(`Token number ${t.token_no}${t.doctor_name ? `, please proceed to Doctor ${t.doctor_name}` : ", please proceed"}`);
        u.rate = 0.9;
        window.speechSynthesis?.speak(u);
      });
    } catch { /* audio not available */ }
  }, [serving, sound]);

  return (
    <div className="min-h-screen bg-navy text-white" style={{ backgroundImage: "radial-gradient(rgba(212,175,55,.08) 1px, transparent 1.4px)", backgroundSize: "26px 26px" }}>
      <header className="flex items-center justify-between px-8 py-6 md:px-12">
        <p className="font-display text-2xl font-semibold md:text-3xl">{clinicName || <>Dent<span className="text-gold">Ease</span></>}</p>
        <div className="flex items-center gap-4">
          <p className="font-display text-2xl tabular-nums text-white/80 md:text-3xl">{now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
          <button onClick={() => setSound(s => !s)} aria-pressed={sound} title={sound ? "Mute announcements" : "Turn on announcements"}
            className="rounded-full border border-white/20 p-2.5 text-white/70 hover:border-gold hover:text-gold">
            {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <main className="grid gap-8 px-8 pb-10 md:grid-cols-[1.4fr_1fr] md:px-12">
        <section>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gold">Now serving</p>
          {serving.length === 0 ? (
            <div className="flex h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-2xl text-white/50">Please wait to be called</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {serving.map(t => (
                <div key={`${t.id}:${t.called_at}`} className="animate-scale-in rounded-3xl border border-gold/40 bg-white/5 p-8 text-center shadow-[0_0_60px_rgba(212,175,55,.15)]">
                  <p className="text-sm uppercase tracking-[0.25em] text-white/60">Token</p>
                  <p className="font-display text-8xl font-bold leading-none text-gold md:text-9xl">{t.token_no}</p>
                  <p className="mt-4 text-xl text-white/85">{t.doctor_name ? `Dr. ${t.doctor_name}` : "Please proceed"}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gold">Next</p>
          <ul className="space-y-3">
            {next.length === 0 && <li className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-lg text-white/50">No one waiting</li>}
            {next.map((t, i) => (
              <li key={t.id} className="flex animate-fade-up items-center gap-5 rounded-2xl border border-white/10 bg-white/5 px-6 py-4" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="font-display text-4xl font-bold text-white">{t.token_no}</span>
                <span className="text-lg text-white/70">{t.doctor_name ? `Dr. ${t.doctor_name}` : "Any doctor"}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
