import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderTree } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { getArticleCategoryList, getArticles } from "@/lib/articles";
import { taxonomySlug } from "@/lib/article-types";
import { SITE } from "@/lib/site";
import { buildBreadcrumb, buildItemList } from "@/lib/structured-data-pure";
import { JsonLdScript } from "@/components/json-ld-script";

export const revalidate = 60;

/**
 * Hub indeks KATEGORI blog (fase S4) — daftar semua kategori + jumlah artikel.
 *
 * Tujuan SEO: memberikan hub internal-linking (crawl depth dangkal) & halaman
 * yang mengumpulkan tautan ke setiap kategori. `CollectionPage` + `ItemList`.
 */
export const metadata: Metadata = {
  title: "Kategori Blog",
  description:
    "Jelajahi artikel blog LKTech berdasarkan kategori: Tips & Trik, Bisnis Digital, Teknologi, dan Panduan.",
  alternates: {
    canonical: "/blog/kategori",
    types: { "application/rss+xml": `${SITE.url}/blog/rss.xml` },
  },
  openGraph: {
    title: "Kategori Blog LKTech",
    description:
      "Jelajahi artikel blog LKTech berdasarkan kategori.",
    url: "/blog/kategori",
    type: "website",
    images: ["/opengraph-image"],
  },
};

export default async function BlogCategoryIndexPage() {
  const [categories, articles] = await Promise.all([
    getArticleCategoryList(),
    getArticles(),
  ]);

  // Jumlah artikel per kategori.
  const countByCategory = new Map<string, number>();
  for (const a of articles) {
    countByCategory.set(a.category, (countByCategory.get(a.category) ?? 0) + 1);
  }

  const url = `${SITE.url}/blog/kategori`;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Kategori Blog LKTech",
    url,
    isPartOf: { "@type": "Blog", name: `${SITE.name} Blog`, url: `${SITE.url}/blog` },
  };

  const itemListLd = buildItemList(
    categories.map((label) => ({
      name: label,
      url: `${SITE.url}/blog/kategori/${taxonomySlug(label)}`,
    })),
    "Kategori Blog LKTech",
  );

  const breadcrumbLd = buildBreadcrumb(
    [
      { label: "Beranda", href: "/" },
      { label: "Blog", href: "/blog" },
      { label: "Kategori" },
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
          { label: "Kategori" },
        ]}
        eyebrow="Kategori"
        title={
          <>
            Jelajahi blog menurut{" "}
            <span className="text-gradient">kategori</span>
          </>
        }
        description={`${categories.length} kategori artikel untuk membantu Anda menemukan bacaan yang relevan.`}
      />

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          {categories.length === 0 ? (
            <p className="text-sm text-muted">Belum ada kategori.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((label) => (
                <Link
                  key={label}
                  href={`/blog/kategori/${taxonomySlug(label)}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary">
                      <FolderTree className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-secondary">
                        {label}
                      </span>
                      <span className="block text-xs text-muted">
                        {countByCategory.get(label) ?? 0} artikel
                      </span>
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
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
