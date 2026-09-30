import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getSiteContent } from "@/lib/site-content";
import { getProjectSlugs } from "@/lib/projects";
import { getArticleSlugs } from "@/lib/articles";
import { getProductSlugs } from "@/lib/products";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/layanan`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/produk`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/portofolio`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/kontak`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
  ];

  const [content, projectSlugs, articleSlugs, productSlugs] = await Promise.all([
    getSiteContent(),
    getProjectSlugs(),
    getArticleSlugs(),
    getProductSlugs(),
  ]);

  // Slug layanan dibaca dari konten dinamis agar layanan yang ditambah dari
  // dashboard ikut masuk sitemap.
  const serviceRoutes: MetadataRoute.Sitemap = content.services.map((s) => ({
    url: `${SITE.url}/layanan/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projectSlugs.map((slug) => ({
    url: `${SITE.url}/portofolio/${slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articleSlugs.map((slug) => ({
    url: `${SITE.url}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${SITE.url}/produk/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...projectRoutes,
    ...articleRoutes,
    ...productRoutes,
  ];
}
