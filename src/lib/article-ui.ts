/**
 * Logika murni UI blog publik (tanpa React, tanpa alias "@/") agar bisa dites.
 */

/** Blok heading minimal untuk membangun TOC (diambil dari AST markdown). */
export type TocHeading = { level: 2 | 3 | 4; id: string; text: string };

/**
 * TOC: hanya `h2` dan `h3` (B6.3). `h4` tidak masuk daftar isi agar ringkas.
 * Id kosong atau duplikat dilewati (duplikat dibuang, bukan diberi nomor, agar
 * tautan tidak menebak).
 */
export function buildToc(headings: TocHeading[]): TocHeading[] {
  const seen = new Set<string>();
  const out: TocHeading[] = [];
  for (const h of headings) {
    if (h.level > 3 || !h.id || seen.has(h.id)) continue;
    seen.add(h.id);
    out.push(h);
  }
  return out;
}

/** Kode layanan utama per kategori artikel (fallback: layanan umum). */
export const CATEGORY_SERVICE: Record<string, string> = {
  "Tips & Trik": "pembuatan-website",
  "Bisnis Digital": "pembuatan-website",
  Teknologi: "pengembangan-aplikasi",
  Panduan: "pembuatan-website",
};

/** Slug layanan untuk CTA sidebar. Kategori tak dikenal → layanan umum. */
export function serviceSlugForCategory(category: string): string {
  return CATEGORY_SERVICE[category] ?? "pembuatan-website";
}

/** URL share WhatsApp dengan teks + tautan (B6.4). */
export function whatsappShareUrl(title: string, url: string): string {
  const text = `${title}\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Ringkasan waktu baca "N menit baca". */
export function readingLabel(minutes: number | undefined): string {
  const m = typeof minutes === "number" && minutes > 0 ? Math.round(minutes) : 1;
  return `${m} menit baca`;
}

/** Bentuk query halaman daftar artikel (dari URL). */
export type ListQuery = { q: string; category: string; tag: string; page: number };

/**
 * Baca query dari URL. Nilai tak dikenal dibersihkan; halaman minimal 1.
 * Kategori dibandingkan dengan daftar yang sah.
 */
export function parseListQuery(
  sp: Record<string, string | string[] | undefined>,
  validCategories: string[],
): ListQuery {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).slice(0, 100).trim();
  const rawCat = one(sp.kategori).trim();
  const category = validCategories.includes(rawCat) ? rawCat : "";
  const tag = one(sp.tag).slice(0, 60).trim();
  const page = Math.max(1, Math.floor(Number(one(sp.halaman)) || 1));
  return { q, category, tag, page };
}

/** Jumlah artikel per "muat lebih banyak" di halaman /blog. */
export const LIST_PAGE_SIZE = 9;

/**
 * Potong daftar sesuai halaman (1-based). Mengembalikan item & info masih ada.
 */
export function pageSlice<T>(items: T[], page: number, size = LIST_PAGE_SIZE) {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    hasMore: start + size < items.length,
    total: items.length,
  };
}

/** Bangun query string untuk tautan halaman, mempertahankan filter. */
export function listHref(base: string, q: Partial<ListQuery>): string {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.category) sp.set("kategori", q.category);
  if (q.tag) sp.set("tag", q.tag);
  if (q.page && q.page > 1) sp.set("halaman", String(q.page));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}
