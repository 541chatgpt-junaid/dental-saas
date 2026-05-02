import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DentEase – Best Dental Clinic Management Software in Pakistan",
  description:
    "DentEase is the #1 dental clinic management software in Pakistan. Manage patients, appointments, lab records, staff & revenue in one place. Free to use. No credit card required.",
  keywords: [
    "dental clinic software pakistan",
    "dental management software",
    "dentist software pakistan",
    "dental clinic app",
    "patient management dental",
    "lab record dental software",
    "dental appointment software",
    "best dental software pakistan",
    "dental clinic management system",
    "dental EMR software",
  ],
  openGraph: {
    title: "DentEase – Best Dental Clinic Management Software",
    description:
      "Manage patients, appointments, lab records, staff & revenue in one place. Free to use.",
    type: "website",
    locale: "en_PK",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}