import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { FaqAccordion } from "@/components/faq-accordion";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolLocalBadge } from "@/components/tools/tool-badges";
import { ToolsCta } from "@/components/tools/tools-cta";
import { JsonLdScript } from "@/components/json-ld-script";
import { SITE } from "@/lib/site";
import {
  getToolGuide,
  toolGuideSlugs,
  TOOL_GUIDES_UPDATED,
} from "@/lib/tools-guides-pure";
import {
  TOOL_CATEGORY_LABEL,
  getRelatedTools,
  getToolBySlug,
  toolGuideHref,
  toolWorkspaceHref,
} from "@/lib/tools-registry-pure";
import {
  buildBreadcrumb,
  buildFaqPage,
  type JsonLd,
} from "@/lib/structured-data-pure";

/** Semua panduan dibangun statis; slug tak dikenal langsung 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return toolGuideSlugs().map((slug) => ({ slug }));
}

function shortDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 158 ? `${clean.slice(0, 155).trimEnd()}…` : clean;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getToolGuide(slug);
  const tool = getToolBySlug(slug);

  if (!guide || !tool || tool.status !== "tersedia") {
    return {
      title: "Panduan tidak ditemukan",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${guide.title} — LKTech Tools`,
    description: shortDescription(guide.intro),
    alternates: { canonical: toolGuideHref(slug) },
    openGraph: {
      title: guide.title,
      description: shortDescription(guide.intro),
      url: toolGuideHref(slug),
      type: "article",
    },
    twitter: {
      card: "summary",
      title: guide.title,
      description: shortDescription(guide.intro),
    },
  };
}

export default async function ToolGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getToolGuide(slug);
  const tool = getToolBySlug(slug);

  if (!guide || !tool || tool.status !== "tersedia") notFound();

  const related = getRelatedTools(tool);
  const breadcrumbLd = buildBreadcrumb(
    [
      { label: "Beranda", href: "/" },
      { label: "Tools", href: "/tools" },
      { label: "Panduan", href: "/tools/panduan" },
      { label: tool.name },
    ],
    SITE.url,
  );
  const faqLd = buildFaqPage([...guide.faq]);

  return (
    <>
      <JsonLdScript
        node={[breadcrumbLd, faqLd].filter(
          (node): node is JsonLd => node !== null,
        )}
      />

      <Navbar />
      <main id="konten">
        <section className="relative overflow-hidden bg-white pt-32 pb-20 sm:pt-36">
          <div className="grid-lines absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute -top-24 -left-24 h-[24rem] w-[24rem] animate-aurora rounded-full bg-primary/10 blur-[120px]" />

          <div className="relative mx-auto max-w-5xl px-6">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted"
            >
              <Link href="/" className="transition-colors hover:text-primary">
                Beranda
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/tools" className="transition-colors hover:text-primary">
                Tools
              </Link>
              <span className="text-slate-300">/</span>
              <Link
                href="/tools/panduan"
                className="transition-colors hover:text-primary"
              >
                Panduan
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-secondary">{tool.name}</span>
            </nav>

            <div className="mt-6 flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
                <ToolIcon name={tool.icon} className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Panduan · {TOOL_CATEGORY_LABEL[tool.category]}
                </p>
                <h1 className="mt-1 text-3xl font-bold text-secondary sm:text-4xl">
                  {guide.title}
                </h1>
              </div>
            </div>

            <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
              {guide.intro}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[11px]">
              {tool.local && <ToolLocalBadge />}
              <span className="rounded-full bg-surface px-2.5 py-1 font-semibold text-secondary">
                {tool.format.from} → {tool.format.to}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-muted">
                {tool.limitLabel}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-muted">
                Diperbarui {TOOL_GUIDES_UPDATED}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ToolsCta
                location="guide"
                target={toolWorkspaceHref(tool.slug)}
                size="md"
              >
                Buka {tool.name}
              </ToolsCta>
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Kembali ke LKTech Tools
              </Link>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
              <div>
                <section aria-labelledby="cara-pakai">
                  <h2
                    id="cara-pakai"
                    className="text-xl font-bold text-secondary"
                  >
                    Cara pakai {tool.name}
                  </h2>
                  <ol className="mt-4 flex flex-col gap-3">
                    {guide.steps.map((step, index) => (
                      <li
                        key={step}
                        className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-secondary">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>

                <section aria-labelledby="cocok-untuk" className="mt-10">
                  <h2
                    id="cocok-untuk"
                    className="text-xl font-bold text-secondary"
                  >
                    Cocok untuk
                  </h2>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {guide.useCases.map((useCase) => (
                      <li
                        key={useCase}
                        className="flex items-start gap-2 rounded-xl bg-surface p-3 text-sm leading-relaxed text-secondary"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="privasi" className="mt-10">
                  <h2 id="privasi" className="text-xl font-bold text-secondary">
                    Privasi & batas
                  </h2>
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="flex items-start gap-2 text-sm leading-relaxed text-secondary">
                      <ShieldCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      {tool.privacyNote}
                    </p>
                    <p className="mt-2 pl-6 text-xs leading-relaxed text-muted">
                      Batas operasional yang ditampilkan di panduan ini sama
                      dengan yang ditegakkan tool: {tool.limitLabel}. Untuk
                      memverifikasi tidak ada unggahan, buka DevTools → Network
                      saat memproses berkas.
                    </p>
                  </div>
                </section>

                <section aria-labelledby="faq-panduan" className="mt-10">
                  <h2
                    id="faq-panduan"
                    className="text-xl font-bold text-secondary"
                  >
                    Pertanyaan umum
                  </h2>
                  <div className="mt-4">
                    <FaqAccordion items={[...guide.faq]} />
                  </div>
                </section>
              </div>

              <aside className="lg:sticky lg:top-28">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    Ringkasan tool
                  </div>
                  <dl className="mt-4 flex flex-col gap-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted">Kategori</dt>
                      <dd className="text-right font-semibold text-secondary">
                        {TOOL_CATEGORY_LABEL[tool.category]}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted">Format</dt>
                      <dd className="text-right font-semibold text-secondary">
                        {tool.format.from} → {tool.format.to}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted">Batas</dt>
                      <dd className="text-right font-semibold text-secondary">
                        {tool.limitLabel}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted">Proses</dt>
                      <dd className="text-right font-semibold text-emerald-700">
                        Lokal di browser
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted">Akses</dt>
                      <dd className="text-right font-semibold text-secondary">
                        Akun LKTech
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <ToolsCta
                      location="guide-aside"
                      target={toolWorkspaceHref(tool.slug)}
                      size="md"
                      className="w-full"
                    >
                      Buka tool
                    </ToolsCta>
                  </div>
                </div>

                {related.length > 0 && (
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-surface p-5">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                      Panduan lain
                    </p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {related.map((item) => (
                        <li key={item.slug}>
                          <Link
                            href={toolGuideHref(item.slug)}
                            className="group flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                          >
                            <ToolIcon
                              name={item.icon}
                              className="h-3.5 w-3.5 text-primary"
                            />
                            <span className="flex-1">{item.name}</span>
                            <ArrowRight
                              className="h-3 w-3 text-slate-300 transition-transform group-hover:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
