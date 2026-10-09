import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { BlogIndex } from "@/components/blog/blog-index";
import { getArticleCategoryList, getArticlesByCategory } from "@/lib/articles";
import { parseListQuery } from "@/lib/article-ui";
import { resolveLabelFromSlug, taxonomySlug } from "@/lib/article-types";
import { SITE } from "@/lib/site";

type Params = { category: string };

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const categories = await getArticleCategoryList();
  return categories.map((label) => ({ category: taxonomySlug(label) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category } = await params;
  const categories = await getArticleCategoryList();
  const label = resolveLabelFromSlug(category, categories);
  if (!label) return { title: "Kategori tidak ditemukan" };

  return {
    title: `Kategori: ${label}`,
    description: `Kumpulan artikel blog LKTech dalam kategori ${label}.`,
    alternates: { canonical: `/blog/kategori/${category}` },
    openGraph: {
      title: `Kategori: ${label}`,
      description: `Kumpulan artikel blog LKTech dalam kategori ${label}.`,
      url: `/blog/kategori/${category}`,
      type: "website",
      images: ["/opengraph-image"],
    },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { category } = await params;
  const sp = await searchParams;
  const categories = await getArticleCategoryList();
  const label = resolveLabelFromSlug(category, categories);
  if (!label) notFound();

  const articles = await getArticlesByCategory(label);
  const query = parseListQuery(sp, []);
  const url = `${SITE.url}/blog/kategori/${category}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Kategori: ${label}`,
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
          { label: label },
        ]}
        eyebrow="Kategori"
        title={
          <>
            Kategori <span className="text-gradient">{label}</span>
          </>
        }
        description={`${articles.length} artikel dalam kategori ${label}.`}
      />

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <BlogIndex
            articles={articles}
            categories={[]}
            tags={[]}
            query={{ ...query, category: "" }}
            basePath={`/blog/kategori/${category}`}
            lockedBy="category"
          />

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
