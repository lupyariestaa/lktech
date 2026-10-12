import { COMPANY } from "@/lib/content";
import {
  SITE,
  BUSINESS_GEO,
  BUSINESS_MAPS_URL,
  BUSINESS_HOURS,
  BUSINESS_PRICE_RANGE,
} from "@/lib/site";
import { resolveSeo } from "@/lib/seo-pure";
import {
  buildOpeningHours,
  buildSearchAction,
  buildSameAs,
} from "@/lib/structured-data-pure";
import type { SiteSettings } from "@/lib/settings-types";

/**
 * JSON-LD structured data (schema.org) global (fase S3) untuk SEO.
 * Membantu mesin pencari memahami identitas, layanan, & situs LKTech.
 *
 * Mengeluarkan dua node:
 * - `ProfessionalService` — identitas bisnis LENGKAP (kontak, geo, jam, sameAs,
 *   contactPoint, hasMap, areaServed).
 * - `WebSite` — entitas situs + `SearchAction` (sitelinks searchbox) agar Google
 *   dapat menautkan brand ↔ situs & menampilkan kotak pencarian situs.
 *
 * Catatan: `SearchAction` menunjuk ke `/blog?q=` (satu-satunya endpoint pencarian
 * publik saat ini).
 */
export function StructuredData({ settings }: { settings: SiteSettings }) {
  // Override SEO dari dashboard (gap G1) — jaga konsistensi deskripsi JSON-LD
  // dengan metadata root layout.
  const seo = resolveSeo(settings.seo);

  // Alamat diturunkan dari pengaturan (dikelola dashboard). Format lokasi
  // bebas, jadi kita kirim sebagai `addressLocality` bila tidak terurai.
  const locationParts = settings.location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // S3: profil sosial (sameAs) dari pengaturan dashboard (hanya URL http(s)).
  const sameAs = buildSameAs((settings.socials ?? []).map((s) => s.href));

  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE.url}/#organization`,
    name: COMPANY.name,
    description: seo.description ?? SITE.description,
    url: SITE.url,
    logo: `${SITE.url}/logo/lktech-logo.svg`,
    image: `${SITE.url}${SITE.ogImage}`,
    email: settings.email,
    telephone: `+${settings.whatsapp}`,
    // Format ISO 8601 (YYYY-MM-DD) agar valid menurut schema.org.
    foundingDate: `${COMPANY.year}-01-01`,
    priceRange: BUSINESS_PRICE_RANGE,
    address: {
      "@type": "PostalAddress",
      addressLocality: locationParts[0] ?? settings.location,
      addressRegion: locationParts[1],
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS_GEO.lat,
      longitude: BUSINESS_GEO.lng,
    },
    hasMap: BUSINESS_MAPS_URL,
    openingHoursSpecification: buildOpeningHours(BUSINESS_HOURS),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${settings.whatsapp}`,
      email: settings.email,
      contactType: "customer service",
      areaServed: "ID",
      availableLanguage: ["id", "en"],
    },
    areaServed: {
      "@type": "Country",
      name: "Indonesia",
    },
    knowsAbout: [
      "Pembuatan Website",
      "Aplikasi Mobile",
      "Konsultasi Teknologi",
      "Desain & Branding",
      "Digital Marketing",
      "Produk Digital",
    ],
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  const website: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: COMPANY.name,
    alternateName: SITE.title,
    url: SITE.url,
    description: seo.description ?? SITE.description,
    inLanguage: "id-ID",
    publisher: { "@id": `${SITE.url}/#organization` },
    // S3: sitelinks searchbox — pencarian situs diarahkan ke /blog?q=
    potentialAction: buildSearchAction(`${SITE.url}/blog?q={search_term_string}`),
  };

  return (
    <script
      type="application/ld+json"
      // Data statis & tepercaya (bukan input pengguna) — aman untuk inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify([business, website]) }}
    />
  );
}
