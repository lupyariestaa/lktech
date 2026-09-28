import { COMPANY } from "@/lib/content";

/**
 * URL situs (produksi). Bisa dioverride lewat env NEXT_PUBLIC_SITE_URL.
 * Dipakai untuk metadataBase, canonical, sitemap, dan Open Graph.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lktech.id"
).replace(/\/$/, "");

export const SITE = {
  name: COMPANY.name,
  title: "LKTech — Teknologi Modern, Hasil Nyata",
  description:
    "LKTech menyediakan jasa pembuatan website, aplikasi mobile, dan konsultasi teknologi modern untuk bisnis Anda. Harga kompetitif, layanan personal, hasil berkualitas.",
  url: SITE_URL,
  ogImage: "/opengraph-image",
  locale: "id_ID",
};
