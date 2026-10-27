import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { List, Section, strong } from "@/components/LegalPage";
import { PHONE_DISPLAY, WHATSAPP } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Data security – DentEase",
  description: "How DentEase protects clinic data: row-level security, clinic scoping, private files, sign-in and permissions, and the limits you should know about.",
};

const link = "underline decoration-gold underline-offset-2 hover:text-gold";

export default function Security() {
  return (
    <LegalPage
      title="Data security"
      intro="This page describes how DentEase protects clinic data today, in plain terms, including what it does not do. Everything here describes how the app actually behaves."
    >
      <Section id="isolation" title="Clinic isolation">
        <p>Every table that holds clinic data has row-level security switched on in the database: patients, visits, medical history, prescriptions, appointments, doctors, invoices and payments, lab records, expenses, purchases, materials, queue, recalls, treatment plans, settings, staff, booking settings and file records. Each row belongs to one clinic, and the rules let a signed-in user read, add, change or delete only rows of their own clinic.</p>
        <p>These rules sit in the database, so they apply even if someone calls the database interface directly instead of using DentEase&apos;s screens. In our own tests with two clinics, the second clinic saw none of the first clinic&apos;s rows, and its attempts to change them changed nothing. Visitors who are not signed in read nothing.</p>
        <p>As a second layer, the app&apos;s own queries also name the clinic they are for. A few internal tables (form-submission counters, demo requests and reviews) have no access rules for signed-in users at all, so only our server can use them.</p>
      </Section>

      <Section id="files" title="Uploaded files">
        <List items={[
          "X-rays, photos and PDFs go into a private storage area. It is not public.",
          "Each file is stored under its clinic's own folder, and the storage rules let only that clinic's signed-in users read, add or delete files there.",
          "Files open through temporary links that expire after one hour.",
          "Only images and PDFs up to 10 MB are accepted.",
        ]} />
      </Section>

      <Section id="signin" title="Signing in and passwords">
        <List items={[
          "Sign-in is handled by Supabase Auth. DentEase does not keep passwords in its own tables.",
          "Every way of setting a password (sign-up, password reset, creating a staff login) requires at least 8 characters.",
          "Password reset works through a link sent to the account's email address.",
          "Signing in with Google is optional.",
          "If you untick Remember me, your session ends when you close the browser.",
          "Public forms (sign-up, reviews, demo requests and online booking) are limited to a few submissions per hour from one visitor, counted with a hashed IP address.",
        ]} />
      </Section>

      <Section id="permissions" title="Staff permissions">
        <p>The clinic owner can open every page. For other staff, the owner chooses which of these modules they may open: Patients, Appointments, Queue, Treatment Plans, Recalls, Doctors, Commissions, Lab Records, Billing, Materials, Purchases, Expenses, Reports, Settings, Online Booking and Staff (managing staff is a permission like any other, so grant it with care).</p>
        <List items={[
          <span key="a">{strong("In the app,")} every module page is checked on each visit. A staff member without the permission is sent to an Access denied page, and a deactivated staff member is refused on every module page. The Dashboard home page is open to every signed-in member of the clinic.</span>,
          <span key="b">{strong("In the database,")} permissions are also enforced for six modules: Queue, Treatment Plans, Recalls, Commissions, Purchases and Online Booking. Without the permission, those tables return nothing even through the database interface.</span>,
          <span key="d">{strong("Staff accounts")} can be added, changed or removed in the database only by an active clinic admin. A staff member cannot change their own permissions or role, and only a super-admin can create or change a super-admin account.</span>,
          <span key="c">{strong("For all other modules,")} the database enforces the clinic boundary but not the individual permission. Those pages are protected by the app&apos;s page checks.</span>,
        ]} />
      </Section>

      <Section id="payments" title="Online payments">
        <List items={[
          "Each clinic connects its own Stripe, JazzCash or Easypaisa account. Their keys are stored encrypted (AES-256-GCM) with a key that lives only on the server, are never sent back to the browser, and cannot be read through the database interface.",
          "A payment is recorded only after the provider confirms it: a verified Stripe signature (or a direct check with Stripe), a verified JazzCash signature, or a direct inquiry to Easypaisa. A redirect alone is never trusted.",
          "The amount is always worked out on the server from the invoice and checked against what the provider reports; the browser cannot set it.",
          "Each provider transaction can be recorded once, so a repeated or replayed confirmation changes nothing.",
          "Payment links carry a long random token, expire (14 days for invoices, 2 days for booking fees), can be revoked, and show the clinic and invoice number but not the patient's name.",
          "Card and wallet details are entered on the provider's page; DentEase never receives them.",
        ]} />
      </Section>

      <Section id="portal" title="Forms and the patient portal">
        <List items={[
          "A history or consent link carries a long random token, expires, can be revoked and can be used once. It opens only the one form it was made for.",
          "Portal logins are created by the server and marked as patient logins. The database lets such a login read only rows that belong to its own patient record and its own clinic's name and contact details, and gives it no way to add, change or delete anything. In our tests, a second patient saw none of the first patient's rows.",
          "A patient login is sent to the portal and away from the clinic dashboard.",
          "A signed consent is saved by the server only. It has no update or delete rule, so it cannot be edited through the database interface. It stores the wording, typed name, drawn signature, timestamp, a sha256 tamper-check value and a hashed IP address.",
          "These forms are an electronic record of agreement. DentEase does not claim they meet any specific e-signature law.",
        ]} />
      </Section>

      <Section id="public" title="What is open to the public">
        <p>A clinic&apos;s booking page, if switched on, shows only the clinic&apos;s name, logo, phone and address, a Google Maps map of that address, its active doctors&apos; names, specialisations and working days, and free times. No patient information appears there. Logos are kept in a public file area (PNG, JPG or WebP, up to 1 MB), and only the clinic owner can upload or remove one. Approved reviews on the home page show the reviewer&apos;s name, clinic name, rating and text.</p>
      </Section>

      <Section id="servers" title="Servers and administrators">
        <List items={[
          "The database service key is used only on the server, for tasks such as registering clinics, creating staff logins, taking bookings and the admin panel. It is never sent to the browser.",
          "Admin-panel actions check the caller's super-admin role on every request.",
          "DentEase administrators with that role can list clinics and download any clinic's data. We say so openly in the Privacy Policy.",
        ]} />
      </Section>

      <Section id="encryption" title="Encryption">
        <p>Connections to the database and file storage use HTTPS. Data at rest is encrypted by our database provider, Supabase, as part of its platform. DentEase does not add an extra layer of encryption of its own on top.</p>
      </Section>

      <Section id="limits" title="What DentEase does not do">
        <List items={[
          "It does not keep an audit trail of who viewed or changed each record.",
          "It does not offer two-factor authentication.",
          "It does not sign users out after a period of inactivity (only the Remember me choice above).",
          "It does not run its own backups; any backups are made by the database provider under the plan we use.",
          "It does not hold a formal security certification, and we make no claim of compliance with any specific healthcare-privacy regulation.",
        ]} />
      </Section>

      <Section id="report" title="Reporting a security concern">
        <p>If you think you have found a weakness or that an account has been accessed by the wrong person, please tell us straight away on WhatsApp <a href={WHATSAPP} target="_blank" rel="noreferrer" className={link}>{PHONE_DISPLAY}</a>. See also the <Link href="/privacy" className={link}>Privacy Policy</Link> and <Link href="/terms" className={link}>Terms of Service</Link>.</p>
      </Section>
    </LegalPage>
  );
}
