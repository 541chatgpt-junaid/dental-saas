import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { List, Section, strong } from "@/components/LegalPage";
import { PHONE_DISPLAY, WHATSAPP } from "@/lib/siteContact";

export const metadata: Metadata = {
  title: "Terms of Service – DentEase",
  description: "The terms for using DentEase, the dental clinic management software.",
};

const link = "underline decoration-gold underline-offset-2 hover:text-gold";

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms apply when you create a DentEase account or use the service. By ticking the box when you sign up, or by using DentEase, you agree to them. If you do not agree, please do not use the service."
    >
      <Section id="service" title="The service">
        <p>DentEase is web software for dental clinics: patient records, appointments, a walk-in queue, billing, lab and inventory records, reports, staff access and an optional online booking page. It is provided on the internet and works in a web browser.</p>
      </Section>

      <Section id="accounts" title="Accounts and staff">
        <List items={[
          "The person who creates a clinic account is its owner and is responsible for everything done under that clinic, including by the staff they add.",
          "Choose a password of at least 8 characters, keep it private, and do not share one login between several people.",
          "The owner decides which pages each staff member can open, and should deactivate or remove people who leave the clinic.",
          "Tell us promptly if you think an account has been accessed by someone who should not have it.",
        ]} />
      </Section>

      <Section id="your-data" title="Your data and your responsibilities">
        <List items={[
          "The records you enter belong to your clinic. We use them only to provide the service, as described in the Privacy Policy.",
          <span key="p">{strong("You are responsible for your patients' information:")} that you may lawfully collect and record it, that your patients know how it is used, and that it is accurate.</span>,
          "DentEase is a record-keeping tool. It does not give medical advice. Features such as allergy alerts and recall reminders are aids; clinical decisions remain yours.",
          "Do not upload anything you have no right to store.",
        ]} />
        <p>Read our <Link href="/privacy" className={link}>Privacy Policy</Link> and <Link href="/security" className={link}>Data security</Link> page for how information is handled and protected.</p>
      </Section>

      <Section id="billing-records" title="Billing figures">
        <p>Invoice totals, balances, statuses and reports are calculated from the invoices and payments you record. Check them against your own records. DentEase records payments; it does not collect or process them, and it is not an accounting or tax service.</p>
      </Section>

      <Section id="online-payments" title="Online payments">
        <List items={[
          "Online payments are optional. A clinic connects its own Stripe, JazzCash or Easypaisa merchant account in Settings, and patients pay the clinic through that provider.",
          "DentEase does not hold or transfer your money. The provider's own terms, fees, limits and refund rules apply, and the clinic is responsible for its agreement with the provider.",
          "A payment is added to an invoice only after the provider confirms it. Refunds and disputes are handled with the provider and then recorded by the clinic.",
          "If you set an advance booking fee, you decide the amount. It is recorded as a payment and deducted from the patient's invoice when you apply it.",
        ]} />
      </Section>

      <Section id="forms" title="Digital forms, consent and the patient portal">
        <List items={[
          "Consent wording is written by the clinic. DentEase supplies no legal text and does not check that a form is valid or enough for your purposes or your area; that is for the clinic and its advisers.",
          "A signature drawn on a screen with a typed name is stored with the wording shown, a timestamp and a tamper-check value. Whether it is accepted as proof of consent is a matter for the law that applies to the clinic.",
          "A form link is private to the patient it was sent to and works once. The clinic should send it only to that patient, and can revoke it.",
          "The clinic decides which patients get a portal login and is responsible for sending an invitation to the right person.",
        ]} />
      </Section>

      <Section id="booking" title="Online booking">
        <p>If you switch on your booking page, patients can send appointment requests. A request is not a confirmed appointment until your clinic confirms it. You are responsible for answering requests and for the working days, hours and doctors you publish.</p>
      </Section>

      <Section id="use" title="Acceptable use">
        <p>You agree not to:</p>
        <List items={[
          "use DentEase for anything unlawful or to harm others;",
          "try to reach another clinic's data, or to get around permissions or other limits;",
          "disrupt or overload the service, or misuse the public forms (they are rate-limited);",
          "copy, resell or reverse-engineer the service.",
        ]} />
      </Section>

      <Section id="content" title="Reviews and requests you send us">
        <p>Reviews you submit may be published on our home page with your name, clinic name and rating after we approve them. We may decline or remove a review. Demo requests are used to contact you about DentEase.</p>
      </Section>

      <Section id="availability" title="Availability and changes">
        <p>We work to keep DentEase running, but we do not guarantee that it will always be available or error-free, and features may change. We may suspend a clinic account that breaks these terms or puts the service or other clinics at risk.</p>
      </Section>

      <Section id="ending" title="Ending your use">
        <p>You can stop using DentEase at any time. To have your clinic account and its data removed, or to get a fuller copy of your data than the Reports export provides, contact us. Records stay in the service until they are deleted, as set out in the Privacy Policy.</p>
      </Section>

      <Section id="liability" title="Limits of our responsibility">
        <p>To the extent the law allows, DentEase is provided &ldquo;as is&rdquo;, and we are not liable for indirect or consequential loss, or for loss caused by information entered incorrectly, by a password that was shared or lost, or by events outside our control. Nothing in these terms limits any right you have that the law does not allow to be limited.</p>
      </Section>

      <Section id="changes" title="Changes and contact">
        <p>We may update these terms; the date at the top shows the latest version, and continuing to use DentEase after a change means you accept it. Questions: WhatsApp <a href={WHATSAPP} target="_blank" rel="noreferrer" className={link}>{PHONE_DISPLAY}</a>.</p>
      </Section>
    </LegalPage>
  );
}
