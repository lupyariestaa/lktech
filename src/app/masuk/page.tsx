import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserLoginForm } from "@/components/auth/user-login-form";
import { safeRedirectPath } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Masuk Akun",
  description:
    "Masuk ke akun LKTech Anda dengan Google untuk membeli produk dan mengelola pesanan.",
  robots: { index: false, follow: false },
};

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  // Hanya terima path relatif internal (cegah open-redirect).
  const redirectTo = safeRedirectPath(rawNext);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-16">
      <div className="grid-lines absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[26rem] w-[26rem] animate-aurora rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] animate-aurora rounded-full bg-primary-light/15 blur-[120px] [animation-delay:-6s]" />

      <div className="relative flex w-full flex-col items-center">
        <UserLoginForm redirectTo={redirectTo} />
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke website
        </Link>
      </div>
    </div>
  );
}
