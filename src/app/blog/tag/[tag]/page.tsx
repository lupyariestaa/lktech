import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ArticleGrid } from "@/components/article-grid";
import { getArticleTags, getArticlesByTag } from "@/lib/articles";
import { resolveLabelFromSlug, taxonomySlug } from "@/lib/article-types";
import { SITE } from "@/lib/site";

type Params = { tag: string };

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const tags = await getArticleTags();
  return tags.map((t) => ({ tag: taxonomySlug(t.tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tag } = await params;
  const tags = await getArticleTags();
  const label = resolveLabelFromSlug(
    tag,
    tags.map((t) => t.tag),
  );
  if (!label) return { title: "Tag tidak ditemukan" };

  return {
    title: `Tag: ${label}`,
    description: `Artikel blog LKTech dengan tag ${label}.`,
    alternates: { canonical: `/blog/tag/${tag}` },
    openGraph: {
      title: `Tag: ${label}`,
      description: `Artikel blog LKTech dengan tag ${label}.`,
      url: `/blog/tag/${tag}`,
      type: "website",
    },
  };
}

export default async function BlogTagPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { tag } = await params;
  const tags = await getArticleTags();
  const label = resolveLabelFromSlug(
    tag,
    tags.map((t) => t.tag),
  );
  if (!label) notFound();

  const articles = await getArticlesByTag(label);
  const url = `${SITE.url}/blog/tag/${tag}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Tag: ${label}`,
    url,
    isPartOf: { "@type": "Blog", name: `${SITE.name} Blog`, url: `${SITE.url}/blog` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE.url}/blog/${a.slug}`,
        name: a.title,
      })),
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE.url}/blog` },
      { "@type": "ListItem", position: 3, name: label, item: url },
    ],
  };

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
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: `#${label}` },
        ]}
        eyebrow="Tag"
        title={
          <>
            Tag <span className="text-gradient">{label}</span>
          </>
        }
        description={`${articles.length} artikel dengan tag ${label}.`}
      />

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <ArticleGrid articles={articles} />

          <Link
            href="/blog"
            className="group mt-12 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Semua artikel
          </Link>
        </div>
      </section>
    </>
  );
}
