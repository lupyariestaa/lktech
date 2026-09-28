import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { BlogGrid } from "@/components/blog-grid";
import { getArticleCategories, getArticles } from "@/lib/articles";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — LKTech",
  description:
    "Artikel & tips seputar website, aplikasi, bisnis digital, dan teknologi untuk membantu bisnis Anda tumbuh.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — LKTech",
    description:
      "Artikel & tips seputar website, aplikasi, bisnis digital, dan teknologi.",
    url: "/blog",
    type: "website",
  },
};

export default async function BlogPage() {
  const [articles, categories] = await Promise.all([
    getArticles(),
    getArticleCategories(),
  ]);

  return (
    <>
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
          <BlogGrid articles={articles} categories={categories} />
        </div>
      </section>
    </>
  );
}
