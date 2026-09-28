"use client";

import { useSyncExternalStore } from "react";

/**
 * Durasi intro loader (ms) — sumber tunggal kebenaran.
 * Dipakai oleh <IntroLoader /> dan oleh animasi konten (hero, navbar)
 * agar kemunculan konten tepat setelah loader menghilang, tanpa jeda kosong.
 */
export const INTRO_DURATION = 1900;
/** Jeda singkat agar exit-animation loader terlihat halus sebelum konten masuk. */
export const INTRO_EXIT = 300;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Mendeteksi preferensi `prefers-reduced-motion` secara aman untuk SSR
 * (snapshot server = false) tanpa setState di dalam effect.
 */
export function useReducedMotionPreference() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Delay (dalam detik) yang dipakai animasi konten (`initial` -> `animate`).
 * Saat reduced-motion aktif, konten langsung tampil (delay 0).
 */
export function introDelay(reduced: boolean) {
  if (reduced) return 0;
  return (INTRO_DURATION + INTRO_EXIT) / 1000;
}
