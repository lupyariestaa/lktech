"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Gerbang intro beranda (F7.6) — satu sumber kebenaran "intro loader sudah
 * selesai?".
 *
 * Dipasang di `app/page.tsx` membungkus loader + seluruh halaman, sehingga
 * keadaannya **per-mount halaman**: navigasi ulang ke beranda memainkan intro
 * lagi dan scene 3D ikut menunggu lagi — tanpa state basi dari kunjungan
 * sebelumnya (yang akan membuat canvas 3D menyala di balik loader).
 *
 * Tanpa provider (halaman lain, atau komponen yang dipakai lepas),
 * `useIntroDone()` bernilai `true` supaya Hero tetap menampilkan scene-nya.
 */
type IntroGateValue = { done: boolean; finish: () => void };

const IntroGateContext = createContext<IntroGateValue | null>(null);

export function IntroGate({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false);
  const finish = useCallback(() => setDone(true), []);
  const value = useMemo<IntroGateValue>(() => ({ done, finish }), [done, finish]);
  return <IntroGateContext.Provider value={value}>{children}</IntroGateContext.Provider>;
}

/** Apakah intro sudah selesai (atau memang tidak ada intro di halaman ini). */
export function useIntroDone() {
  return useContext(IntroGateContext)?.done ?? true;
}

/**
 * Untuk `<IntroLoader />`: tandai intro selesai. `undefined` bila loader
 * dipakai tanpa `<IntroGate />` (tidak apa-apa — tak ada yang menunggu).
 */
export function useIntroFinisher() {
  return useContext(IntroGateContext)?.finish;
}
