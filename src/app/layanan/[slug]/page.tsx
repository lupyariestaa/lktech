import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { FaqAccordion } from "@/components/faq-accordion";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icon";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { CtaContact } from "@/components/sections/cta-contact";
import { getServiceBySlug, getServiceSlugs, SERVICES } from "@/lib/content";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

type Params = { slug: string };

// Refresh berkala agar perubahan pengaturan (kontak) ikut ter-update.
export const revalidate = 300;

export function generateStaticParams(): Params[] {
  return getServiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: "Layanan tidak ditemukan — LKTech" };

  return {
    title: `${service.title} — LKTech`,
    description: service.detail.heroDescription,
    alternates: { canonical: `/layanan/${slug}` },
    openGraph: {
      title: `${service.title} — LKTech`,
      description: service.description,
      type: "website",
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
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const settings = await getSiteSettings();
  const { detail } = service;
  const others = SERVICES.filter((s) => s.slug !== slug);

  return (
    <>
      <PageHero
        align="left"
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Layanan", href: "/layanan" },
          { label: service.title },
        ]}
        eyebrow="Layanan"
        title={
          <>
            {service.title}
          </>
        }
        description={detail.heroDescription}
      >
        <div className="flex flex-wrap items-center gap-3">
          <ButtonAnchor
            href={waLink(service.waMessage, settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="group"
          >
            <MessageCircle className="h-5 w-5" />
            Konsultasi Layanan Ini
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </ButtonAnchor>
          <ButtonAnchor href="#paket" size="lg" variant="outline">
            Lihat Paket
          </ButtonAnchor>
        </div>
      </PageHero>

      <div className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1fr_320px]">
          {/* ===== Konten utama ===== */}
          <div className="flex flex-col gap-16">
            {/* Highlight */}
            <section>
              <div className="rounded-3xl border border-primary/10 bg-primary-50/50 p-7">
                <h2 className="text-lg font-bold text-secondary">
                  Kenapa memilih layanan ini?
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {detail.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm leading-relaxed text-slate-700">
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Apa yang Anda dapatkan */}
            <section>
              <SectionTitle
                eyebrow="Deliverables"
                title="Apa yang Anda dapatkan"
              />
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {detail.deliverables.map((d, i) => (
                  <Reveal key={d.title} delay={i * 0.05}>
                    <div className="h-full rounded-2xl border border-slate-100 bg-surface p-6">
                      <h3 className="text-base font-bold text-secondary">
                        {d.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {d.description}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* Fitur utama */}
            <section>
              <SectionTitle eyebrow="Keunggulan" title="Fitur utama" />
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {detail.features.map((f, i) => (
                  <Reveal key={f.title} delay={i * 0.05}>
                    <div className="group flex h-full gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
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

            {/* Proses */}
            <section>
              <SectionTitle eyebrow="Alur Kerja" title="Proses pengerjaan" />
              <ol className="mt-8 flex flex-col gap-6">
                {detail.steps.map((s, i) => (
                  <Reveal key={s.title} delay={i * 0.05}>
                    <li className="flex gap-5">
                      <div className="flex flex-col items-center">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white shadow-lg shadow-primary/25">
                          {i + 1}
                        </span>
                        {i < detail.steps.length - 1 && (
                          <span className="mt-2 w-px flex-1 bg-gradient-to-b from-primary/30 to-transparent" />
                        )}
                      </div>
                      <div className="pb-2">
                        <h3 className="text-base font-bold text-secondary">
                          {s.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                          {s.description}
                        </p>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ol>
            </section>

            {/* Paket */}
            <section id="paket" className="scroll-mt-28">
              <SectionTitle eyebrow="Paket" title="Pilihan paket" />
              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                {detail.packages.map((pkg, i) => (
                  <Reveal key={pkg.name} delay={i * 0.06}>
                    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="text-base font-bold text-secondary">
                        {pkg.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted">{pkg.suitedFor}</p>
                      <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                        {pkg.points.map((p) => (
                          <li
                            key={p}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">
                Harga menyesuaikan kebutuhan proyek. Hubungi kami untuk
                penawaran terbaik.
              </p>
            </section>

            {/* FAQ */}
            <section>
              <SectionTitle eyebrow="FAQ" title="Pertanyaan seputar layanan" />
              <div className="mt-8">
                <FaqAccordion items={detail.faqs} />
              </div>
            </section>
          </div>

          {/* ===== Sidebar ===== */}
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <div className="flex flex-col gap-5">
              <div className="rounded-3xl border border-slate-200 bg-surface p-6">
                <h3 className="text-sm font-bold text-secondary">
                  Mulai proyek Anda
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Konsultasi gratis, tanpa komitmen. Ceritakan kebutuhan Anda dan
                  kami bantu susun solusinya.
                </p>
                <ButtonAnchor
                  href={waLink(service.waMessage, settings.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat via WhatsApp
                </ButtonAnchor>
                <ButtonAnchor
                  href={waLink(WA_MESSAGES.general, settings.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  className="mt-3 w-full"
                >
                  Konsultasi Umum
                </ButtonAnchor>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-bold text-secondary">
                  Teknologi &amp; Tools
                </h3>
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
            </div>
          </aside>
        </div>
      </div>

      {/* Layanan lain */}
      <section className="relative bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-secondary sm:text-3xl">
            Layanan <span className="text-gradient">lainnya</span>
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((s) => (
              <ButtonLink
                key={s.slug}
                href={`/layanan/${s.slug}`}
                variant="outline"
                className="group h-auto justify-between rounded-2xl p-5 text-left"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white",
                      s.accent,
                    )}
                  >
                    <Icon name={s.icon} className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-secondary">
                    {s.title}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </ButtonLink>
            ))}
          </div>
        </div>
      </section>

      <CtaContact />
    </>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
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
