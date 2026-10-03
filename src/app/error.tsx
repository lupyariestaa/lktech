"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

/**
 * Error boundary global. Menampilkan halaman error yang ramah (dengan brand)
 * alih-alih halaman error default Next.js.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Laporkan ke Sentry (no-op bila tidak dikonfigurasi) + log lokal.
    Sentry.captureException(error);
    console.error("[app] error boundary:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-24">
      <div className="grid-lines absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[26rem] w-[26rem] animate-aurora rounded-full bg-rose-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-50 text-rose-500">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-secondary sm:text-3xl">
          Terjadi kesalahan
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
          Maaf, ada masalah saat memuat halaman ini. Coba muat ulang; bila masih
          berlanjut, silakan kembali ke beranda.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            <RotateCcw className="h-4 w-4" />
            Coba lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-secondary backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
          >
            <Home className="h-4 w-4" />
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
