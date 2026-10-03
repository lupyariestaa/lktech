import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  MessageCircle,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icon";
import { FaqAccordion } from "@/components/faq-accordion";
import { ServicePackages } from "@/components/service-packages";
import { CtaContact } from "@/components/sections/cta-contact";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { SERVICES, getService, getServiceSlugs } from "@/lib/services";
import { getSiteSettings } from "@/lib/settings";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/site";

type Params = { slug: string };

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getServiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Layanan tidak ditemukan" };

  return {
    title: service.title,
    description: service.description,
    alternates: { canonical: `/layanan/${slug}` },
    openGraph: {
      title: service.title,
      description: service.description,
      url: `/layanan/${slug}`,
    },
  };
}

export default async function LayananDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const settings = await getSiteSettings();
  const { detail } = service;
  const others = SERVICES.filter((s) => s.slug !== slug).slice(0, 4);
  const sections = {
    kinds: detail.kinds ?? [],
    useCases: detail.useCases ?? [],
    packageCompare: detail.packageCompare,
  };

  const waHref = waLink(service.waMessage, settings.whatsapp);

  return (
    <>
      {/* JSON-LD Service */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.title,
            description: service.description,
            serviceType: service.title,
            provider: { "@type": "Organization", name: "LKTech" },
            areaServed: "ID",
            url: `${SITE.url}/layanan/${service.slug}`,
          }),
        }}
      />

      <PageHero
        align="left"
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Layanan", href: "/layanan" },
          { label: service.title },
        ]}
        eyebrow="Layanan"
        title={service.title}
        description={detail.heroDescription}
      >
        <div className="flex flex-wrap items-center gap-3">
          <ButtonAnchor
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="group"
          >
            <MessageCircle className="h-5 w-5" />
            Konsultasi Layanan Ini
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </ButtonAnchor>
          <ButtonLink href="#paket" size="lg" variant="outline">
            Lihat Paket
          </ButtonLink>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {detail.packages.length} pilihan paket
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-medium">
            {detail.steps.length} tahap pengerjaan
          </span>
        </div>
      </PageHero>

      <div className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ===== Konten utama ===== */}
          <div className="flex min-w-0 flex-col gap-14">
            {/* Highlights */}
            {detail.highlights.length > 0 && (
              <section className="rounded-3xl border border-primary-100 bg-primary-50/50 p-6 sm:p-7">
                <h2 className="text-sm font-bold text-secondary">
                  Kenapa memilih layanan ini?
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {detail.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm text-slate-700">{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Apa saja yang bisa kami buat */}
            {sections.kinds.length > 0 && (
              <section>
                <SectionTitle
                  eyebrow="Cakupan"
                  title="Apa saja yang bisa kami buat"
                />
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
                  Berikut berbagai jenis yang bisa kami kerjakan. Punya kebutuhan
                  lain? Tanyakan — kemungkinan besar bisa.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {sections.kinds.map((k, i) => (
                    <Reveal key={k.title} delay={i * 0.04}>
                      <div className="flex h-full gap-4 rounded-2xl border border-slate-100 bg-surface p-5">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                          <Icon name={k.icon} className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-secondary">
                            {k.title}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            {k.description}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            {/* Cocok untuk */}
            {sections.useCases.length > 0 && (
              <section>
                <SectionTitle eyebrow="Cocok Untuk" title="Siapa yang cocok?" />
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {sections.useCases.map((u, i) => (
                    <Reveal key={u.title} delay={i * 0.05}>
                      <div className="flex h-full gap-3 rounded-2xl border border-slate-100 bg-white p-5">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-white">
                          <Target className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-secondary">
                            {u.title}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted">
                            {u.description}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            {/* Deliverables */}
            {detail.deliverables.length > 0 && (
              <section>
                <SectionTitle
                  eyebrow="Deliverables"
                  title="Apa yang Anda dapatkan"
                />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {detail.deliverables.map((d, i) => (
                    <Reveal key={d.title} delay={i * 0.06}>
                      <div className="flex h-full gap-4 rounded-2xl border border-slate-100 bg-surface p-5">
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-secondary">
                            {d.title}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            {d.description}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            {/* Features */}
            {detail.features.length > 0 && (
              <section>
                <SectionTitle eyebrow="Keunggulan" title="Fitur utama" />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {detail.features.map((f, i) => (
                    <Reveal key={f.title} delay={i * 0.05}>
                      <div className="flex h-full gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-slate-900/5">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                          <Icon name={f.icon} className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-secondary">
                            {f.title}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            {f.description}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            {/* Proses */}
            {detail.steps.length > 0 && (
              <section>
                <SectionTitle eyebrow="Alur Kerja" title="Proses pengerjaan" />
                <ol className="relative mt-8 flex flex-col gap-6 border-l border-slate-200 pl-8">
                  {detail.steps.map((s, i) => (
                    <li key={s.title} className="relative">
                      <span className="absolute -left-[41px] grid h-7 w-7 place-items-center rounded-full border-4 border-white bg-primary text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <h3 className="text-sm font-bold text-secondary">
                        {s.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {s.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Paket */}
            {detail.packages.length > 0 && (
              <section id="paket" className="scroll-mt-28">
                <SectionTitle eyebrow="Paket" title="Pilihan paket" />
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
                  Tiap paket mencakup cakupan berbeda. Pilih yang paling sesuai,
                  atau konsultasikan kebutuhan khusus Anda.
                </p>
                <div className="mt-8">
                  <ServicePackages
                    packages={detail.packages}
                    compare={sections.packageCompare}
                    waMessage={service.waMessage}
                    whatsapp={settings.whatsapp}
                  />
                </div>
              </section>
            )}

            {/* FAQ layanan */}
            {detail.faqs.length > 0 && (
              <section>
                <SectionTitle
                  eyebrow="FAQ"
                  title="Pertanyaan seputar layanan"
                />
                <div className="mt-8">
                  <FaqAccordion items={detail.faqs} />
                </div>
              </section>
            )}
          </div>

          {/* ===== Sidebar ===== */}
          <aside className="hidden lg:sticky lg:top-28 lg:block lg:h-fit">
            <div className="flex flex-col gap-5">
              <div className="rounded-3xl border border-slate-200 bg-surface p-6">
                <p className="text-xs font-medium text-muted">
                  Mulai proyek Anda
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  Ceritakan kebutuhan Anda — kami bantu tentukan paket & langkah
                  terbaik, gratis.
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <ButtonAnchor
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="md"
                    className="w-full justify-center"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat via WhatsApp
                  </ButtonAnchor>
                  <ButtonLink
                    href="/kontak"
                    size="md"
                    variant="outline"
                    className="w-full justify-center"
                  >
                    Konsultasi Umum
                  </ButtonLink>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                  <Wrench className="h-4 w-4 text-primary" />
                  Teknologi & Tools
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.techStack.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Langkah berikutnya
                </div>
                <ol className="mt-4 flex flex-col gap-3 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span> Konsultasi
                    gratis via WhatsApp
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span> Kami kirim
                    penawaran & estimasi
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span> Kerjakan
                    & serahkan hasil
                  </li>
                </ol>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Layanan lainnya */}
      <section className="relative bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-secondary sm:text-3xl">
              Layanan <span className="text-gradient">lainnya</span>
            </h2>
            <Link
              href="/layanan"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Semua layanan
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((s) => (
              <Link
                key={s.slug}
                href={`/layanan/${s.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
              >
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${s.accent}`}
                >
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-secondary">
                    {s.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {s.tagline}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaContact />
    </>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <span className="text-xs font-semibold tracking-widest text-primary uppercase">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-2xl font-bold text-secondary sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
