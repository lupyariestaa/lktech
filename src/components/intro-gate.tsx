"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { hasSeenIntro } from "@/lib/intro";

/**
 * Gerbang intro beranda (F7.6) — satu sumber kebenaran "intro loader sudah
 * selesai?".
 *
 * Dipasang di `app/page.tsx` membungkus loader + seluruh halaman. Sejak F6,
 * intro hanya dimainkan **sekali per sesi tab**: bila `sessionStorage` sudah
 * menandainya, gerbang langsung `done` (tanpa menahan hero/3D) dan loader
 * tidak dijalankan. State tetap per-mount halaman agar canvas 3D tidak pernah
 * menyala "basah" di balik intro yang sedang berjalan.
 *
 * Tanpa provider (halaman lain, atau komponen yang dipakai lepas),
 * `useIntroDone()` bernilai `true` supaya Hero tetap menampilkan scene-nya.
 */
type IntroGateValue = { done: boolean; skip: boolean; finish: () => void };

const IntroGateContext = createContext<IntroGateValue | null>(null);

// Layout effect agar status "sudah lihat intro" diterapkan sebelum paint
// setelah hidrasi; fallback `useEffect` saat SSR agar tidak memicu warning.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function IntroGate({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false);
  const [skip, setSkip] = useState(false);
  const finish = useCallback(() => setDone(true), []);
  const value = useMemo<IntroGateValue>(
    () => ({ done, skip, finish }),
    [done, skip, finish],
  );

  useIsomorphicLayoutEffect(() => {
    if (!hasSeenIntro()) return;
    // Sesi yang sama: jangan ulangi intro. `done` langsung true supaya hero,
    // navbar, dan scene 3D tidak menunggu 2,1 detik yang sudah tidak ada.
    setSkip(true);
    setDone(true);
  }, []);

  return <IntroGateContext.Provider value={value}>{children}</IntroGateContext.Provider>;
}

/** Apakah intro sudah selesai (atau memang tidak ada intro di halaman ini). */
export function useIntroDone() {
  return useContext(IntroGateContext)?.done ?? true;
}

/** Apakah intro dilewati karena sesi ini sudah pernah melihatnya. */
export function useIntroSkip() {
  return useContext(IntroGateContext)?.skip ?? false;
}

/**
 * Untuk `<IntroLoader />`: tandai intro selesai. `undefined` bila loader
 * dipakai tanpa `<IntroGate />` (tidak apa-apa — tak ada yang menunggu).
 */
export function useIntroFinisher() {
  return useContext(IntroGateContext)?.finish;
}
