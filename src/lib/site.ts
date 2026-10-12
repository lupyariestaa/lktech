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

/**
 * Koordinat lokasi kantor (fase S3). Dipakai bersama oleh halaman kontak (peta)
 * & JSON-LD `LocalBusiness` (`geo` + `hasMap`).
 */
export const BUSINESS_GEO = {
  lat: "-7.304071167612529",
  lng: "108.12106012781747",
};

/** URL Google Maps lokasi bisnis (query koordinat). */
export const BUSINESS_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${BUSINESS_GEO.lat},${BUSINESS_GEO.lng}`;

/**
 * Jam operasional bisnis (fase S3) untuk JSON-LD `openingHoursSpecification`.
 * Senin–Jumat 09:00–17:00 (WIB), Sabtu 09:00–13:00. Minggu tutup.
 */
export const BUSINESS_HOURS = [
  { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "17:00" },
  { days: ["Saturday"], opens: "09:00", closes: "13:00" },
];

/** Rentang harga indikatif (schema.org `priceRange`). */
export const BUSINESS_PRICE_RANGE = "Rp";


/**
 * Tanggal "konten terakhir diperbarui" yang STABIL antar-build (fase S1).
 * Dipakai untuk `lastModified` sitemap pada rute statis yang tidak menyimpan
 * tanggal asli — menggantikan `now` yang berubah setiap build (gap R10).
 * Perbarui manual saat konten halaman statis berubah signifikan.
 */
export const SEO_CONTENT_UPDATED = new Date("2026-10-12T00:00:00.000Z");

