/**
 * Logika murni "Taman Pixel" (T2). Tanpa Firestore, tanpa React, tanpa alias "@/".
 * Dites langsung dengan `node --experimental-strip-types`.
 *
 * Aturan keamanan yang dijaga di sini:
 * - `publicView` adalah WHITELIST: field privat (email, fullName, ownerUid, catatan bukti)
 *   tidak pernah ikut keluar ke klien.
 * - `sample` tidak pernah lolos filter publik di lingkungan produksi (D2).
 */
import type { AnimalKey, TamanKind, TamanSource, TamanStatus, TamanTestimonial } from "./taman-types.ts";

/* ---------- Normalisasi dokumen mentah (tolerant terhadap data lama) ---------- */

const TAMAN_KIND_LIST = ["real", "sample"] as const;
const TAMAN_STATUS_LIST = ["pending", "published", "hidden", "rejected"] as const;
const TAMAN_SOURCE_LIST = ["submitted", "admin", "review", "legacy", "sample"] as const;
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
    order: typeof d.order === "number" && Number.isFinite(d.order) ? d.order : 0,
    projectSlug: typeof d.projectSlug === "string" && d.projectSlug ? d.projectSlug : undefined,
    productSlug: typeof d.productSlug === "string" && d.productSlug ? d.productSlug : undefined,
    source: oneOf<TamanSource>(d.source, TAMAN_SOURCE_LIST, "admin"),
    sourceRefId: typeof d.sourceRefId === "string" && d.sourceRefId ? d.sourceRefId : undefined,
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
