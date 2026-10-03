import type { Metadata } from "next";
import { ArrowRight, Check, MessageCircle, Sparkles } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/motion";
import { FaqAccordion } from "@/components/faq-accordion";
import { PricingTable } from "@/components/pricing-table";
import { CtaContact } from "@/components/sections/cta-contact";
import { ButtonLink } from "@/components/ui/button";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { getSiteContent } from "@/lib/site-content";
import { getSiteSettings } from "@/lib/settings";
import { PRICING_FAQS } from "@/lib/pricing";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Harga & Paket",
  description:
    "Paket layanan LKTech yang jelas & transparan — Basic, Profesional, Enterprise. Bandingkan fitur, konsultasi gratis, tanpa biaya tersembunyi.",
  alternates: { canonical: "/harga" },
  openGraph: {
    title: "Harga & Paket",
    description:
      "Paket layanan yang jelas & transparan. Bandingkan fitur Basic, Profesional, dan Enterprise — konsultasi gratis.",
    url: "/harga",
  },
};

export default async function HargaPage() {
  const [{ pricing }, settings] = await Promise.all([
    getSiteContent(),
    getSiteSettings(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Harga", item: `${SITE.url}/harga` },
    ],
  };

  const offerCatalog = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Paket Layanan LKTech",
    itemListElement: pricing.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: plan.description,
      itemOffered: {
        "@type": "Service",
        name: `Paket ${plan.name}`,
        description: plan.description,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalog) }}
      />

      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Harga" }]}
        eyebrow="Harga & Paket"
        title={
          <>
            Harga yang <span className="text-gradient">jelas & transparan</span>
          </>
        }
        description="Setiap paket fleksibel dan bisa disesuaikan dengan kebutuhan. Mulai dari konsultasi gratis — tanpa biaya tersembunyi."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <TrackedWaButton
            location="harga-hero"
            href={waLink(WA_MESSAGES.pricing, settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="group"
          >
            <MessageCircle className="h-5 w-5" />
            Konsultasi Gratis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </TrackedWaButton>
          <ButtonLink href="/produk" size="lg" variant="outline">
            Lihat Produk
          </ButtonLink>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {pricing.length} pilihan paket
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-medium">
            Konsultasi awal gratis
          </span>
        </div>
      </PageHero>

      {/* Kartu paket */}
      <section className="relative bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Paket Layanan
            </span>
            <h2 className="mt-2 text-2xl font-bold text-secondary sm:text-3xl">
              Pilih paket yang <span className="text-gradient">sesuai kebutuhan</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Belum yakin paket mana yang tepat? Konsultasikan gratis — kami bantu
              memilih yang paling sesuai dengan tujuan dan anggaran Anda.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {pricing.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.08}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300",
                    plan.highlight
                      ? "border-primary/30 bg-white shadow-2xl shadow-primary/15 lg:-translate-y-3"
                      : "border-slate-200 bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5",
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-white shadow-lg shadow-primary/30">
                      <Sparkles className="h-3 w-3" />
                      Paling Populer
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-secondary">{plan.name}</h3>
                  <p className="mt-2 text-sm text-muted">{plan.description}</p>

                  <div className="mt-5 border-y border-dashed border-slate-200 py-5">
                    <p className="text-sm font-semibold text-primary">
                      Konsultasi Gratis
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Harga menyesuaikan kebutuhan proyek Anda
                    </p>
                  </div>

                  <ul className="mt-6 flex flex-1 flex-col gap-3">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm text-slate-700"
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                            plan.highlight
                              ? "bg-primary text-white"
                              : "bg-primary-50 text-primary",
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <TrackedWaButton
                    location="harga-paket"
                    label={plan.name}
                    href={waLink(WA_MESSAGES.pricing, settings.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant={plan.highlight ? "primary" : "outline"}
                    className="mt-7 w-full"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Pilih Paket {plan.name}
                  </TrackedWaButton>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Tabel banding */}
      <section className="relative bg-surface py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Bandingkan
            </span>
            <h2 className="mt-2 text-2xl font-bold text-secondary sm:text-3xl">
              Fitur tiap <span className="text-gradient">paket</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Lihat cakupan masing-masing paket berdampingan. Butuh di luar ini?
              Semua bisa disesuaikan.
            </p>
          </div>

          <div className="mt-12">
            <PricingTable />
          </div>
        </div>
      </section>

      {/* FAQ harga */}
      <section className="relative bg-white py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              FAQ
            </span>
            <h2 className="mt-2 text-2xl font-bold text-secondary sm:text-3xl">
              Pertanyaan seputar harga
            </h2>
          </div>
          <div className="mt-10">
            <FaqAccordion items={PRICING_FAQS} />
          </div>
        </div>
      </section>

      <CtaContact />
    </>
  );
}
