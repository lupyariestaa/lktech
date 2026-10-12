/**
 * Logika SEO murni — memetakan pengaturan SEO dari dashboard (`settings.seo`)
 * ke nilai metadata yang benar-benar dikonsumsi root layout.
 *
 * Latar (gap G1): sebelumnya field `settings.seo.*` hanya tersimpan tanpa
 * konsumen, sehingga admin mengisi Meta Title/Description/OG/verification tetapi
 * situs tidak berubah. Modul ini menjadikan pengaturan itu BERDAMPAK.
 *
 * Bebas impor runtime agar dapat diuji Node.
 */

import type { SeoSettings } from "@/lib/settings-types";

export type ResolvedSeo = {
  title?: string;
  description?: string;
  ogImage?: string;
  /** Nilai konten `<meta name="google-site-verification">`. */
  searchConsoleId?: string;
};

/** Normalisasi satu nilai teks: trim; kembalikan `undefined` bila kosong. */
function clean(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Ambil nilai SEO yang benar-benar terisi dari `settings.seo`.
 * Semua field opsional; hanya yang tidak kosong yang dikembalikan.
 */
export function resolveSeo(seo: SeoSettings | undefined): ResolvedSeo {
  if (!seo || typeof seo !== "object") return {};
  const out: ResolvedSeo = {};
  const title = clean(seo.title);
  const description = clean(seo.description);
  const ogImage = clean(seo.ogImage);
  const searchConsoleId = clean(seo.searchConsoleId);
  if (title) out.title = title;
  if (description) out.description = description;
  if (ogImage) out.ogImage = ogImage;
  if (searchConsoleId) out.searchConsoleId = searchConsoleId;
  return out;
}

/** `true` bila ada minimal satu field SEO yang terisi. */
export function hasSeo(seo: SeoSettings | undefined): boolean {
  return Object.keys(resolveSeo(seo)).length > 0;
}
