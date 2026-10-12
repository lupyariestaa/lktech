import type { MetadataRoute } from "next";
import { SITE, SEO_CONTENT_UPDATED } from "@/lib/site";
import { getProjects } from "@/lib/projects";
import { getArticleCategoryList, getArticleTags, getArticles } from "@/lib/articles";
import { taxonomySlug } from "@/lib/article-types";
import { getProducts } from "@/lib/products";
import { SERVICES } from "@/lib/services";
import { getLocationSlugs } from "@/lib/locations";

export const revalidate = 3600;

/** Ubah tanggal (string) jadi Date; fallback ke `fallback` bila tidak valid. */
function toDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // S1/R10: rute tanpa tanggal konten asli memakai tanggal STABIL
  // (`SEO_CONTENT_UPDATED`) — bukan `now` yang berubah tiap build (sinyal
  // freshness palsu yang memicu crawl berulang tanpa perubahan).
  const stable = SEO_CONTENT_UPDATED;

  const [projects, articles, products, categories, tags] = await Promise.all([
    getProjects(),
    getArticles(),
    getProducts(),
    getArticleCategoryList(),
    getArticleTags(),
  ]);

  // Tanggal "konten terakhir diubah" — dipakai untuk rute statis.
  const latestContentDate = articles.reduce<Date>((acc, a) => {
    const d = toDate(a.updatedAt ?? a.publishedAt, stable);
    return d > acc ? d : acc;
  }, stable);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: latestContentDate, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/layanan`, lastModified: stable, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/produk`, lastModified: stable, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE.url}/harga`, lastModified: stable, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/promo`, lastModified: stable, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE.url}/portofolio`, lastModified: stable, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/blog`, lastModified: latestContentDate, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/kontak`, lastModified: stable, changeFrequency: "yearly", priority: 0.7 },
  ];

  // Slug layanan dibaca dari modul layanan (hardcoded).
  const serviceRoutes: MetadataRoute.Sitemap = SERVICES.map((s) => ({
    url: `${SITE.url}/layanan/${s.slug}`,
    lastModified: stable,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${SITE.url}/portofolio/${p.slug}`,
    // Tanggal update nyata bila ada; fallback ke tanggal stabil.
    lastModified: toDate(p.updatedAt, stable),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE.url}/blog/${a.slug}`,
    // Tanggal asli artikel (bukan waktu build).
    lastModified: toDate(a.updatedAt ?? a.publishedAt, stable),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE.url}/produk/${p.slug}`,
    lastModified: stable,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Halaman kategori & tag blog (SEO + navigasi).
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((label) => ({
    url: `${SITE.url}/blog/kategori/${taxonomySlug(label)}`,
    lastModified: latestContentDate,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const tagRoutes: MetadataRoute.Sitemap = tags.map(({ tag }) => ({
    url: `${SITE.url}/blog/tag/${taxonomySlug(tag)}`,
    lastModified: latestContentDate,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  // Programmatic SEO (fase S5): layanan × kota terkurasi. Prioritas lebih rendah
  // dari halaman layanan utama; hanya kombinasi terkurasi (konten unik).
  const locationSlugs = getLocationSlugs();
  const serviceCityRoutes: MetadataRoute.Sitemap = SERVICES.flatMap((s) =>
    locationSlugs.map((kota) => ({
      url: `${SITE.url}/layanan/${s.slug}/${kota}`,
      lastModified: stable,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );

  // Hub indeks kategori & tag (fase S4) — hanya bila ada isinya.
  const hubRoutes: MetadataRoute.Sitemap = [];
  if (categories.length > 0) {
    hubRoutes.push({
      url: `${SITE.url}/blog/kategori`,
      lastModified: latestContentDate,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }
  if (tags.length > 0) {
    hubRoutes.push({
      url: `${SITE.url}/blog/tag`,
      lastModified: latestContentDate,
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...serviceCityRoutes,
    ...projectRoutes,
    ...articleRoutes,
    ...productRoutes,
    ...categoryRoutes,
    ...tagRoutes,
    ...hubRoutes,
  ];
}
