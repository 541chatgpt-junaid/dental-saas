import type { LucideIcon } from "lucide-react";

/** Friendly placeholder for lists and tables with nothing in them yet. */
export default function EmptyState({ icon: Icon, title, hint, compact = false }: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex animate-fade-in flex-col items-center justify-center text-center ${compact ? "px-4 py-6" : "px-6 py-12"}`}>
      <span className={`mb-3 flex items-center justify-center rounded-2xl bg-brand-50 text-gold ring-1 ring-brand-100 ${compact ? "h-11 w-11" : "h-14 w-14"}`}>
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="font-display text-base font-semibold text-brand-800">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-brand-500">{hint}</p>}
    </div>
  );
}
