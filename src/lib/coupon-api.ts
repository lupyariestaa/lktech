import { getIdToken } from "@/lib/auth";
import type { CouponType } from "@/lib/coupon-types";

export type CouponValidationResult =
  | { valid: true; code: string; type: CouponType; discount: number; description: string | null }
  | { valid: false; reason: string };

/**
 * Error khusus: validasi kupon membutuhkan sesi login (token tak tersedia /
 * kedaluwarsa). Dipakai agar pemanggil bisa membedakan "sesi hilang" dari
 * "kode tidak valid" maupun "gangguan jaringan" (F-K1/K2).
 */
export class CouponSessionError extends Error {
  constructor() {
    super("Masuk untuk memakai kode promo.");
    this.name = "CouponSessionError";
  }
}

/**
 * Validasi kode kupon di server untuk subtotal tertentu.
 * Mengembalikan hasil validasi (diskon dihitung server).
 *
 * - Melempar `CouponSessionError` bila tak ada token (perlu login).
 * - Melempar `Error` biasa bila gagal jaringan / server (tidak diketahui sah/tidak).
 * - Mengembalikan `{ valid:false, reason }` bila kode tak sah (jawaban definitif).
 *
 * `context` (opsional, FASE P3) membawa isi keranjang agar kupon BUNDEL
 * (`appliesToSlugs`/`minItems`) ikut divalidasi dengan benar.
 */
export async function validateCouponRequest(
  code: string,
  subtotal: number,
  context?: { slugs?: string[]; itemCount?: number },
): Promise<CouponValidationResult> {
  const token = await getIdToken();
  if (!token) throw new CouponSessionError();

  let res: Response;
  try {
    res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code,
        subtotal,
        slugs: context?.slugs,
        itemCount: context?.itemCount,
      }),
    });
  } catch {
    // Gagal jaringan murni → tidak diketahui hasilnya.
    throw new Error("Tidak dapat memverifikasi kode promo. Periksa koneksi Anda.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401/403 = sesi tidak valid → perlakukan sebagai sesi hilang.
    if (res.status === 401 || res.status === 403) throw new CouponSessionError();
    throw new Error(data?.error ?? "Gagal memvalidasi kode promo.");
  }
  return data as CouponValidationResult;
}

/** Saran kode terbaik (C3/K2) — null bila tak ada yang valid. */
export type BestCouponSuggestion = {
  code: string;
  discount: number;
  description: string | null;
} | null;

/**
 * Minta saran kode terbaik untuk isi keranjang (C3/K2). Opt-in: hanya dipanggil
 * bila pengguna memilih "Terapkan kode terbaik" atau saat widget dimuat.
 * Melempar `CouponSessionError` bila tak login (pemanggil boleh mengabaikan).
 */
export async function suggestBestCouponRequest(
  subtotal: number,
  context?: { slugs?: string[]; itemCount?: number },
): Promise<BestCouponSuggestion> {
  const token = await getIdToken();
  if (!token) throw new CouponSessionError();

  const res = await fetch("/api/coupons/best", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subtotal,
      slugs: context?.slugs,
      itemCount: context?.itemCount,
    }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new CouponSessionError();
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Gagal mencari kode terbaik.");
  }
  const data = (await res.json().catch(() => ({}))) as { best?: BestCouponSuggestion };
  return data.best ?? null;
}
