import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 p-4">
      <div className="w-full max-w-md animate-scale-in rounded-2xl border border-brand-100 bg-white p-8 text-center shadow-[0_20px_50px_rgba(15,29,61,.08)]">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-gold ring-1 ring-brand-100">
          <ShieldAlert className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h1 className="mb-2 text-2xl font-semibold text-brand-800">Access denied</h1>
        <p className="mb-6 text-sm text-brand-500">
          Your account does not have permission to open this page. Ask your clinic admin to enable it for you in Staff settings.
        </p>
        <Link href="/dashboard" className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
