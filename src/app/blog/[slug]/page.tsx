import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Markdown } from "@/lib/markdown";
import { parseMarkdown } from "@/lib/markdown-parse";
import type { Inline } from "@/lib/markdown-parse";
import { buildToc } from "@/lib/article-ui";
import { ArticleCard, ArticleTags } from "@/components/article-card";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { CtaContact } from "@/components/sections/cta-contact";
import { ArticleToc } from "@/components/blog/article-toc";
import { ArticleShare } from "@/components/blog/article-share";
import { ArticleViewTracker } from "@/components/blog/article-view-tracker";
import { ArticleSidebar } from "@/components/blog/article-sidebar";
import { NewsletterForm } from "@/components/newsletter-form";
import {
  getArticleSlugs,
  getArticles,
  pickRelatedArticles,
  resolveArticleSlug,
} from "@/lib/articles";
import { getProducts } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
import { readingLabel } from "@/lib/article-ui";
import { seoDescription, seoTitle, ogImageFor } from "@/lib/article-logic";
import { wordCountFromMarkdown } from "@/lib/markdown-html";
import { taxonomySlug } from "@/lib/article-types";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

type Params = { slug: string };

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveArticleSlug(slug);
  if (!resolved) return { title: "Artikel tidak ditemukan" };
  const article = resolved.article;
  const title = seoTitle(article);
  const description = seoDescription(article);
  const image = ogImageFor(article, "/opengraph-image");

  return {
    title,
    description,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${article.slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      images: [image],
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const resolved = await resolveArticleSlug(slug);
  if (!resolved) notFound();
  // B5.7: slug lama → redirect permanen ke slug baru.
  if (resolved.redirectTo) permanentRedirect(`/blog/${resolved.redirectTo}`);
  const article = resolved.article;

  const [all, settings, products] = await Promise.all([
    getArticles(),
    getSiteSettings(),
    getProducts(),
  ]);

  const related = pickRelatedArticles(article, all, 3);
  const url = `${SITE.url}/blog/${article.slug}`;
  // Produk digital unggulan (maks 2). Tersembunyi bila tidak ada produk aktif.
  const relatedProducts = products.slice(0, 2);
  const toc = buildToc(
    parseMarkdown(article.body).flatMap((b) =>
      b.t === "h" ? [{ level: b.level, id: b.id, text: plainText(b.inline) }] : [],
    ),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: { "@type": "Organization", name: article.author },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: url,
    image: [ogImageFor(article, `${SITE.url}/opengraph-image`)],
    articleSection: article.category,
    keywords: article.tags.join(", "),
    wordCount: wordCountFromMarkdown(article.body),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE.url}/blog` },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  };

  const formatted = (() => {
    try {
      return new Date(article.publishedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return article.publishedAt;
    }
  })();

  const updated =
    article.updatedAt && article.updatedAt.slice(0, 10) !== article.publishedAt.slice(0, 10)
      ? new Date(article.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <PageHero
        align="left"
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: article.title },
        ]}
        eyebrow="Blog"
        title={article.title}
        description={article.excerpt}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <Link
            href={`/blog/kategori/${taxonomySlug(article.category)}`}
            className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            {article.category}
          </Link>
          <span>{formatted}</span>
          <span className="text-slate-300" aria-hidden="true">•</span>
          <span>{readingLabel(article.readingTime)}</span>
          {updated && (
            <>
              <span className="text-slate-300" aria-hidden="true">•</span>
              <span>diperbarui {updated}</span>
            </>
          )}
          <span className="text-slate-300" aria-hidden="true">•</span>
          <span>oleh {article.author}</span>
        </div>
      </PageHero>

      <ArticleViewTracker slug={article.slug} category={article.category} readingTime={article.readingTime} />

      <article className="relative bg-white pb-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[200px_minmax(0,1fr)_280px]">
          {/* Kiri: daftar isi (sticky di desktop, accordion di mobile). */}
          <div className="lg:pt-10">
            <ArticleToc headings={toc} />
          </div>

          {/* Tengah: isi artikel. */}
          <div className="min-w-0 max-w-3xl">
            {article.coverImage && (
              <Image
                src={article.coverImage}
                alt={article.coverAlt || article.title}
                width={1200}
                height={630}
                priority
                className="mb-8 w-full rounded-3xl border border-slate-100 object-cover"
              />
            )}

            <Markdown content={article.body} />

            <div className="mt-10 flex flex-col gap-5 border-t border-slate-100 pt-6">
              <ArticleTags tags={article.tags} />
              <ArticleShare slug={article.slug} title={article.title} url={url} />
            </div>

            <div className="mt-10 flex flex-col items-start gap-5 rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-7 text-left sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Butuh bantuan mewujudkannya?
                </h2>
                <p className="mt-1 text-sm text-white/85">
                  Konsultasi gratis bersama tim LKTech.
                </p>
              </div>
              <TrackedWaButton
                location="blog-detail"
                label={article.title}
                href={waLink(WA_MESSAGES.general, settings.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                variant="white"
                size="lg"
                className="group shrink-0"
              >
                <MessageCircle className="h-5 w-5" />
                Mulai Konsultasi
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </TrackedWaButton>
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-surface p-6">
              <h2 className="text-base font-bold text-secondary">Dapatkan artikel terbaru</h2>
              <p className="mt-1 text-sm text-muted">Tips digital dikirim langsung ke email Anda.</p>
              <div className="mt-4">
                <NewsletterForm source={`blog-${article.slug}`} compact />
              </div>
            </div>

            <Link
              href="/blog"
              className="group mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Semua artikel
            </Link>
          </div>

          {/* Kanan: sidebar sticky (desktop) / di bawah (mobile). */}
          <div className="min-w-0 lg:pt-10">
            <ArticleSidebar
              article={article}
              related={related}
              products={relatedProducts}
              whatsappNumber={settings.whatsapp}
            />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="relative bg-surface py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-bold text-secondary">
              Artikel <span className="text-gradient">lainnya</span>
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaContact />
    </>
  );
}

/** Teks polos dari node inline (untuk label TOC). */
function plainText(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      if (n.t === "a") return n.text;
      if (n.t === "img") return "";
      return n.v;
    })
    .join("")
    .trim();
}
