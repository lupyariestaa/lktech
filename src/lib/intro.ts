"use client";

import { useSyncExternalStore } from "react";

/**
 * Durasi intro loader (ms) — sumber tunggal kebenaran.
 * Dipakai oleh <IntroLoader /> dan oleh animasi konten (hero, navbar)
 * agar kemunculan konten tepat setelah loader menghilang, tanpa jeda kosong.
 *
 * Timeline <IntroLoader /> (lihat komponen):
 *   close 450 + content-in 180 + hold 720 + content-out 260 + open 520 = 2130ms.
 * `INTRO_DURATION + INTRO_EXIT` harus sama dengan total tersebut.
 */
export const INTRO_DURATION = 1830;
/** Jeda singkat agar exit-animation loader terlihat halus sebelum konten masuk. */
export const INTRO_EXIT = 300;

/**
 * Intro beranda hanya dimainkan **sekali per sesi tab** (F6). Reload halaman
 * yang sama tidak lagi menahan pengunjung 2,1 detik; tab/ sesi baru tetap
 * mendapat intro. Disimpan di `sessionStorage` (bukan localStorage) supaya
 * kunjungan esok hari tetap disambut intro.
 */
const INTRO_SEEN_KEY = "lktech:intro-seen";

/** Apakah intro sudah selesai di sesi tab ini. Aman bila storage diblokir. */
export function hasSeenIntro() {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Tandai intro sudah selesai untuk sesi tab ini. */
export function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Mode privat / storage diblokir: intro boleh tampil lagi, bukan error.
  }
}

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
