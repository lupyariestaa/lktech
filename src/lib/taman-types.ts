/**
 * Tipe "Taman Pixel" (T1). Aman untuk klien (tanpa server-only).
 *
 * Dua koleksi (keputusan D1):
 * - `taman_testimonials`: data yang boleh dibaca publik lewat whitelist (`publicView`).
 * - `taman_private`: email & bukti persetujuan. Hanya Admin SDK, tidak pernah ke klien.
 */

export const TAMAN_ANIMALS = [
  "kucing",
  "kelinci",
  "burung",
  "rubah",
  "beruang",
  "kura-kura",
  "kupu-kupu",
  "ikan",
] as const;
export type AnimalKey = (typeof TAMAN_ANIMALS)[number];

export const TAMAN_STATUSES = ["pending", "published", "hidden", "rejected"] as const;
export type TamanStatus = (typeof TAMAN_STATUSES)[number];

/** `sample` = contoh untuk pratinjau/lokal, tidak pernah keluar ke publik (D2). */
export const TAMAN_KINDS = ["real", "sample"] as const;
export type TamanKind = (typeof TAMAN_KINDS)[number];

export const TAMAN_SOURCES = ["submitted", "admin", "review", "legacy", "sample"] as const;
export type TamanSource = (typeof TAMAN_SOURCES)[number];

/** Data publik-aman (dibaca dari `taman_testimonials`). */
export type TamanTestimonial = {
  id: string;
  kind: TamanKind;
  status: TamanStatus;
  /** Nama sudah disingkat untuk publik, mis. "Budi S.". */
  displayName: string;
  /** Nama lengkap: hanya admin (tidak pernah ke publik). */
  fullName?: string;
  role: string;
  quote: string;
  rating: number;
  dateISO: string;
  animal: AnimalKey;
  order: number;
  projectSlug?: string;
  productSlug?: string;
  source: TamanSource;
  /** Id ulasan asal (internal). */
  sourceRefId?: string;
  /** Pemilik akun (internal; hak hapus). */
  ownerUid?: string;
  consent: {
    given: boolean;
    givenAtISO?: string;
  };
  createdAtISO: string;
  updatedAtISO: string;
  approvedAtISO?: string;
  approvedBy?: string;
};

/** Data privat (Admin SDK saja). Tidak pernah diekspos ke klien. */
export type TamanPrivate = {
  testimonialId: string;
  email: string;
  uid: string;
  consentText: string;
  consentAtISO: string;
  /** Catatan admin: bukti persetujuan (mis. tautan email). */
  evidenceNote?: string;
  evidenceBy?: string;
};

export const TAMAN_LIMITS = {
  displayNameMax: 40,
  roleMax: 120,
  quoteMin: 20,
  quoteMax: 400,
  ratingMin: 1,
  ratingMax: 5,
} as const;

export function isAnimalKey(v: unknown): v is AnimalKey {
  return typeof v === "string" && (TAMAN_ANIMALS as readonly string[]).includes(v);
}
