import type { Metadata } from "next";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import LegalPage, { Section } from "@/components/LegalPage";
import { PHONE_DISPLAY, WHATSAPP } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Pricing – DentEase",
  description: "How DentEase is priced today: free to start with no credit card, and who to contact about anything else.",
};

// No amount appears on this page on purpose. DentEase has no billing of its own
// (no payment step, subscription, plan limit or feature lock), so there is no
// price to show. Where a plan has no price, the card says so instead.
const PLANS = [
  {
    name: "Start free",
    label: "Free to start",
    blurb: "Set up your clinic yourself and begin today.",
    points: [
      "No credit card and no setup fee.",
      "Every feature listed below is included.",
      "A three-step setup guide with optional sample data you can remove.",
    ],
    cta: { href: "/register", text: "Create free account" },
  },
  {
    name: "Guided demo",
    label: "No price: a call",
    blurb: "A walkthrough of DentEase on a call before you decide.",
    points: [
      "Send a request and our team contacts you on the number you give.",
      "The demo is free.",
    ],
    cta: { href: "/#demo", text: "Book a demo" },
  },
  {
    name: "Multi-branch",
    label: "Contact us for pricing",
    blurb: "For clinics that run more than one location.",
    points: [
      "One clinic account can have several branches, each with its own patients, billing and stock, and staff assigned to the branches they work in. Tell us about your locations and we will talk it through.",
      "We do not publish a price for this.",
    ],
    cta: { href: WHATSAPP, text: "Contact us on WhatsApp", external: true },
  },
] as const;

const INCLUDED = ["Appointment booking", "Patient records", "Billing & receipts", "Staff scheduling", "Lab case tracking", "Revenue reports"];

const link = "underline decoration-gold underline-offset-2 hover:text-gold";

export default function Pricing() {
  return (
    <LegalPage
      wide
      eyebrow="Pricing"
      title="Simple, and honest"
      intro="DentEase is free to start, with no credit card. This page only shows what is true today, so you will not find a price here that the app does not actually charge."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map(p => (
          <div key={p.name} className="flex flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-[0_12px_32px_rgba(15,29,61,.05)]">
            <h2 className="font-display text-xl font-semibold text-navy">{p.name}</h2>
            <p className="mt-3 font-display text-2xl font-semibold text-gold">{p.label}</p>
            <p className="mt-2 text-sm text-navy/65">{p.blurb}</p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {p.points.map(t => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" /><span>{t}</span></li>
              ))}
            </ul>
            {"external" in p.cta ? (
              <a href={p.cta.href} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-navy/15 px-5 py-3 text-sm font-semibold text-navy transition-colors hover:border-gold">
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> {p.cta.text}
              </a>
            ) : (
              <Link href={p.cta.href} className="mt-6 inline-flex items-center justify-center rounded-full bg-gold px-5 py-3 text-sm font-semibold text-navy transition-all hover:-translate-y-0.5">{p.cta.text}</Link>
            )}
          </div>
        ))}
      </div>

      <Section id="included" title="What every clinic gets">
        <p>There are no plan tiers inside the app, so every clinic account has the same features:</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {INCLUDED.map(t => (
            <li key={t} className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />{t}</li>
          ))}
        </ul>
      </Section>

      <Section id="billing" title="How billing works">
        <ul className="list-none space-y-2">
          <li>DentEase does not charge you through the app: there is no subscription, card form or invoice from DentEase.</li>
          <li>The Billing pages are for your own patients: invoices and payments you record for your clinic. If you connect your own JazzCash, Easypaisa or Stripe account, patients can also pay you online; that money goes to your merchant account and the provider&apos;s own fees apply.</li>
          <li>If you have a pricing question, ask us and we will answer it directly.</li>
        </ul>
        <p>WhatsApp: <a href={WHATSAPP} target="_blank" rel="noreferrer" className={link}>{PHONE_DISPLAY}</a>. Also see our <Link href="/terms" className={link}>Terms of Service</Link>.</p>
      </Section>
    </LegalPage>
  );
}
