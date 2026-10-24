"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, LayoutDashboard, RotateCcw } from "lucide-react";

/**
 * Error boundary dashboard admin (ADM-20).
 *
 * Ditempatkan di dalam layout `(dashboard)` agar sidebar/header tetap ada dan
 * admin bisa retry tanpa kehilangan konteks. Error tetap dilaporkan ke Sentry
 * bila dikonfigurasi.
 */
export default function AdminDashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[admin] error boundary:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-secondary">
        Gagal memuat halaman admin
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Data dashboard tidak dapat dimuat. Coba lagi; bila masih gagal, buka
        menu lain atau kembali ke Ringkasan.
      </p>
      {error.digest ? (
        <p className="mt-3 text-[11px] text-slate-400">
          Kode kesalahan: <code>{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={retry}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
        >
          <RotateCcw className="h-4 w-4" />
          Coba lagi
        </button>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-secondary transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
        >
          <LayoutDashboard className="h-4 w-4" />
          Ke Ringkasan
        </Link>
      </div>
    </div>
  );
}
