"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Media query umum yang dipakai lintas komponen (sumber tunggal).
 * Selaras dengan breakpoint Tailwind (sm = 640, md = 768, lg = 1024).
 */
export const MEDIA_QUERIES = {
  /** Tablet ke atas — dipakai untuk mengaktifkan efek berat (mis. 3D/WebGL). */
  tabletUp: "(min-width: 768px)",
  /** Desktop ke atas. */
  desktopUp: "(min-width: 1024px)",
} as const;

/**
 * Hook media query yang aman untuk SSR.
 *
 * - Server (SSR) & render pertama klien → `false` (konservatif: efek berat
 *   tidak diaktifkan sampai ukuran layar sebenarnya diketahui). Ini mencegah
 *   hydration mismatch.
 * - Setelah mount → nilai sebenarnya, dan ikut berubah saat viewport berubah.
 *
 * Dipakai sebagai "gate" efek mahal (mis. cursor glow di desktop, 3D/WebGL)
 * agar hanya aktif di layar besar — lihat
 * `docs/2026-10-15-blueprint-upgrade-homepage-uiux.md` (F0/F1/F5).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  // Snapshot server selalu `false` (tidak ada `window` di server).
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
