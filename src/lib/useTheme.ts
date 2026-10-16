"use client";
import { useCallback, useSyncExternalStore } from "react";

const KEY = "de-theme";

function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

const isDarkNow = () => document.documentElement.dataset.theme === "dark";

/** Dashboard light/dark theme, stored in localStorage and applied as data-theme on <html>. */
export function useTheme() {
  const dark = useSyncExternalStore(subscribe, isDarkNow, () => false);
  const toggle = useCallback(() => {
    const next = !isDarkNow();
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch {}
  }, []);
  return { dark, toggle };
}
