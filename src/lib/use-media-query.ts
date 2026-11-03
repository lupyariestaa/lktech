"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Media query umum yang dipakai lintas komponen (sumber tunggal).
 * Selaras dengan breakpoint Tailwind (sm = 640, md = 768, lg = 1024).
 */
export const MEDIA_QUERIES = {
  /** Layar kecil ke atas (Tailwind `sm`). */
  smUp: "(min-width: 640px)",
  /** Tablet ke atas (Tailwind `md`) — dipakai untuk efek yang lebih berat. */
  tabletUp: "(min-width: 768px)",
  /** Desktop ke atas (Tailwind `lg`). */
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
 * Dipakai sebagai "gate" efek mahal & penyesuaian ukuran per breakpoint
 * (mis. skala tile band "Pratinjau").
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
