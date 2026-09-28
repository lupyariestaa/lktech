import { COMPANY } from "@/lib/content";
import { SITE } from "@/lib/site";
import type { SiteSettings } from "@/lib/settings-types";

/**
 * JSON-LD structured data (schema.org) untuk SEO.
 * Membantu mesin pencari memahami identitas & layanan LKTech.
 */
export function StructuredData({ settings }: { settings: SiteSettings }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: COMPANY.name,
    description: SITE.description,
    url: SITE.url,
    logo: `${SITE.url}/logo/lktech-logo.svg`,
    image: `${SITE.url}${SITE.ogImage}`,
    email: settings.email,
    telephone: `+${settings.whatsapp}`,
    foundingDate: String(COMPANY.year),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Padakembang",
      addressRegion: "Jawa Barat",
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
