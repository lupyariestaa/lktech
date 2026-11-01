/**
 * Logika MURNI daftar lead (Sprint 12 / ADM-16) — bebas impor runtime agar
 * dapat diuji Node tanpa alias resolver.
 *
 * Latar: pencarian & filter lead dulu hanya berlaku pada halaman yang sudah
 * dimuat di klien. Modul ini menyatukan pencocokan query + paginasi jendela
 * hasil pindai agar route server bisa mencari/filter seluruh lead dengan
 * batas yang jujur (`truncated`).
 */

/** Ukuran satu batch pemindaian dokumen lead (satu `.get()` per batch). */
export const LEAD_SCAN_BATCH = 500;

/** Batas keras dokumen lead per permintaan daftar (pengaman biaya/latensi). */
export const LEAD_SCAN_CAP = 5000;

/** Batas keras jumlah baris pada ekspor lead. */
export const LEAD_EXPORT_CAP = 5000;

/** Filter pencarian/status lead (bentuk minimal yang dipakai logika murni). */
export type LeadQueryFilter = {
  q?: string;
  status?: string;
};

/** Bentuk minimal lead untuk pencocokan: butuh field teks + status. */
export type MatchableLead = {
  name?: string;
  email?: string;
  service?: string;
  message?: string;
  status?: string;
};

/** Normalisasi kata kunci pencarian (trim + lowercase). */
export function normalizeLeadQuery(q?: string): string {
  return (q ?? "").trim().toLowerCase();
}

/**
 * Apakah lead cocok dengan filter status & kata kunci.
 *
 * - `status` kosong/`"semua"` → tanpa filter status.
 * - Lead tanpa `status` dianggap `"baru"` (backward-compatible dengan lead lama).
 * - Kata kunci dicocokkan sebagai substring pada nama, email, layanan, pesan
 *   (sama dengan perilaku pencarian klien sebelumnya).
 */
export function matchesLeadQuery(
  lead: MatchableLead,
  filter: LeadQueryFilter = {},
): boolean {
  const status = filter.status ?? "semua";
  if (status !== "semua" && (lead.status ?? "baru") !== status) return false;

  const q = normalizeLeadQuery(filter.q);
  if (!q) return true;

  return [lead.name, lead.email, lead.service, lead.message].some((value) =>
    (value ?? "").toLowerCase().includes(q),
  );
}

/** `true` bila ada pencarian/filter yang perlu pindai server (bukan paginasi murni). */
export function hasLeadFilter(filter: LeadQueryFilter = {}): boolean {
  return (
    normalizeLeadQuery(filter.q).length > 0 ||
    (filter.status ?? "semua") !== "semua"
  );
}

/**
 * Potong satu halaman dari daftar hasil yang sudah difilter.
 *
 * - Kursor berbasis `id` dokumen; bila tak ditemukan (mis. data berubah),
 *   mulai dari awal agar tidak menghilangkan data baru.
 * - `truncated` = `true` bila pemindaian sumber menyentuh batas keras, sehingga
 *   daftar yang dipaginasi mungkin BELUM lengkap (bukan berarti "masih ada
 *   halaman").
 */
export function paginateLeads<T extends { id: string }>(input: {
  filtered: readonly T[];
  cursorId: string | null;
  limit: number;
  scanExhausted: boolean;
}): { items: T[]; nextCursor: string | null; truncated: boolean } {
  const limit = Number.isFinite(input.limit)
    ? Math.max(1, Math.floor(input.limit))
    : 1;

  let start = 0;
  if (input.cursorId) {
    const idx = input.filtered.findIndex((l) => l.id === input.cursorId);
    start = idx >= 0 ? idx + 1 : 0;
  }

  const items = input.filtered.slice(start, start + limit);
  const last = items[items.length - 1];
  const hasMore = start + limit < input.filtered.length;

  return {
    items,
    nextCursor: hasMore && last ? last.id : null,
    truncated: !input.scanExhausted,
  };
}
