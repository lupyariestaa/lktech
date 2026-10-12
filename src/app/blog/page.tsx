import type { Metadata } from "next";
import Link from "next/link";
import { FolderTree, Tag as TagIcon } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { BlogIndex } from "@/components/blog/blog-index";
import {
  getArticleCategoryList,
  getArticleTags,
  getArticles,
} from "@/lib/articles";
import { parseListQuery } from "@/lib/article-ui";
import { SITE } from "@/lib/site";
import { buildBreadcrumb } from "@/lib/structured-data-pure";
import { JsonLdScript } from "@/components/json-ld-script";

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
    images: ["/opengraph-image"],
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [articles, categories, tags] = await Promise.all([
    getArticles(),
    getArticleCategoryList(),
    getArticleTags(),
  ]);
  const query = parseListQuery(sp, categories);

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
      <JsonLdScript node={jsonLd} />
      <JsonLdScript
        node={buildBreadcrumb(
          [{ label: "Beranda", href: "/" }, { label: "Blog" }],
          SITE.url,
        )}
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
      />

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <BlogIndex
            articles={articles}
            categories={categories}
            tags={tags}
            query={query}
          />

          {/* Hub kategori & tag (fase S4) — internal linking ke indeks. */}
          {(categories.length > 0 || tags.length > 0) && (
            <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-8 text-sm">
              <span className="font-semibold text-secondary">Jelajahi:</span>
              {categories.length > 0 && (
                <Link
                  href="/blog/kategori"
                  className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                  <FolderTree className="h-4 w-4" aria-hidden="true" />
                  Semua kategori
                </Link>
              )}
              {tags.length > 0 && (
                <Link
                  href="/blog/tag"
                  className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                  <TagIcon className="h-4 w-4" aria-hidden="true" />
                  Semua tag
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
