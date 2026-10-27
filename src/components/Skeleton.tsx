/** Placeholder rows shown while a list loads, so no screen sits blank. Matches the app's cards. */
export function SkeletonRows({ rows = 6, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="space-y-3" data-skeleton>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-brand-100 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 w-1/3 rounded bg-brand-100" />
            <div className="h-4 w-16 rounded-full bg-brand-100" />
          </div>
          <div className="mt-3 h-3 w-2/3 rounded bg-brand-50" />
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
