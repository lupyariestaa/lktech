/**
 * Logika murni "Taman Pixel" (T2). Tanpa Firestore, tanpa React, tanpa alias "@/".
 * Dites langsung dengan `node --experimental-strip-types`.
 *
 * Aturan keamanan yang dijaga di sini:
 * - `publicView` adalah WHITELIST: field privat (email, fullName, ownerUid, catatan bukti)
 *   tidak pernah ikut keluar ke klien.
 * - `sample` tidak pernah lolos filter publik di lingkungan produksi (D2).
 */
import type { AnimalKey, AnimalVariant, TamanKind, TamanSource, TamanStatus, TamanTestimonial } from "./taman-types.ts";

/* ---------- Normalisasi dokumen mentah (tolerant terhadap data lama) ---------- */

const TAMAN_KIND_LIST = ["real", "sample"] as const;
const TAMAN_STATUS_LIST = ["pending", "published", "hidden", "rejected"] as const;
const TAMAN_SOURCE_LIST = ["submitted", "admin", "review", "legacy", "sample"] as const;
const TAMAN_VARIANT_LIST = [
  "normal",
  "putih",
  "hitam",
  "coklat",
  "emas",
  "biru",
  "abu",
  "merah",
] as const;

/** Varian yang tersedia per hewan (cerminan ANIMAL_VARIANTS, tanpa alias). */
const ANIMAL_VARIANTS_LOCAL: Record<AnimalKey, readonly AnimalVariant[]> = {
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
 * Normalisasi varian: nilai tak dikenal atau tidak cocok untuk hewan itu
 * dikembalikan ke "normal" (kompatibel dengan data lama).
 */
export function normalizeVariant(animal: AnimalKey, v: unknown): AnimalVariant {
  const variant = oneOf<AnimalVariant>(v, TAMAN_VARIANT_LIST, "normal");
  return (ANIMAL_VARIANTS_LOCAL[animal] ?? []).includes(variant) ? variant : "normal";
}

/** Daftar varian yang sah untuk hewan (untuk UI form). */
export function variantsForAnimal(animal: AnimalKey): readonly AnimalVariant[] {
  return ANIMAL_VARIANTS_LOCAL[animal] ?? ["normal"];
}

/** Tint warna untuk rendisi (klien & canvas). */
export const V2_VARIANT_TINT: Record<AnimalVariant, string | null> = {
  normal: null,
  putih: "#f5f5f5",
  hitam: "#3a3a44",
  coklat: "#a9743f",
  emas: "#ffc93c",
  biru: "#5aa9ff",
  abu: "#9aa4b2",
  merah: "#ff6b5a",
};

const TAMAN_ANIMAL_LIST = [
  "kucing",
  "kelinci",
  "burung",
  "rubah",
  "beruang",
  "kura-kura",
  "kupu-kupu",
  "ikan",
] as const;

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Normalisasi dokumen `taman_testimonials` ke bentuk tipe. Nilai tak dikenal → default aman. */
export function normalizeTamanTestimonial(id: string, d: Record<string, unknown>): TamanTestimonial {
  const consent = (d.consent && typeof d.consent === "object" ? d.consent : {}) as Record<string, unknown>;
  const rating = typeof d.rating === "number" && Number.isFinite(d.rating) ? Math.round(d.rating) : 5;
  return {
    id,
    kind: oneOf<TamanKind>(d.kind, TAMAN_KIND_LIST, "real"),
    status: oneOf<TamanStatus>(d.status, TAMAN_STATUS_LIST, "pending"),
    displayName: str(d.displayName),
    fullName: typeof d.fullName === "string" && d.fullName ? d.fullName : undefined,
    role: str(d.role),
    quote: str(d.quote),
    rating: Math.min(5, Math.max(1, rating)),
    dateISO: str(d.dateISO, str(d.createdAtISO)),
    animal: oneOf<AnimalKey>(d.animal, TAMAN_ANIMAL_LIST, "kucing"),
    variant: normalizeVariant(oneOf<AnimalKey>(d.animal, TAMAN_ANIMAL_LIST, "kucing"), d.variant),
    order: typeof d.order === "number" && Number.isFinite(d.order) ? d.order : 0,
    projectSlug: typeof d.projectSlug === "string" && d.projectSlug ? d.projectSlug : undefined,
    productSlug: typeof d.productSlug === "string" && d.productSlug ? d.productSlug : undefined,
    source: oneOf<TamanSource>(d.source, TAMAN_SOURCE_LIST, "admin"),
    sourceRefId: typeof d.sourceRefId === "string" && d.sourceRefId ? d.sourceRefId : undefined,
    legacyKey: typeof d.legacyKey === "string" && d.legacyKey ? d.legacyKey : undefined,
    ownerUid: typeof d.ownerUid === "string" && d.ownerUid ? d.ownerUid : undefined,
    consent: {
      given: consent.given === true,
      givenAtISO: typeof consent.givenAtISO === "string" ? consent.givenAtISO : undefined,
    },
    createdAtISO: str(d.createdAtISO),
    updatedAtISO: str(d.updatedAtISO),
    approvedAtISO: typeof d.approvedAtISO === "string" ? d.approvedAtISO : undefined,
    approvedBy: typeof d.approvedBy === "string" ? d.approvedBy : undefined,
  };
}

/* ---------- Nama singkat (Q4) ---------- */

/**
 * Nama publik: nama depan + inisial nama belakang ("Budi Santoso" → "Budi S.").
 * Nama tunggal dipakai apa adanya. Hasil dipotong ke `max` karakter.
 */
export function shortName(full: string, max = 40): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  let out: string;
  if (parts.length === 1) {
    out = parts[0];
  } else {
    const last = parts[parts.length - 1];
    out = `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
  }
  return out.length > max ? out.slice(0, max).trimEnd() : out;
}

/* ---------- Visibilitas publik (D2, moderasi) ---------- */

/**
 * Apakah testimoni boleh tampil di publik?
 * - Hanya `real` (sample tidak pernah publik, D2).
 * - Status harus `published`.
 * - Persetujuan pemberi harus tercatat (`consent.given`).
 */
export function isPubliclyVisible(
  t: { kind: TamanKind; status: TamanStatus; consent: { given: boolean } },
): boolean {
  return t.kind === "real" && t.status === "published" && t.consent.given === true;
}

/** Bentuk yang aman dikirim ke klien. Tidak ada email, uid, nama lengkap, atau catatan bukti. */
export type TamanPublicView = {
  id: string;
  displayName: string;
  role: string;
  quote: string;
  rating: number;
  dateISO: string;
  animal: AnimalKey;
  order: number;
  projectSlug?: string;
  productSlug?: string;
};

/** WHITELIST: hanya field publik yang disalin. Field lain dibuang. */
export function publicView(t: TamanTestimonial): TamanPublicView {
  return {
    id: t.id,
    displayName: t.displayName,
    role: t.role,
    quote: t.quote,
    rating: t.rating,
    dateISO: t.dateISO,
    animal: t.animal,
    order: t.order,
    ...(t.projectSlug ? { projectSlug: t.projectSlug } : {}),
    ...(t.productSlug ? { productSlug: t.productSlug } : {}),
  };
}

/** Pool publik: hanya yang lolos `isPubliclyVisible`, diurutkan berdasarkan `order`. */
export function publicPool(all: TamanTestimonial[]): TamanPublicView[] {
  return all
    .filter(isPubliclyVisible)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map(publicView);
}

/* ---------- Jumlah slot per device (Q5) ---------- */

export const SLOT_RULES = {
  mobile: { maxBreakpoint: 640, maxSlots: 4, minSlots: 3 },
  tablet: { maxBreakpoint: 1024, maxSlots: 6, minSlots: 3 },
  desktop: { maxSlots: 8, minSlots: 3 },
} as const;

/** Jumlah slot maksimal untuk lebar layar (px). */
export function slotCountFor(width: number): number {
  if (width < SLOT_RULES.mobile.maxBreakpoint) return SLOT_RULES.mobile.maxSlots;
  if (width < SLOT_RULES.tablet.maxBreakpoint) return SLOT_RULES.tablet.maxSlots;
  return SLOT_RULES.desktop.maxSlots;
}

/** Minimum testimoni nyata agar frame tampil (Q6). */
export const MIN_TO_SHOW = 3;

/** Frame tampil bila jumlah publik memenuhi minimum. */
export function shouldShowFrame(publicCount: number): boolean {
  return publicCount >= MIN_TO_SHOW;
}

/* ---------- Gacha: pilih subset untuk slot (Q5b, §3.3) ---------- */

/**
 * Pilih hingga `slots` testimoni dari `pool`.
 * - Bila pool ≤ slots → semua, urut seperti pool (tanpa acak).
 * - Bila pool > slots → acak berbobot. Testimoni yang ada di `recentIds` diberi bobot
 *   lebih kecil (0.2) agar set baru terasa berbeda, tapi tetap bisa muncul lagi.
 * - Tanpa duplikat. Set hasil tidak identik dengan `recentIds` bila pool memungkinkan.
 *
 * `rng` disuntikkan (default `Math.random`) agar hasil deterministik saat dites.
 */
export function pickSlots<T extends { id: string }>(
  pool: T[],
  slots: number,
  recentIds: string[] = [],
  rng: () => number = Math.random,
): T[] {
  const n = Math.max(0, Math.floor(slots));
  if (n === 0 || pool.length === 0) return [];
  if (pool.length <= n) return [...pool];

  const recent = new Set(recentIds);
  const remaining = [...pool];
  const picked: T[] = [];

  while (picked.length < n && remaining.length > 0) {
    const weights = remaining.map((t) => (recent.has(t.id) ? 0.2 : 1));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = rng() * total;
    let idx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      r -= weights[i];
      if (r < 0) {
        idx = i;
        break;
      }
    }
    picked.push(remaining[idx]);
    remaining.splice(idx, 1);
  }

  // Hindari set yang identik dengan set terakhir bila memungkinkan.
  if (recent.size > 0 && picked.length === n && picked.every((t) => recent.has(t.id)) && pool.length > n) {
    const fresh = pool.filter((t) => !recent.has(t.id));
    if (fresh.length > 0) {
      picked[picked.length - 1] = fresh[Math.floor(rng() * fresh.length) % fresh.length];
      const seen = new Set<string>();
      return picked.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    }
  }

  return picked;
}

/* ---------- Aturan publish & input (T5, §2.5, §6.2) ---------- */

/**
 * Publish testimoni `real` hanya bila persetujuan pemberi tercatat dan ada catatan bukti
 * dari admin (tanpa ini tombol Terbitkan nonaktif dan API menolak, §6.1).
 */
export function canPublish(
  t: { kind: TamanKind; consent: { given: boolean } },
  evidenceNote: string | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (t.kind === "sample") return { ok: true }; // sample hanya lokal/pratinjau; tidak diuji persetujuan
  if (!t.consent.given) return { ok: false, reason: "Persetujuan pemberi belum tercatat." };
  if (!evidenceNote || evidenceNote.trim().length < 3) {
    return { ok: false, reason: "Catatan bukti persetujuan wajib diisi sebelum publish." };
  }
  return { ok: true };
}

/** Rating bulat 1..5. Nilai tak valid → null (ditolak validasi). */
export function sanitizeRating(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const r = Math.round(v);
  return r >= 1 && r <= 5 ? r : null;
}

/** Quote: dipangkas, dan harus berisi panjang yang diizinkan. */
export function validateQuote(
  raw: string,
  min: number,
  max: number,
): { ok: true; value: string } | { ok: false; reason: string } {
  const value = raw.trim();
  if (value.length < min) return { ok: false, reason: `Pesan minimal ${min} karakter.` };
  if (value.length > max) return { ok: false, reason: `Pesan maksimal ${max} karakter.` };
  return { ok: true, value };
}

/** Tanggal ISO valid dan tidak di masa depan (dibanding `nowMs`). */
export function isValidPastDate(iso: string, nowMs: number): boolean {
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t <= nowMs;
}

/* ---------- Validasi input kirim testimoni (T4) ---------- */

export const TAMAN_LIMITS = {
  displayNameMax: 40,
  roleMax: 120,
  quoteMin: 20,
  quoteMax: 400,
  ratingMin: 1,
  ratingMax: 5,
} as const;
export type SubmitInput = {
  displayName?: unknown;
  role?: unknown;
  quote?: unknown;
  rating?: unknown;
  dateISO?: unknown;
  projectSlug?: unknown;
  productSlug?: unknown;
  consent?: unknown;
  /** V2-1: pilihan hewan & varian dari user (wajib). */
  animal?: unknown;
  variant?: unknown;
};

export type SubmitClean = {
  displayName: string;
  role: string;
  quote: string;
  rating: number;
  dateISO: string;
  projectSlug?: string;
  productSlug?: string;
  animal: AnimalKey;
  variant: AnimalVariant;
};

export type SubmitResult =
  | { ok: true; value: SubmitClean }
  | { ok: false; error: string };

const SLUG = /^[a-z0-9][a-z0-9-]{0,199}$/;

/**
 * Validasi & normalisasi. `nowMs` diinjeksi agar tanggal bisa dites deterministik.
 * `fallbackName` (nama dari akun Google) dipakai bila nama tampil kosong.
 */
export function validateSubmit(input: SubmitInput, nowMs: number, fallbackName: string): SubmitResult {
  if (input.consent !== true) {
    return { ok: false, error: "Anda perlu menyetujui penampilan testimoni sebelum mengirim." };
  }

  const rawName = typeof input.displayName === "string" && input.displayName.trim()
    ? input.displayName
    : fallbackName;
  const displayName = shortName(rawName, TAMAN_LIMITS.displayNameMax);
  if (!displayName) return { ok: false, error: "Nama tampil wajib diisi." };

  const role = typeof input.role === "string" ? input.role.trim() : "";
  if (!role) return { ok: false, error: "Peran atau nama usaha wajib diisi." };
  if (role.length > TAMAN_LIMITS.roleMax) {
    return { ok: false, error: `Peran maksimal ${TAMAN_LIMITS.roleMax} karakter.` };
  }

  const quoteRes = validateQuote(
    typeof input.quote === "string" ? input.quote : "",
    TAMAN_LIMITS.quoteMin,
    TAMAN_LIMITS.quoteMax,
  );
  if (!quoteRes.ok) return { ok: false, error: quoteRes.reason };

  const rating = sanitizeRating(input.rating);
  if (rating === null) return { ok: false, error: "Rating harus 1 sampai 5." };

  const dateISO = typeof input.dateISO === "string" && input.dateISO
    ? input.dateISO
    : new Date(nowMs).toISOString().slice(0, 10);
  if (!isValidPastDate(dateISO, nowMs)) {
    return { ok: false, error: "Tanggal tidak valid atau di masa depan." };
  }

  const projectSlug = typeof input.projectSlug === "string" && input.projectSlug ? input.projectSlug : undefined;
  const productSlug = typeof input.productSlug === "string" && input.productSlug ? input.productSlug : undefined;
  if (projectSlug && !SLUG.test(projectSlug)) return { ok: false, error: "Tautan proyek tidak valid." };
  if (productSlug && !SLUG.test(productSlug)) return { ok: false, error: "Tautan produk tidak valid." };

  // V2-1: hewan & varian wajib dan harus pasangannya sah.
  if (typeof input.animal !== "string" || !TAMAN_ANIMAL_LIST.includes(input.animal as AnimalKey)) {
    return { ok: false, error: "Pilih hewan untuk testimoni Anda." };
  }
  const animal = input.animal as AnimalKey;
  const rawVariant = typeof input.variant === "string" ? input.variant.trim() : "";
  if (rawVariant && !variantsForAnimal(animal).includes(rawVariant as AnimalVariant)) {
    return { ok: false, error: "Warna tidak tersedia untuk hewan itu." };
  }
  const variant = (rawVariant || "normal") as AnimalVariant;

  return {
    ok: true,
    value: {
      displayName,
      role,
      quote: quoteRes.value,
      rating,
      dateISO,
      ...(projectSlug ? { projectSlug } : {}),
      ...(productSlug ? { productSlug } : {}),
      animal,
      variant,
    },
  };
}

/** Batas pengiriman per pengguna: maks 1 pending aktif dan 3 pengiriman per 24 jam. */
export const SUBMIT_LIMITS = { perDayPerUser: 3, pendingPerUser: 1 } as const;

/** Apakah pengguna sudah punya testimoni pending (dibatasi 1). */
export function hasTooManyPending(pendingCount: number): boolean {
  return pendingCount >= SUBMIT_LIMITS.pendingPerUser;
}

/* ---------- T5: logika admin (murni) ---------- */

/** Aksi bulk admin (maks 50, sama dengan batas artikel). */
export const TAMAN_BULK_ACTIONS = ["publish", "hide", "delete", "consent_publish"] as const;
export type TamanBulkAction = (typeof TAMAN_BULK_ACTIONS)[number];
export const TAMAN_BULK_MAX = 50;

/**
 * Status tujuan untuk aksi publish/hide. Publish real tetap wajib lolos `canPublish`
 * di pemanggil (gate server). Mengembalikan status baru atau null bila aksi tak valid.
 */
export function statusForAction(action: string): "published" | "hidden" | null {
  if (action === "publish") return "published";
  if (action === "hide") return "hidden";
  return null;
}

/** Hewan default berurutan untuk testimoni tanpa hewan (memastikan variasi di frame). */
export function nextAnimal(used: string[]): AnimalKey {
  const counts = new Map<string, number>(TAMAN_ANIMAL_LIST.map((a) => [a, 0]));
  for (const a of used) if (counts.has(a)) counts.set(a, (counts.get(a) ?? 0) + 1);
  let best: AnimalKey = TAMAN_ANIMAL_LIST[0];
  let bestCount = Infinity;
  for (const a of TAMAN_ANIMAL_LIST) {
    const c = counts.get(a) ?? 0;
    if (c < bestCount) {
      best = a;
      bestCount = c;
    }
  }
  return best;
}

/** Validasi urutan (bilangan bulat, 0..9999). */
export function sanitizeOrder(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= 0 && n <= 9999 ? n : null;
}

/**
 * Susun testimoni dari ulasan produk (T5 import). Nama disingkat dari `buyerName`,
 * `uid` TIDAK dibawa ke dokumen publik (hanya ke privat). Status tetap `pending`.
 */
export function draftFromReview(
  review: { id: string; uid: string; buyerName: string; rating: number; body?: string; title?: string; productSlug: string; createdAtISO: string },
  nowISO: string,
): { publicDoc: Record<string, unknown>; privateDoc: { uid: string; consentText: string; consentAtISO: string } | null } {
  const quote = (review.body ?? review.title ?? "").trim();
  return {
    publicDoc: {
      kind: "real",
      status: "pending",
      displayName: shortName(review.buyerName || "Pelanggan", TAMAN_LIMITS.displayNameMax),
      role: "Pelanggan produk",
      quote,
      rating: Math.min(5, Math.max(1, Math.round(review.rating))),
      dateISO: review.createdAtISO.slice(0, 10),
      animal: "kucing",
      order: 0,
      productSlug: review.productSlug,
      source: "review",
      sourceRefId: review.id,
      ownerUid: review.uid,
      consent: { given: false },
      createdAtISO: nowISO,
      updatedAtISO: nowISO,
    },
    // Persetujuan belum ada: admin wajib mengisi bukti sebelum publish.
    privateDoc: null,
  };
}

/**
 * Sample (D2) hanya boleh dibuat di lingkungan development. Di produksi TIDAK PERNAH,
 * dengan atau tanpa env apa pun (keputusan pemilik: sample tidak tampil publik).
 */
export function canSeedSamples(env: { NODE_ENV?: string }): boolean {
  return env.NODE_ENV === "development";
}
/* ---------- T9: whitelist respons untuk pemilik (privasi) ---------- */

/**
 * Bentuk respons `GET /api/taman/mine`. WHITELIST: pemilik melihat isi & statusnya sendiri,
 * tetapi tidak pernah email, uid, nama lengkap, atau catatan bukti admin.
 */
export type TamanMineView = {
  id: string;
  status: TamanStatus;
  quote: string;
  rating: number;
  displayName: string;
  role: string;
  dateISO: string;
  createdAtISO: string;
};

export function toMineView(t: TamanTestimonial): TamanMineView {
  return {
    id: t.id,
    status: t.status,
    quote: t.quote,
    rating: t.rating,
    displayName: t.displayName,
    role: t.role,
    dateISO: t.dateISO,
    createdAtISO: t.createdAtISO,
  };
}

/** Field yang TIDAK boleh keluar ke klien mana pun (dipakai tes & pemeriksaan). */
export const PRIVATE_FIELDS = [
  "email",
  "uid",
  "ownerUid",
  "fullName",
  "consentText",
  "evidenceNote",
  "evidenceBy",
  "sourceRefId",
  "approvedBy",
] as const;
/* ---------- T10: JSON-LD (SEO) ---------- */

/** Batas situs (sama dengan konteks SITE) — dikirim sebagai parameter agar murni. */
export type TamanSchemaContext = { siteUrl: string; siteName: string };

/**
 * JSON-LD `Review` untuk testimoni taman yang SAH (§10, P4: tanpa angka karangan).
 * Hanya dari `real` + `published` + persetujuan tercatat, lewat `publicPool`.
 * Email, uid, nama lengkap, dan catatan tidak pernah ikut. Rating harus valid (1..5).
 * Mengembalikan `null` bila tidak ada testimoni sah (jangan render schema kosong).
 */
export function buildTamanReviewJsonLd(
  items: TamanPublicView[],
  ctx: TamanSchemaContext,
): Record<string, unknown> | null {
  const reviews = items
    .filter((i) => sanitizeRating(i.rating) !== null && i.quote.trim().length > 0)
    .map((i) => ({
      "@type": "Review",
      author: { "@type": "Person", name: i.displayName },
      reviewBody: i.quote,
      reviewRating: {
        "@type": "Rating",
        ratingValue: sanitizeRating(i.rating),
        bestRating: 5,
        worstRating: 1,
      },
      datePublished: i.dateISO,
    }));

  if (reviews.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ctx.siteName,
    url: ctx.siteUrl,
    review: reviews,
  };
}
/* ---------- T11: migrasi testimoni lama (legacy) ---------- */

/** Bentuk testimoni lama di konten situs (`ManagedTestimonial`). */
export type LegacyTestimonial = { name: string; role: string; quote: string; rating: number };

/** Kunci identitas untuk deduplikasi (nama + kutipan, tanpa spasi berlebih, huruf kecil). */
export function legacyKey(t: { name: string; quote: string }): string {
  return `${t.name.trim().toLowerCase()}|${t.quote.trim().replace(/\s+/g, " ").toLowerCase()}`;
}

/**
 * Hasilkan dokumen draft `legacy` dari testimoni lama. Aturan:
 * - Contoh bawaan (`placeholders`) DILEWATI — tidak pernah jadi testimoni nyata.
 * - Hanya quote & nama valid yang diimpor (tidak kosong, rating 1..5).
 * - Duplikat (sama key) dan yang sudah pernah diimpor (`existingKeys`) dilewati.
 * - Hasil SELALU `pending`, `kind: real`, `consent.given: false`: admin wajib
 *   mencatat persetujuan dan bukti sebelum menerbitkan (sama seperti ulasan).
 * - Tidak ada email (tidak tersedia di konten lama) → tidak ada data privat.
 */
export function planLegacyImport(input: {
  legacy: LegacyTestimonial[];
  placeholders: LegacyTestimonial[];
  existingKeys: string[];
  nowISO: string;
}): {
  drafts: Array<Record<string, unknown>>;
  skipped: Array<{ name: string; reason: "placeholder" | "invalid" | "duplicate" | "exists" }>;
} {
  const placeholderKeys = new Set(input.placeholders.map(legacyKey));
  const existing = new Set(input.existingKeys);
  const seen = new Set<string>();
  const drafts: Array<Record<string, unknown>> = [];
  const skipped: Array<{ name: string; reason: "placeholder" | "invalid" | "duplicate" | "exists" }> = [];

  for (const t of input.legacy) {
    const name = t.name?.trim() ?? "";
    const quote = t.quote?.trim() ?? "";
    const rating = sanitizeRating(t.rating);
    if (!name || quote.length < TAMAN_LIMITS.quoteMin || rating === null) {
      skipped.push({ name: name || "(tanpa nama)", reason: "invalid" });
      continue;
    }
    const key = legacyKey({ name, quote });
    if (placeholderKeys.has(key)) {
      skipped.push({ name, reason: "placeholder" });
      continue;
    }
    if (seen.has(key)) {
      skipped.push({ name, reason: "duplicate" });
      continue;
    }
    if (existing.has(key)) {
      skipped.push({ name, reason: "exists" });
      continue;
    }
    seen.add(key);
    drafts.push({
      kind: "real",
      status: "pending",
      displayName: shortName(name, TAMAN_LIMITS.displayNameMax),
      role: (t.role ?? "").trim() || "Klien",
      quote: quote.slice(0, TAMAN_LIMITS.quoteMax),
      rating,
      dateISO: input.nowISO.slice(0, 10),
      animal: "kucing",
      order: 0,
      source: "legacy",
      consent: { given: false },
      legacyKey: key,
      createdAtISO: input.nowISO,
      updatedAtISO: input.nowISO,
    });
  }
  return { drafts, skipped };
}