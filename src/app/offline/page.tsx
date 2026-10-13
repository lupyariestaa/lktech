import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { SITE } from "@/lib/site";
import { ReloadButton } from "@/components/reload-button";

export const metadata: Metadata = {
  title: "Tidak ada koneksi",
  description: "Halaman tidak dapat dimuat karena koneksi terputus.",
  robots: { index: false, follow: false },
};

/**
 * Halaman fallback offline (PWA — Tema 3.5, B2). Ditampilkan service worker
 * (`public/sw.js`) saat navigasi gagal karena jaringan putus. Statik & ringan.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-20">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WifiOff className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Koneksi terputus
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Kami tidak bisa memuat halaman ini karena tidak ada jaringan. Periksa
          koneksi Anda, lalu coba lagi.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ReloadButton />
          <Link
            href="/produk"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface"
          >
            Lihat produk
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted">
          {SITE.name} — Teknologi Modern, Hasil Nyata
        </p>
      </div>
    </main>
  );
}