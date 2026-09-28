import { COMPANY } from "@/lib/content";

/**
 * Menormalkan nilai env menjadi URL absolut yang valid.
 * - Menambahkan skema `https://` bila tidak ada.
 * - Fallback ke domain default bila nilainya tidak dapat diparsing,
 *   agar `new URL(metadataBase)` tidak pernah gagal saat build.
 */
function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const fallback = "https://lktech.id";

  if (!raw) return fallback;

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    return fallback;
  }
}

/**
 * URL situs (produksi). Bisa dioverride lewat env NEXT_PUBLIC_SITE_URL.
 * Dipakai untuk metadataBase, canonical, sitemap, dan Open Graph.
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
