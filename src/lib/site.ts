import { COMPANY } from "@/lib/content";

/**
 * Menormalkan nilai env menjadi URL absolut yang valid.
 * - Menambahkan skema `https://` bila tidak ada.
 * - Fallback ke domain default bila nilainya tidak dapat diparsing,
 *   agar `new URL(metadataBase)` tidak pernah gagal saat build.
 *
 * Mendukung dua nama env:
 * - `SITE_URL` (server-only, direkomendasikan untuk produksi)
 * - `NEXT_PUBLIC_SITE_URL` (fallback / kompatibilitas)
 */
function resolveSiteUrl(): string {
  const raw = (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).trim();
  const fallback = "https://lktech.id";

  if (!raw) {
    // `XL-5`: jangan gagalkan diam-diam di produksi — beri peringatan jelas
    // agar canonical/OG/sitemap/tautan email tak memakai domain placeholder.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[site] SITE_URL belum diisi — memakai fallback " +
          fallback +
          ". Set SITE_URL di environment produksi.",
      );
    }
    return fallback;
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    return fallback;
  }
}

/**
 * URL situs (produksi). Dipakai untuk metadataBase, canonical, sitemap,
 * dan Open Graph — semua kebutuhan server-side.
 */
export const SITE_URL = resolveSiteUrl();

export const SITE = {
  name: COMPANY.name,
  title: "LKTech — Teknologi Modern, Hasil Nyata",
  description:
    "LKTech menyediakan jasa pembuatan website, aplikasi mobile, dan konsultasi teknologi modern untuk bisnis Anda. Harga kompetitif, layanan personal, hasil berkualitas.",
  url: SITE_URL,
  ogImage: "/opengraph-image",
  locale: "id_ID",
};
