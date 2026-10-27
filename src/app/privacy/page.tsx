import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { List, Section, strong } from "@/components/LegalPage";
import { PHONE_DISPLAY, WHATSAPP } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Privacy Policy – DentEase",
  description: "What information DentEase handles, why, who can see it, and how each clinic's data is kept separate.",
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="DentEase is software that dental clinics use to manage patients, appointments, billing and staff. This page explains what information the service handles, why, and who can see it. It describes how the app works today."
    >
      <Section id="roles" title="Who is responsible for what">
        <p>Each clinic decides what patient information to record and is responsible for it. DentEase provides the software that stores that information on the clinic&apos;s behalf. If you are a patient and want to see, correct or remove your record, please ask your clinic.</p>
      </Section>

      <Section id="collect" title="What information is handled">
        <p>{strong("Clinic and staff accounts.")} Your name, email address, clinic name, and optionally the clinic&apos;s phone, address and currency. For staff: name, email, role, active or inactive status and the pages they may open. Passwords are handled by our sign-in provider (Supabase Auth); DentEase does not keep them in its own tables. If you choose Sign in with Google, we receive your name and email from Google.</p>
        <p>{strong("Patient and clinic records, entered by the clinic.")}</p>
        <List items={[
          "Patient details: name, phone, address, age, gender, date of birth, CNIC, email, blood group, emergency contact, guardian and the assigned doctor.",
          "Clinical records: visits, treatments, tooth chart, medical history (allergies, conditions, medications, previous surgeries, notes) and prescriptions.",
          "Files the clinic uploads, such as X-rays, photos and PDFs.",
          "Appointments, walk-in queue tokens, recalls and treatment plans.",
          "Billing and running costs: invoices, payments, expenses, purchases, materials, lab work and doctor commissions.",
          "Online payments, if the clinic switches them on: for each attempt, the amount, the payment provider used, the status and the provider's reference. Card and wallet details are typed on the provider's own page and never reach DentEase.",
        ]} />
        <p>{strong("Forms and the patient portal, if the clinic uses them.")} A clinic can send a patient a link to fill in a medical history form or to sign a consent form. A history answer (allergies, conditions, medicines, surgeries, blood group) is added to that patient&apos;s record. A signed consent stores the wording the patient saw, the name they typed, their drawn signature (an image), the date and time, and a one-way hash of their IP address. A patient can also be invited to create a portal login (an email address and a password handled by Supabase Auth).</p>
        <p>{strong("Online booking.")} When a patient books through a clinic&apos;s public booking page, we receive their name, phone number, reason for visit and the chosen date and time. This becomes an appointment request in that clinic. If the phone number matches an existing patient it is linked to that patient; otherwise a new patient record is created for that clinic.</p>
        <p>{strong("Website forms.")} A demo request holds your name, phone number, clinic name and your answers to the form. A review holds your name, optional clinic name, rating and text; it is shown on our home page only after it has been approved.</p>
        <p>{strong("Technical data.")} A sign-in cookie keeps you signed in. If you untick &ldquo;Remember me&rdquo;, a small flag on your device ends the session when the browser is closed. If you switch the dashboard to dark mode, that preference is saved on your device. To limit repeated form submissions we use your IP address, but we store it only as a one-way hash with a timestamp, never in readable form.</p>
      </Section>

      <Section id="not-collected" title="What is not collected">
        <List items={[
          "Payment card details. DentEase records what a patient paid and how (for example cash or bank transfer); it does not process card payments.",
          "Advertising or analytics trackers. The app contains none.",
        ]} />
      </Section>

      <Section id="why" title="Why we use it">
        <List items={[
          "To run the features a clinic uses: records, appointments, billing, reports and staff access.",
          "To sign people in and enforce each person's permissions.",
          "To answer demo requests and give support.",
          "To prevent abuse of public forms, and to review reviews before they are published.",
        ]} />
        <p>DentEase does not sell patient or clinic data and does not use it for advertising.</p>
      </Section>

      <Section id="who" title="Who can see it">
        <List items={[
          <span key="o">{strong("The clinic owner")} can see everything in their clinic.</span>,
          <span key="s">{strong("Clinic staff")} can open the pages the owner has enabled for them. See <Link href="/security#permissions" className="underline decoration-gold underline-offset-2 hover:text-gold">Data security</Link> for exactly how that is enforced.</span>,
          <span key="c">{strong("Other clinics")} cannot see or change your clinic&apos;s data.</span>,
          <span key="p">{strong("Patients who book online")} see only the confirmation of their own request. They cannot see any record.</span>,
          <span key="pp">{strong("Patients with a portal login")} can read their own record only: their details, appointments, visits, prescriptions, medical history and signed consents, plus their clinic&apos;s name and contact details. They cannot change anything, and the database refuses to show them any other patient&apos;s rows.</span>,
          <span key="d">{strong("DentEase administrators")} hold a super-admin role. It lets them list clinics, moderate reviews and demo requests, and download a clinic&apos;s data (patients, visits, invoices, payments and lab records). This is used to run and support the service.</span>,
          <span key="h">{strong("Our hosting providers")} store the data technically (see below).</span>,
        ]} />
        <p>Two things are public by design: approved reviews (name, clinic name, rating and text), and a clinic&apos;s booking page if the clinic switches it on. The booking page shows the clinic&apos;s name, logo (if the clinic uploaded one), phone and address, a map of that address, its active doctors&apos; names, specialisations and working days, and free appointment times. It shows no patient information. A clinic logo is stored in a public file area, so anyone with the image link can view it.</p>
      </Section>

      <Section id="isolation" title="Keeping clinics separate">
        <p>Every clinic&apos;s records are tied to that clinic in the database, and a signed-in user can read or change only their own clinic&apos;s rows. Uploaded files are private to the clinic. How this works, and its limits, is described on the <Link href="/security" className="underline decoration-gold underline-offset-2 hover:text-gold">Data security</Link> page.</p>
      </Section>

      <Section id="third-parties" title="Other companies involved">
        <List items={[
          <span key="sb">{strong("Supabase")} provides the database, sign-in and file storage where all records are kept.</span>,
          <span key="g">{strong("Google.")} Sign in with Google is optional. Our pages also load their fonts from Google Fonts, and a clinic&apos;s booking page shows a Google Maps map of the clinic&apos;s address, so Google receives the usual request details (such as your IP address and browser) when those pages load.</span>,
          <span key="pay">{strong("Payment providers.")} If a clinic connects Stripe, JazzCash or Easypaisa, a patient who pays online is sent to that provider&apos;s page. The money goes to the clinic&apos;s own merchant account. DentEase keeps the amount, status and reference of the payment so it can be added to the invoice.</span>,
          <span key="w">{strong("WhatsApp.")} Reminder and receipt buttons open WhatsApp with a ready-made message when a staff member clicks them. The message contains the patient&apos;s name and the appointment or invoice details. DentEase does not send WhatsApp messages by itself.</span>,
          <span key="h">{strong("Web hosting.")} Like any website, the server that delivers the app sees standard request information such as IP address.</span>,
        ]} />
      </Section>

      <Section id="retention" title="How long it is kept, and deletion">
        <List items={[
          "Records stay until the clinic deletes them or the clinic account is removed. DentEase does not delete records automatically.",
          "Clinics can delete records from inside the app, for example patients, visits, appointments, prescriptions, files and staff. A signed consent cannot be edited or deleted from inside the app; it is removed only if its patient is deleted.",
          "There is no self-service account deletion yet. To have a whole clinic account and its data removed, contact us.",
          "Clinics can download an Excel report of patients, invoices, payments, expenses and doctors from the Reports page. It is not a full export; ask us if you need everything.",
          "DentEase does not run its own backups. Any backups are made by our database provider under the plan we use, so a deleted record may remain in those backups for a time.",
          "Hashed form-submission entries are removed the next time the same visitor submits that form, once they are older than the time window.",
        ]} />
      </Section>

      <Section id="choices" title="Your choices and how to reach us">
        <p>Patients should contact their clinic. Clinics and website visitors can contact us to ask what we hold, to correct it, to get a copy or to have it removed:</p>
        <p>WhatsApp: <a href={WHATSAPP} target="_blank" rel="noreferrer" className="underline decoration-gold underline-offset-2 hover:text-gold">{PHONE_DISPLAY}</a></p>
      </Section>

      <Section id="children" title="Children">
        <p>DentEase accounts are for clinic staff. Records of young patients are entered by the clinic, which can note a guardian on the record.</p>
      </Section>

      <Section id="changes" title="Changes to this page">
        <p>When how the app handles information changes, we update this page and its date. See also our <Link href="/terms" className="underline decoration-gold underline-offset-2 hover:text-gold">Terms of Service</Link>.</p>
      </Section>
    </LegalPage>
  );
}
