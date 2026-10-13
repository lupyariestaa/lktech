import { SITE } from "@/lib/site";

/**
 * PWA (Tema 3.5, B2) — konstanta bersama.
 *
 * `PWA_CACHE` adalah versi cache service worker. **Naikkan** nilainya setiap kali
 * `public/sw.js` berubah agar cache lama dibersihkan saat `activate`. Nilai ini
 * WAJIB sama dengan `CACHE` di `public/sw.js` (dijaga oleh `scripts/pwa.test.ts`,
 * karena service worker vanilla tidak bisa mengimpor modul TS).
 */
export const PWA_CACHE = "lktech-pwa-v1";

/** Warna tema manifest — selaras dengan `viewport.themeColor` (layout.tsx). */
export const PWA_THEME_COLOR = "#004EDF";

/** Nama & deskripsi ringkas untuk manifest. */
export const PWA_NAME = `${SITE.name} — Jasa Web, Aplikasi & Produk Digital`;
export const PWA_SHORT_NAME = SITE.name;

/** Ikon PWA (URL stabil — file statis, bukan ikon ber-hash Next). */
export const PWA_ICONS = {
  p192: "/icons/icon-192.png",
  p512: "/icons/icon-512.png",
  maskable: "/icons/icon-maskable-512.png",
} as const;

/** Halaman fallback saat offline. */
export const PWA_OFFLINE_PATH = "/offline";