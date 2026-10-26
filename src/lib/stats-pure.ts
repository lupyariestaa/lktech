/**
 * Logika statistik angka yang MURNI (dapat diuji Node, tanpa efek samping).
 *
 * Dipakai bersama oleh:
 * - komponen publik `Stats` dan trust bar `Hero` (menentukan angka yang tayang);
 * - editor admin (validasi & pratinjau).
 *
 * Prinsip kejujuran: angka tayang hanya bila admin MENANDAINYA terverifikasi.
 * Selama belum ada penanda `verified` sama sekali (data lama), perilaku lama
 * dipertahankan (tayang bila bukan angka contoh) agar situs yang sudah berjalan
 * tidak tiba-tiba kosong. Begitu satu item diberi penanda, mode ketat berlaku:
 * hanya item `verified === true` yang tayang — mencegah "setengah contoh" lolos.
 *
 * Bebas impor runtime agar dapat diuji Node (hanya `import type`).
 */

import type { ManagedStat } from "@/lib/content-types";

/** Nilai maksimum wajar untuk satu angka statistik. */
export const STAT_MAX_VALUE = 1_000_000;
/** Jumlah item yang disarankan tayang agar tata letak tetap rapi. */
export const STAT_MAX_ITEMS = 8;
/** Panjang maksimum sufiks (mis. "+", "%", "k+"). */
export const STAT_MAX_SUFFIX = 8;
/** Panjang maksimum label statistik (ringkas agar tidak melipat di kartu). */
export const STAT_MAX_LABEL = 40;

/** Sufiks yang sering dipakai (tombol cepat di editor). */
export const STAT_SUFFIX_PRESETS = ["", "+", "%", "k+"] as const;

/**
 * Bulatkan & batasi nilai statistik ke rentang wajar (`0..STAT_MAX_VALUE`).
 * `NaN`/bukan angka → `fallback` (default 0).
 */
export function clampStatValue(value: unknown, fallback = 0): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 0), STAT_MAX_VALUE);
}

/** Format angka gaya Indonesia (pemisah ribuan); aman untuk nilai tak wajar. */
export function formatStatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(clampStatValue(value, 0));
}

/**
 * True bila daftar sudah memakai verifikasi eksplisit — yaitu ada **minimal
 * satu** item `verified === true`. Sengaja BUKAN "ada flag boolean apa pun":
 * menambah item baru (yang default `verified:false`) tidak boleh tiba-tiba
 * mengaktifkan mode ketat dan menyembunyikan angka lama.
 */
export function hasVerificationFlags(list: readonly ManagedStat[]): boolean {
  return list.some((stat) => stat.verified === true);
}

/**
 * Daftar statistik yang BOLEH tayang.
 * - Mode terverifikasi (ada item `verified === true`): hanya item
 *   `verified === true` yang tampil.
 * - Mode lama (tanpa item terverifikasi): perilaku lama — semua item tampil
 *   bila bukan angka contoh bawaan.
 */
export function publishableStats(
  list: readonly ManagedStat[],
  isDefault: boolean,
): ManagedStat[] {
  if (hasVerificationFlags(list)) {
    return list.filter((stat) => stat.verified === true);
  }
  return isDefault ? [] : [...list];
}

/**
 * Statistik unggulan untuk trust bar hero. Utamakan `featured === true`;
 * bila tidak ada, jatuh ke label yang menyebut "klien" (kompatibilitas lama).
 */
export function featuredStat(list: readonly ManagedStat[]): ManagedStat | null {
  return (
    list.find((stat) => stat.featured === true) ??
    list.find((stat) => /klien/i.test(stat.label)) ??
    null
  );
}

/** Ringkas: apakah ada item yang perlu ditinjau (belum terverifikasi). */
export function unverifiedCount(list: readonly ManagedStat[]): number {
  return list.filter((stat) => stat.verified !== true).length;
}

/** Validasi daftar statistik untuk editor. Kembalikan pesan pertama bila tak sah. */
export function validateStats(list: readonly ManagedStat[]): string | null {
  if (list.length > STAT_MAX_ITEMS) {
    return `Maksimal ${STAT_MAX_ITEMS} statistik tampil agar tata letak tetap rapi.`;
  }
  for (const stat of list) {
    if (!stat.label.trim()) return "Label statistik wajib diisi.";
    if (stat.label.length > STAT_MAX_LABEL) {
      return `Label statistik maksimal ${STAT_MAX_LABEL} karakter.`;
    }
    if (!Number.isFinite(stat.value) || stat.value < 0) {
      return "Angka statistik harus berupa bilangan ≥ 0.";
    }
    if (stat.value > STAT_MAX_VALUE) {
      return `Angka statistik maksimal ${formatStatNumber(STAT_MAX_VALUE)}.`;
    }
    if (stat.suffix.length > STAT_MAX_SUFFIX) {
      return `Sufiks maksimal ${STAT_MAX_SUFFIX} karakter (mis. +, %, k+).`;
    }
  }
  const featured = list.filter((stat) => stat.featured === true).length;
  if (featured > 1) {
    return "Hanya satu statistik yang boleh dijadikan sorotan (trust bar hero).";
  }
  return null;
}