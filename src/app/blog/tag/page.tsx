import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag as TagIcon } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { getArticleTags } from "@/lib/articles";
import { taxonomySlug } from "@/lib/article-types";
import { SITE } from "@/lib/site";
import { buildBreadcrumb, buildItemList } from "@/lib/structured-data-pure";
import { JsonLdScript } from "@/components/json-ld-script";

export const revalidate = 60;

/**
 * Hub indeks TAG blog (fase S4) — daftar semua tag + jumlah artikel.
 * Memberi hub internal-linking & `CollectionPage`/`ItemList`.
 */
export const metadata: Metadata = {
  title: "Tag Blog",
  description:
    "Telusuri artikel blog LKTech berdasarkan topik/tag — dari website, SEO, bisnis digital, hingga teknologi.",
  alternates: {
    canonical: "/blog/tag",
    types: { "application/rss+xml": `${SITE.url}/blog/rss.xml` },
  },
  openGraph: {
    title: "Tag Blog LKTech",
    description: "Telusuri artikel blog LKTech berdasarkan topik/tag.",
    url: "/blog/tag",
    type: "website",
    images: ["/opengraph-image"],
  },
};

export default async function BlogTagIndexPage() {
  const tags = await getArticleTags();

  const url = `${SITE.url}/blog/tag`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tag Blog LKTech",
    url,
    isPartOf: { "@type": "Blog", name: `${SITE.name} Blog`, url: `${SITE.url}/blog` },
  };

  const itemListLd = buildItemList(
    tags.map(({ tag }) => ({
      name: tag,
      url: `${SITE.url}/blog/tag/${taxonomySlug(tag)}`,
    })),
    "Tag Blog LKTech",
  );

  const breadcrumbLd = buildBreadcrumb(
    [
      { label: "Beranda", href: "/" },
      { label: "Blog", href: "/blog" },
      { label: "Tag" },
    ],
    SITE.url,
  );

  return (
    <>
      <JsonLdScript node={collectionLd} />
      <JsonLdScript node={itemListLd} />
      <JsonLdScript node={breadcrumbLd} />

      <PageHero
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Tag" },
        ]}
        eyebrow="Tag"
        title={
          <>
            Telusuri blog menurut{" "}
            <span className="text-gradient">topik</span>
          </>
        }
        description={`${tags.length} topik/tag untuk menemukan artikel yang paling relevan dengan kebutuhan Anda.`}
      />

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          {tags.length === 0 ? (
            <p className="text-sm text-muted">Belum ada tag.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${taxonomySlug(tag)}`}
                  className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-secondary transition-all hover:border-primary/30 hover:text-primary"
                >
                  <TagIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary" aria-hidden="true" />
                  {tag}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/blog"
            className="mt-12 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            Semua artikel
          </Link>
        </div>
      </section>
    </>
  );
}
