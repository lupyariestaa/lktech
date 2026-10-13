import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Target, Compass } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icon";
import { Stats } from "@/components/sections/stats";
import { Technologies } from "@/components/sections/technologies";
import { CtaContact } from "@/components/sections/cta-contact";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { ButtonLink } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { ABOUT, COMPANY } from "@/lib/content";
import { SITE } from "@/lib/site";
import { buildBreadcrumb, type JsonLd } from "@/lib/structured-data-pure";
import { JsonLdScript } from "@/components/json-ld-script";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Kenali LKTech — mitra teknologi dari Tasikmalaya yang membantu bisnis tumbuh lewat website, aplikasi mobile, dan konsultasi teknologi yang jujur dan berkualitas.",
  alternates: { canonical: "/tentang" },
  openGraph: {
    title: "Tentang Kami",
    description:
      "Mitra teknologi yang membantu bisnis tumbuh lewat website, aplikasi mobile, dan konsultasi teknologi.",
    url: "/tentang",
  },
};

export default async function TentangPage() {
  const settings = await getSiteSettings();

  const breadcrumbLd = buildBreadcrumb(
    [{ label: "Beranda", href: "/" }, { label: "Tentang Kami" }],
    SITE.url,
  );

  // Node `AboutPage` — menautkan halaman ini ke Organisasi (konteks entitas).
  const aboutLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Tentang Kami",
    url: `${SITE.url}/tentang`,
    description: SITE.description,
    mainEntity: {
      "@type": "Organization",
      name: COMPANY.name,
      description: ABOUT.mission,
      email: settings.email,
      address: settings.location,
      url: SITE.url,
    },
  };

  return (
    <>
      <JsonLdScript node={[breadcrumbLd, aboutLd].filter((n): n is JsonLd => n !== null)} />

      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Tentang Kami" }]}
        eyebrow="Tentang Kami"
        title={
          <>
            Mitra teknologi, bukan sekadar{" "}
            <span className="text-gradient">vendor</span>
          </>
        }
        description={`Kami tim kecil dari ${COMPANY.location} yang percaya hasil nyata lebih berharga daripada janji besar.`}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <TrackedWaButton
            location="tentang-hero"
            href={waLink(WA_MESSAGES.general, settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="group"
          >
            <MessageCircle className="h-5 w-5" />
            Ngobrol dengan Kami
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </TrackedWaButton>
          <ButtonLink href="/portofolio" size="lg" variant="outline">
            Lihat Karya Kami
          </ButtonLink>
        </div>
      </PageHero>

      {/* Cerita */}
      <section className="relative bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
              Cerita Kami
            </span>
            <h2 className="mt-4 text-3xl font-bold text-secondary sm:text-4xl">
              Dari masalah nyata, menjadi{" "}
              <span className="text-gradient">solusi nyata</span>
            </h2>
            <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-muted sm:text-base">
              {ABOUT.story.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative">
              <div className="pointer-events-none absolute -top-10 -right-6 h-40 w-40 rounded-full bg-primary/10 blur-[80px]" />
              <div className="relative grid gap-4 rounded-3xl border border-slate-100 bg-surface p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
                    <Target className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-secondary">Misi</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {ABOUT.mission}
                    </p>
                  </div>
                </div>
                <div className="h-px bg-slate-200/70" />
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
                    <Compass className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-secondary">Visi</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {ABOUT.vision}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Nilai & prinsip */}
      <section className="relative bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            eyebrow="Nilai Kami"
            title={
              <>
                Prinsip yang kami <span className="text-gradient">pegang</span>
              </>
            }
            description="Bukan sekadar slogan — ini yang membentuk cara kami bekerja setiap hari."
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT.values.map((value, i) => (
              <Reveal key={value.title} delay={i * 0.08}>
                <div className="group h-full rounded-3xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                    <Icon name={value.icon} className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-secondary">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {value.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Teknologi (marquee, dari konten terkelola) */}
      <Technologies />

      {/* Statistik kumulatif — tersembunyi otomatis bila masih angka contoh */}
      <Stats />

      {/* Penutup + CTA */}
      <section className="relative bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <SectionHeading
            eyebrow="Mari Berkolaborasi"
            title={
              <>
                Siap membawa bisnis Anda{" "}
                <span className="text-gradient">naik kelas?</span>
              </>
            }
            description="Ceritakan kebutuhan Anda. Kami bantu temukan solusi digital yang paling tepat — tanpa komitmen di awal."
          />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/kontak" size="lg" className="group">
              Mulai Konsultasi
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </ButtonLink>
            <Link
              href="/layanan"
              className="inline-flex h-13 items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-8 text-sm font-semibold text-secondary backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary max-sm:h-12 max-sm:px-6"
            >
              Jelajahi Layanan
            </Link>
          </div>
        </div>
      </section>

      <CtaContact />
    </>
  );
}