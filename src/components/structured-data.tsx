import { COMPANY } from "@/lib/content";
import { SITE } from "@/lib/site";
import type { SiteSettings } from "@/lib/settings-types";

/**
 * JSON-LD structured data (schema.org) untuk SEO.
 * Membantu mesin pencari memahami identitas & layanan LKTech.
 */
export function StructuredData({ settings }: { settings: SiteSettings }) {
  // Alamat diturunkan dari pengaturan (dikelola dashboard). Format lokasi
  // bebas, jadi kita kirim sebagai `addressLocality` bila tidak terurai.
  const locationParts = settings.location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const data = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: COMPANY.name,
    description: SITE.description,
    url: SITE.url,
    logo: `${SITE.url}/logo/lktech-logo.svg`,
    email: settings.email,
    telephone: `+${settings.whatsapp}`,
    // Format ISO 8601 (YYYY-MM-DD) agar valid menurut schema.org.
    foundingDate: `${COMPANY.year}-01-01`,
    address: {
      "@type": "PostalAddress",
      addressLocality: locationParts[0] ?? settings.location,
      addressRegion: locationParts[1],
      addressCountry: "ID",
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
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Data statis & tepercaya (bukan input pengguna) — aman untuk inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
