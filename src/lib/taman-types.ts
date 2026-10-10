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

/* ---------- Varian warna hewan (V2-1) ---------- */

export const TAMAN_VARIANTS = [
  "normal",
  "putih",
  "hitam",
  "coklat",
  "emas",
  "biru",
  "abu",
  "merah",
] as const;
export type AnimalVariant = (typeof TAMAN_VARIANTS)[number];

/**
 * Varian yang tersedia per hewan. Tidak semua warna cocok untuk semua hewan
 * (mis. "emas" khas ikan, "merah" khas rubah). Urutan = urutan tampil di form.
 */
export const ANIMAL_VARIANTS: Record<AnimalKey, readonly AnimalVariant[]> = {
  kucing: ["normal", "putih", "hitam", "coklat", "abu", "emas"],
  kelinci: ["normal", "putih", "hitam", "coklat", "abu"],
  burung: ["normal", "biru", "putih", "hitam", "emas", "merah"],
  rubah: ["normal", "emas", "merah", "putih", "hitam"],
  beruang: ["normal", "coklat", "hitam", "putih", "abu"],
  "kura-kura": ["normal", "coklat", "putih", "hitam", "biru"],
  "kupu-kupu": ["normal", "biru", "emas", "merah", "putih", "hitam"],
  ikan: ["normal", "emas", "biru", "merah", "putih", "hitam"],
};

/**
 * Nilai tint (hex) untuk Phaser. `null` = tanpa tint (sprite asli). Sprite dasar
 * hewan dibuat monokrom terang, sehingga tint menghasilkan varian warna.
 */
export const VARIANT_TINT: Record<AnimalVariant, number | null> = {
  normal: null,
  putih: 0xf5f5f5,
  hitam: 0x3a3a44,
  coklat: 0xa9743f,
  emas: 0xffc93c,
  biru: 0x5aa9ff,
  abu: 0x9aa4b2,
  merah: 0xff6b5a,
};

/** Varian sah untuk pasangan hewan+varian tertentu. */
export function isValidAnimalVariant(animal: AnimalKey, variant: string): variant is AnimalVariant {
  return (ANIMAL_VARIANTS[animal] as readonly string[]).includes(variant);
}

/** Label Indonesia untuk hewan (tampilan). */
export const ANIMAL_LABEL: Record<AnimalKey, string> = {
  kucing: "Kucing",
  kelinci: "Kelinci",
  burung: "Burung",
  rubah: "Rubah",
  beruang: "Beruang",
  "kura-kura": "Kura-kura",
  "kupu-kupu": "Kupu-kupu",
  ikan: "Ikan",
};

/** Label Indonesia untuk varian warna (tampilan). */
export const VARIANT_LABEL: Record<AnimalVariant, string> = {
  normal: "Normal",
  putih: "Putih",
  hitam: "Hitam",
  coklat: "Coklat",
  emas: "Emas",
  biru: "Biru",
  abu: "Abu-abu",
  merah: "Merah",
};

/** Varian default bila tidak diisi (kompatibel dengan data lama). */
export const DEFAULT_VARIANT: AnimalVariant = "normal";

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
  /** Varian warna hewan (V2-1). Data lama tanpa ini → "normal". */
  variant: AnimalVariant;
  order: number;
  projectSlug?: string;
  productSlug?: string;
  source: TamanSource;
  /** Id ulasan asal (internal). */
  sourceRefId?: string;
  /** Kunci deduplikasi impor testimoni lama (internal). */
  legacyKey?: string;
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
