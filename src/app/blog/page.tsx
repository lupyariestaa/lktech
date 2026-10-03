import type { Metadata } from "next";
import Link from "next/link";
import { Rss } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { BlogGrid } from "@/components/blog-grid";
import {
  getArticleCategories,
  getArticleTags,
  getArticles,
} from "@/lib/articles";
import { SITE } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
    title: "Blog",
  description:
    "Artikel & tips seputar website, aplikasi, bisnis digital, dan teknologi untuk membantu bisnis Anda tumbuh.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": `${SITE.url}/blog/rss.xml` },
  },
  openGraph: {
  title: "Blog",
    description:
      "Artikel & tips seputar website, aplikasi, bisnis digital, dan teknologi.",
    url: "/blog",
    type: "website",
  },
};

export default async function BlogPage() {
  const [articles, categories, tags] = await Promise.all([
    getArticles(),
    getArticleCategories(),
    getArticleTags(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE.name} Blog`,
    url: `${SITE.url}/blog`,
    description:
      "Artikel & tips seputar website, aplikasi, bisnis digital, dan teknologi.",
    blogPost: articles.slice(0, 10).map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: `${SITE.url}/blog/${a.slug}`,
      datePublished: a.publishedAt,
      author: { "@type": "Organization", name: a.author },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Blog" }]}
        eyebrow="Blog"
        title={
          <>
            Wawasan untuk{" "}
            <span className="text-gradient">tumbuh digital</span>
          </>
        }
        description="Tips, panduan, dan pemikiran seputar teknologi & bisnis digital — dibagikan gratis untuk Anda."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/blog/rss.xml"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-secondary backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Rss className="h-4 w-4" />
            Berlangganan RSS
          </Link>
        </div>
      </PageHero>

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <BlogGrid articles={articles} categories={categories} tags={tags} />
        </div>
      </section>
    </>
  );
}
