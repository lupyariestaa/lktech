"use client";

import { RefreshCw } from "lucide-react";

/**
 * Tombol "Coba lagi" untuk halaman offline (PWA, B2). Memuat ulang dari jaringan
 * — dipisah jadi komponen klien agar halaman offline tetap server component.
 */
export function ReloadButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
    >
      <RefreshCw className="h-4 w-4" aria-hidden />
      Coba lagi
    </button>
  );
}