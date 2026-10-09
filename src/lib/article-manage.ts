/**
 * Logika murni dashboard artikel (tanpa React, tanpa alias "@/") agar bisa dites.
 */

export type ManageStatus = "draft" | "published" | "terjadwal";

/** Status tampilan: "terjadwal" = published tapi jadwal masih di masa depan. */
export function manageStatus(
  a: { status: "draft" | "published"; scheduledAt?: string },
  now: number,
): ManageStatus {
  if (a.status === "draft") return "draft";
  if (a.scheduledAt) {
    const t = Date.parse(a.scheduledAt);
    if (!Number.isNaN(t) && t > now) return "terjadwal";
  }
  return "published";
}

export const MANAGE_STATUS_LABEL: Record<ManageStatus, string> = {
  draft: "Draft",
  published: "Terbit",
  terjadwal: "Terjadwal",
};

/** Filter daftar artikel untuk dashboard. Semua parameter opsional. */
export type ManageFilter = {
  q?: string;
  status?: ManageStatus | "semua";
  category?: string;
  tag?: string;
};

/** Cocokkan satu artikel dengan filter (kata kunci: judul, slug, tag, kategori). */
export function matchesManageFilter<
  T extends {
    title: string;
    slug: string;
    category: string;
    tags: string[];
    status: "draft" | "published";
    scheduledAt?: string;
  },
>(a: T, f: ManageFilter, now: number): boolean {
  if (f.status && f.status !== "semua" && manageStatus(a, now) !== f.status) return false;
  if (f.category && f.category !== "semua" && a.category !== f.category) return false;
  if (f.tag && !a.tags.includes(f.tag)) return false;
  const terms = (f.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length) {
    const hay = [a.title, a.slug, a.category, ...a.tags].join(" ").toLowerCase();
    if (!terms.every((t) => hay.includes(t))) return false;
  }
  return true;
}

/** Nama slug untuk salinan: `slug-salinan`, lalu `slug-salinan-2`, dst. Hindari bentrok. */
export function duplicateSlug(slug: string, taken: Set<string>): string {
  const base = `${slug}-salinan`;
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Aksi massal yang didukung API. */
export const BULK_ACTIONS = ["publish", "unpublish", "delete"] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

/** Batas jumlah item per permintaan bulk (B4.3). */
export const BULK_MAX = 50;

/** Pesan konfirmasi untuk aksi massal. */
export function bulkConfirmText(action: BulkAction, count: number): string {
  const n = `${count} artikel`;
  if (action === "delete") return `${n} akan dihapus permanen.`;
  if (action === "publish") return `${n} akan diterbitkan.`;
  return `${n} akan ditarik ke draft (tidak tampil di publik).`;
}

/** Validasi daftar slug untuk bulk: unik, tidak kosong, maks BULK_MAX. */
export function normalizeBulkSlugs(slugs: unknown): { ok: true; slugs: string[] } | { ok: false; error: string } {
  if (!Array.isArray(slugs)) return { ok: false, error: "slugs harus berupa daftar." };
  const clean = Array.from(
    new Set(slugs.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim())),
  );
  if (clean.length === 0) return { ok: false, error: "Pilih minimal satu artikel." };
  if (clean.length > BULK_MAX) return { ok: false, error: `Maksimal ${BULK_MAX} artikel per aksi.` };
  return { ok: true, slugs: clean };
}
