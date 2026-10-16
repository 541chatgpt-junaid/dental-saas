"use client";
import { useEffect, useRef, useState } from "react";

/** Animates a number from its previous value to `value` with an ease-out-expo curve. */
export default function CountUp({ value, duration = 1400, format = (n: number) => Math.round(n).toLocaleString() }: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const next = begin + (value - begin) * (1 - Math.pow(2, -10 * p));
      setShown(p < 1 ? next : value);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(shown)}</>;
}
