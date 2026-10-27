import type { Metadata } from "next";
import FormClient from "./FormClient";

export const metadata: Metadata = {
  title: "Patient form",
  description: "Fill in your form for your dental clinic.",
  robots: { index: false, follow: false },
};

export default async function FormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <FormClient token={token} />;
}
