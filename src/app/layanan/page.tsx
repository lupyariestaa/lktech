import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ServiceShowcase } from "@/components/service-showcase";
import { FaqAccordion } from "@/components/faq-accordion";
import { CtaContact } from "@/components/sections/cta-contact";
import { ButtonLink } from "@/components/ui/button";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { Reveal } from "@/components/motion";
import { SERVICES } from "@/lib/services";
import { getSiteContent } from "@/lib/site-content";
import { getSiteSettings } from "@/lib/settings";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Layanan",
  description:
    "Layanan digital LKTech: pembuatan website, aplikasi mobile, konsultasi teknologi, desain & branding, hingga digital marketing.",
  alternates: { canonical: "/layanan" },
  openGraph: {
    title: "Layanan",
    description:
      "Solusi digital lengkap: website, aplikasi mobile, konsultasi teknologi, desain & branding, digital marketing.",
    url: "/layanan",
  },
};

export default async function LayananPage() {
  const [{ process, faqs }, settings] = await Promise.all([
    getSiteContent(),
    getSiteSettings(),
  ]);

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Layanan" }]}
        eyebrow="Layanan Kami"
        title={
          <>
            Solusi digital <span className="text-gradient">lengkap & terpadu</span>
          </>
        }
        description={`Dari website hingga aplikasi mobile — ${SERVICES.length} layanan utama untuk membantu bisnis Anda tumbuh di dunia digital.`}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <TrackedWaButton
            location="layanan-hero"
            href={waLink(WA_MESSAGES.general, settings.whatsapp)}
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
      </PageHero>

      {/* Blok layanan bergantian (landing) */}
      <section className="relative bg-white py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 sm:gap-28">
          {SERVICES.map((service, i) => (
            <ServiceShowcase
              key={service.slug}
              service={service}
              index={i}
              whatsapp={settings.whatsapp}
            />
          ))}
        </div>
      </section>

      {/* Alur kerja */}
      {process.length > 0 && (
        <section className="relative bg-surface py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">
                Cara Kerja
              </span>
              <h2 className="mt-2 text-2xl font-bold text-secondary sm:text-3xl">
                Bagaimana kami bekerja?
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                Proses yang jelas dan transparan — dari konsultasi awal hingga
                dukungan setelah peluncuran.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {process.map((step, i) => (
                <Reveal key={step.step || i} delay={i * 0.08}>
                  <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-bold text-white">
                      {step.step || i + 1}
                    </span>
                    <h3 className="mt-4 text-sm font-bold text-secondary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ umum */}
      {faqs.length > 0 && (
        <section className="relative bg-white py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center">
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">
                FAQ
              </span>
              <h2 className="mt-2 text-2xl font-bold text-secondary sm:text-3xl">
                Pertanyaan yang sering diajukan
              </h2>
            </div>
            <div className="mt-10">
              <FaqAccordion items={faqs} />
            </div>
          </div>
        </section>
      )}

      <CtaContact />
    </>
  );
}
