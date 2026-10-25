/**
 * Feature flag SEO MURNI (fase D7) — kill switch server-side untuk kapabilitas
 * baru (crawling & API tambahan). Bebas impor runtime agar dapat diuji.
 *
 * Tujuan: bila sebuah kapabilitas bermasalah, admin dapat menonaktifkannya
 * lewat env tanpa redeploy kode. Default: SEMUA AKTIF. Nonaktif bersifat
 * eksplisit (`SEO_DISABLED_FEATURES`).
 */

export const SEO_FEATURES = ["gsc", "audit", "ga4"] as const;
export type SeoFeature = (typeof SEO_FEATURES)[number];

/** Label tampilan per fitur. */
export const SEO_FEATURE_LABEL: Record<SeoFeature, string> = {
  gsc: "Laporan Search Console",
  audit: "Audit teknis on-demand",
  ga4: "Laporan Google Analytics 4",
};

/** Nama env yang dibaca; didokumentasikan agar mudah ditelusuri. */
export const SEO_DISABLED_FEATURES_ENV = "SEO_DISABLED_FEATURES";

function isSeoFeature(value: string): value is SeoFeature {
  return (SEO_FEATURES as readonly string[]).includes(value);
}

/**
 * Parse daftar fitur yang dinonaktifkan dari env (dipisah koma). Nilai tak
 * dikenal diabaikan; duplikat dibuang; urutan mengikuti `SEO_FEATURES`.
 */
export function parseDisabledFeatures(raw: unknown): SeoFeature[] {
  const disabled = new Set<SeoFeature>();
  for (const part of String(raw ?? "").split(",")) {
    const name = part.trim().toLowerCase();
    if (isSeoFeature(name)) disabled.add(name);
  }
  return SEO_FEATURES.filter((feature) => disabled.has(feature));
}

/** Peta status aktif/nonaktif untuk SEMUA fitur (default aktif). */
export function resolveSeoFlags(disabled: readonly SeoFeature[]): Record<SeoFeature, boolean> {
  return Object.fromEntries(SEO_FEATURES.map((feature) => [feature, !disabled.includes(feature)])) as Record<
    SeoFeature,
    boolean
  >;
}

export function isSeoFeatureEnabled(flags: Record<SeoFeature, boolean>, feature: SeoFeature): boolean {
  return flags[feature] === true;
}

/** Pintasan: apakah `feature` aktif berdasarkan nilai env mentah. */
export function seoFeatureEnabled(feature: SeoFeature, rawDisabled: unknown): boolean {
  return !parseDisabledFeatures(rawDisabled).includes(feature);
}
