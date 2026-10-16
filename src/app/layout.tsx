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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body className="bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  );
}