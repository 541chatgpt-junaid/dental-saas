import type { Metadata } from "next";
import PayClient from "./PayClient";

export const metadata: Metadata = {
  title: "Pay online",
  description: "Pay your dental invoice securely online.",
  robots: { index: false, follow: false },
};

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PayClient token={token} />;
}
