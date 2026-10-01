import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MessageCircle,
  Target,
  Lightbulb,
  TrendingUp,
  Quote,
} from "lucide-react";
import { ProjectCover } from "@/components/project-cover";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/icon";
import { ButtonAnchor } from "@/components/ui/button";
import { CtaContact } from "@/components/sections/cta-contact";
import { getSiteContent } from "@/lib/site-content";
import {
  getProjectBySlug,
  getProjectSlugs,
  getProjects,
} from "@/lib/projects";
import { getPortfolioMediaMap } from "@/lib/portfolio-media";
import { getSiteSettings } from "@/lib/settings";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type Params = { slug: string };

// Halaman dinamis karena proyek dikelola via dashboard (Firestore).
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Proyek tidak ditemukan" };

  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/portofolio/${slug}` },
    openGraph: {
      title: project.title,
      description: project.summary,
      type: "article",
      url: `/portofolio/${slug}`,
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const [allProjects, mediaMap, settings, { services }] = await Promise.all([
    getProjects(),
    getPortfolioMediaMap(),
    getSiteSettings(),
    getSiteContent(),
  ]);

  const service = services.find((s) => s.slug === project.serviceSlug);
  const others = allProjects.filter((p) => p.slug !== slug).slice(0, 3);

  const projectMedia = mediaMap[slug];
  const coverImage = projectMedia?.cover.secureUrl;
  const coverAlt = projectMedia?.cover.alt;
  const gallery = projectMedia?.gallery ?? [];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white pt-32 pb-12 sm:pt-36">
        <div className="grid-lines absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute -top-24 -left-24 h-[24rem] w-[24rem] animate-aurora rounded-full bg-primary/15 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl px-6">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-muted"
          >
            <Link href="/" className="transition-colors hover:text-primary">
              Beranda
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href="/portofolio"
              className="transition-colors hover:text-primary"
            >
              Portofolio
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-secondary">{project.title}</span>
          </nav>

          <span className="inline-flex items-center rounded-full bg-primary-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
            {project.category}
          </span>

          <h1 className="mt-4 text-3xl font-bold text-secondary sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {project.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            <span>
              Klien:{" "}
              <span className="font-semibold text-secondary">
                {project.client}
              </span>
            </span>
            <span>
              Tahun:{" "}
              <span className="font-semibold text-secondary">
                {project.year}
              </span>
            </span>
            {service && (
              <span>
                Layanan:{" "}
                <Link
                  href={`/layanan/${service.slug}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {service.title}
                </Link>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Cover + metrics */}
      <section className="relative bg-white pb-16">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="overflow-hidden rounded-[2rem] border border-slate-100 p-3 shadow-xl shadow-slate-900/5">
              <ProjectCover
                name={project.cover}
                accent={project.accent}
                label={project.category}
                image={coverImage}
                alt={coverAlt}
                priority
              />
            </div>
          </Reveal>

          {/* Galeri gambar tambahan */}
          {gallery.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {gallery.map((g, i) => (
                <Reveal key={g.id} delay={i * 0.06}>
                  <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                    <ProjectCover
                      name={`${project.cover}-${i}`}
                      accent={project.accent}
                      image={g.secureUrl}
                      alt={g.alt}
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-3 gap-4">
            {project.metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-slate-100 bg-surface px-4 py-5 text-center"
              >
                <p className="text-xl font-bold text-primary sm:text-2xl">
                  {m.value}
                </p>
                <p className="mt-1 text-xs text-muted">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Studi kasus */}
      <section className="relative bg-white pb-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 lg:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col rounded-3xl border border-slate-100 bg-surface p-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-500">
                <Target className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-secondary">
                Tantangan
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {project.challenge}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-3xl border border-slate-100 bg-surface p-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-500">
                <Lightbulb className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-secondary">Solusi</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {project.solution}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Hasil */}
      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold text-secondary">
              Hasil &amp; dampak
            </h2>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {project.results.map((r, i) => (
              <Reveal key={r} delay={i * 0.08}>
                <li className="flex h-full items-start gap-3 rounded-2xl border border-slate-100 bg-white p-5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm leading-relaxed text-slate-700">
                    {r}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">
              Teknologi:
            </span>
            {project.techStack.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimoni (jika ada) */}
      {project.testimonial && (
        <section className="relative bg-white py-16">
          <div className="mx-auto max-w-3xl px-6">
            <figure className="relative rounded-3xl border border-slate-100 bg-surface p-8 text-center">
              <Quote className="mx-auto h-9 w-9 text-primary/20" />
              <blockquote className="mt-4 text-lg leading-relaxed text-slate-700">
                “{project.testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center justify-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white">
                  {project.testimonial.author.charAt(0)}
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-secondary">
                    {project.testimonial.author}
                  </p>
                  <p className="text-xs text-muted">
                    {project.testimonial.role}
                  </p>
                </div>
              </figcaption>
            </figure>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative bg-white pb-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-br from-primary to-primary-dark px-8 py-10 text-center shadow-xl shadow-primary/25 sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">
                Punya kebutuhan serupa?
              </h2>
              <p className="mt-1.5 text-sm text-white/85">
                Ceritakan proyek Anda — konsultasi gratis tanpa komitmen.
              </p>
            </div>
            <ButtonAnchor
              href={waLink(
                service ? service.waMessage : WA_MESSAGES.general,
                settings.whatsapp,
              )}
              target="_blank"
              rel="noopener noreferrer"
              variant="white"
              size="lg"
              className="group shrink-0"
            >
              <MessageCircle className="h-5 w-5" />
              Mulai Konsultasi
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </ButtonAnchor>
          </div>
        </div>
      </section>

      {/* Proyek lain */}
      <section className="relative bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-secondary sm:text-3xl">
              Proyek <span className="text-gradient">lainnya</span>
            </h2>
            <Link
              href="/portofolio"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Semua proyek
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {others.map((p) => (
              <Link
                key={p.slug}
                href={`/portofolio/${p.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
              >
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white",
                    p.accent,
                  )}
                >
                  <Icon
                    name={
                      services.find((s) => s.slug === p.serviceSlug)?.icon ??
                      "sparkles"
                    }
                    className="h-5 w-5"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-secondary">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {p.client} · {p.category}
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
