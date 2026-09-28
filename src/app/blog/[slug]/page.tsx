import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Markdown } from "@/lib/markdown";
import { ArticleCard, ArticleTags } from "@/components/article-card";
import { ButtonAnchor } from "@/components/ui/button";
import { CtaContact } from "@/components/sections/cta-contact";
import {
  getArticleBySlug,
  getArticleSlugs,
  getArticles,
} from "@/lib/articles";
import { getSiteSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
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
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Artikel tidak ditemukan — LKTech" };

  return {
    title: `${article.title} — Blog LKTech`,
    description: article.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: `${article.title} — Blog LKTech`,
      description: article.excerpt,
      type: "article",
      url: `/blog/${slug}`,
      publishedTime: article.publishedAt,
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const [all, settings] = await Promise.all([
    getArticles(),
    getSiteSettings(),
  ]);

  const related = all.filter((a) => a.slug !== slug).slice(0, 3);
  const url = `${SITE.url}/blog/${slug}`;

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
    image: article.coverImage ? [article.coverImage] : undefined,
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        align="left"
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: article.title },
        ]}
        eyebrow={article.category}
        title={article.title}
        description={article.excerpt}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <span>{formatted}</span>
          <span className="text-slate-300">•</span>
          <span>oleh {article.author}</span>
        </div>
      </PageHero>

      <article className="relative bg-white pb-16">
        <div className="mx-auto max-w-3xl px-6">
          {article.coverImage && (
            <Image
              src={article.coverImage}
              alt={article.title}
              width={1200}
              height={630}
              priority
              className="mb-8 w-full rounded-3xl border border-slate-100 object-cover"
            />
          )}

          <Markdown content={article.body} />

          <div className="mt-10 border-t border-slate-100 pt-6">
            <ArticleTags tags={article.tags} />
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
            <ButtonAnchor
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
            </ButtonAnchor>
          </div>

          <Link
            href="/blog"
            className="group mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Semua artikel
          </Link>
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
