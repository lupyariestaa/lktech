import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { FaqAccordion } from "@/components/faq-accordion";
import { CtaContact } from "@/components/sections/cta-contact";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { JsonLdScript } from "@/components/json-ld-script";
import { SERVICES, getService } from "@/lib/services";
import { getLocation, getLocationSlugs, isKnownLocation, serviceCityIntro } from "@/lib/locations";
import { getSiteSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/site";
import { buildBreadcrumb, buildFaqPage } from "@/lib/structured-data-pure";

type Params = { slug: string; kota: string };

export const revalidate = 300;
export const dynamicParams = false;

/**
 * Halaman programmatic SEO: layanan × kota (fase S5).
 *
 * ⚠️ Anti-doorway: hanya untuk kombinasi layanan × kota TERKURASI, dan setiap
 * halaman menyajikan konten UNIK (konteks lokal, industri, alasan lokal, FAQ
 * lokal) — bukan template dengan nama kota ditukar. `dynamicParams=false` →
 * kombinasi tak dikenal = 404 (tidak ter-index).
 */
export function generateStaticParams(): Params[] {
  const out: Params[] = [];
  for (const s of SERVICES) {
    for (const kota of getLocationSlugs()) {
      out.push({ slug: s.slug, kota });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, kota } = await params;
  const service = getService(slug);
  const loc = getLocation(kota);
  // Kombinasi layanan/kota tak dikenal → 404 (bukan halaman tipis ter-index).
  if (!service || !loc) {
    return { title: "Tidak ditemukan", robots: { index: false, follow: false } };
  }

  const title = `Jasa ${service.title} di ${loc.name}`;
  const description = `${service.title} profesional untuk bisnis di ${loc.name}, ${loc.province}. ${service.tagline} Konsultasi gratis.`;

  return {
    title,
    description,
    alternates: { canonical: `/layanan/${slug}/${kota}` },
    openGraph: {
      title,
      description,
      url: `/layanan/${slug}/${kota}`,
      type: "website",
      images: ["/opengraph-image"],
    },
  };
}

export default async function LayananKotaPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, kota } = await params;
  if (!isKnownLocation(kota)) notFound();
  const service = getService(slug);
  const loc = getLocation(kota);
  if (!service || !loc) notFound();

  const settings = await getSiteSettings();
  // Pembuka unik per (layanan × kota) — paragraf 1 (relevansi layanan), 2 (konteks kota).
  const introParagraphs = serviceCityIntro(service.slug, loc).split("\n\n");
  const waHref = waLink(
    `${service.waMessage}\n\n(Kami di ${loc.name} — ${service.title})`,
    settings.whatsapp,
  );

  // Kota sekitar (internal linking regional).
  const nearby = (loc.nearby ?? [])
    .map(getLocation)
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const url = `${SITE.url}/layanan/${slug}/${kota}`;

  // JSON-LD: Service (lokal), BreadcrumbList, FAQPage (lokal).
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Jasa ${service.title} di ${loc.name}`,
    description: service.description,
    serviceType: service.title,
    provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
    areaServed: {
      "@type": "City",
      name: loc.name,
      address: { "@type": "PostalAddress", addressLocality: loc.name, addressRegion: loc.province, addressCountry: "ID" },
    },
    url,
  };
  const breadcrumbLd = buildBreadcrumb(
    [
      { label: "Beranda", href: "/" },
      { label: "Layanan", href: "/layanan" },
      { label: service.title, href: `/layanan/${slug}` },
      { label: loc.name },
    ],
    SITE.url,
  );
  const faqLd = buildFaqPage(loc.localFaqs);

  return (
    <>
      <JsonLdScript node={serviceLd} />
      <JsonLdScript node={breadcrumbLd} />
      {faqLd && <JsonLdScript node={faqLd} />}

      <PageHero
        align="left"
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Layanan", href: "/layanan" },
          { label: service.title, href: `/layanan/${slug}` },
          { label: loc.name },
        ]}
        eyebrow={`${service.title} · ${loc.name}`}
        title={
          <>
            Jasa {service.title} di{" "}
            <span className="text-gradient">{loc.name}</span>
          </>
        }
        description={`${service.tagline} Melayani bisnis di ${loc.name}, ${loc.province}.`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <TrackedWaButton
            location={`layanan-kota-${slug}-${kota}`}
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="group"
          >
            <MessageCircle className="h-5 w-5" />
            Konsultasi Gratis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </TrackedWaButton>
          <Link
            href={`/layanan/${slug}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/30 hover:text-primary"
          >
            Detail layanan
          </Link>
        </div>
      </PageHero>

      <div className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          {/* Konteks lokal (UNIK per kota) */}
          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-secondary">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
              {service.title} untuk bisnis di {loc.name}
            </h2>
            {introParagraphs.map((p, i) => (
              <p key={i} className="mt-4 text-sm leading-relaxed text-slate-700">
                {p}
              </p>
            ))}
          </section>

          {/* Industri relevan */}
          {loc.industries.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-secondary">
                Sektor yang kami bantu di {loc.name}
              </h2>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {loc.industries.map((ind) => (
                  <span
                    key={ind}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-surface px-4 py-2 text-sm text-slate-700"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {ind}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Kenapa LKTech untuk kota ini */}
          {loc.whyLocal.length > 0 && (
            <section className="mt-12 rounded-3xl border border-primary-100 bg-primary-50/50 p-6 sm:p-7">
              <h2 className="text-sm font-bold text-secondary">
                Kenapa LKTech untuk {loc.name}?
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {loc.whyLocal.map((w) => (
                  <li key={w} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-slate-700">{w}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Paket ringkas (dari layanan) */}
          {service.detail.packages.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-secondary">
                Paket {service.title}
              </h2>
              <p className="mt-2 text-sm text-muted">
                Harga transparan, bisa disesuaikan dengan kebutuhan bisnis Anda di {loc.name}.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {service.detail.packages.slice(0, 3).map((p) => (
                  <div
                    key={p.name}
                    className="flex flex-col rounded-2xl border border-slate-100 bg-surface p-5"
                  >
                    <span className="text-sm font-bold text-secondary">{p.name}</span>
                    <span className="mt-1 text-xs text-muted">{p.suitedFor}</span>
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {p.points.slice(0, 4).map((pt) => (
                        <li key={pt} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <Link
                href={`/layanan/${slug}#paket`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                Lihat detail paket
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          )}

          {/* FAQ lokal (UNIK per kota) */}
          {loc.localFaqs.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-secondary">
                Pertanyaan seputar {service.title} di {loc.name}
              </h2>
              <div className="mt-6">
                <FaqAccordion items={loc.localFaqs} />
              </div>
            </section>
          )}

          {/* Internal linking regional */}
          {nearby.length > 0 && (
            <section className="mt-12 border-t border-slate-200 pt-8">
              <h2 className="text-sm font-bold text-secondary">Layanan di kota sekitar</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {nearby.map((l) => (
                  <Link
                    key={l.slug}
                    href={`/layanan/${slug}/${l.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    {service.title} di {l.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Layanan lain di kota yang sama */}
          <section className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-sm font-bold text-secondary">
              Layanan lain di {loc.name}
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {SERVICES.filter((s) => s.slug !== slug).map((s) => (
                <Link
                  key={s.slug}
                  href={`/layanan/${s.slug}/${kota}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  {s.title} di {loc.name}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <CtaContact />
    </>
  );
}
