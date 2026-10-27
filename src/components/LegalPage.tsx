import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const LEGAL_UPDATED = "27 October 2026";

const LINKS = [["/pricing", "Pricing"], ["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"], ["/security", "Data security"]] as const;

/** Shared frame for the Privacy, Terms and Data-security pages */
export default function LegalPage({ title, intro, children, eyebrow = "Legal", wide = false }: { title: string; intro: string; children: React.ReactNode; eyebrow?: string; wide?: boolean }) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="min-h-screen bg-cream-2">
      <header className="bg-navy">
        <div className={`mx-auto flex ${width} items-center justify-between px-4 py-4 sm:px-6`}>
          <Link href="/" aria-label="DentEase home" className="font-display text-2xl font-semibold tracking-tight text-white">
            Dent<span className="text-gold">Ease</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
          </Link>
        </div>
      </header>

      <main className={`mx-auto ${width} px-4 py-10 sm:px-6 md:py-14`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-navy md:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-navy/50">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-5 text-base leading-relaxed text-navy/75">{intro}</p>
        <div className="mt-8 space-y-9 text-[15px] leading-relaxed text-navy/80">{children}</div>
      </main>

      <footer className="border-t border-brand-100 bg-white">
        <nav aria-label="Legal" className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm sm:px-6`}>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LINKS.map(([href, label]) => <Link key={href} href={href} className="text-navy/60 transition-colors hover:text-gold">{label}</Link>)}
          </div>
          <p className="text-xs text-navy/45">© {new Date().getFullYear()} DentEase</p>
        </nav>
      </footer>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-xl font-semibold text-navy md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /><span>{it}</span></li>
      ))}
    </ul>
  );
}

export const strong = (t: string) => <strong className="font-semibold text-navy">{t}</strong>;
