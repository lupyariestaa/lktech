import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getSiteContent } from "@/lib/site-content";
import { getProjects } from "@/lib/projects";
import { getArticles } from "@/lib/articles";
import { getProducts } from "@/lib/products";

export const revalidate = 3600;

/** Ubah tanggal (string) jadi Date; fallback ke `now` bila tidak valid. */
function toDate(value: string | undefined, now: Date): Date {
  if (!value) return now;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? now : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [content, projects, articles, products] = await Promise.all([
    getSiteContent(),
    getProjects(),
    getArticles(),
    getProducts(),
  ]);

  // Tanggal "konten terakhir diubah" — dipakai untuk rute statis.
  const latestContentDate = articles.reduce<Date>((acc, a) => {
    const d = toDate(a.updatedAt ?? a.publishedAt, now);
    return d > acc ? d : acc;
  }, now);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: latestContentDate, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/layanan`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/produk`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/portofolio`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/blog`, lastModified: latestContentDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/kontak`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
  ];

  // Slug layanan dibaca dari konten dinamis agar layanan yang ditambah dari
  // dashboard ikut masuk sitemap.
  const serviceRoutes: MetadataRoute.Sitemap = content.services.map((s) => ({
    url: `${SITE.url}/layanan/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${SITE.url}/portofolio/${p.slug}`,
    // Tanggal update nyata bila ada; fallback ke waktu build.
    lastModified: toDate(p.updatedAt, now),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE.url}/blog/${a.slug}`,
    // Tanggal asli artikel (bukan waktu build).
    lastModified: toDate(a.updatedAt ?? a.publishedAt, now),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE.url}/produk/${p.slug}`,
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
