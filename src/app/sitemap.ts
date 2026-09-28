import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getServiceSlugs } from "@/lib/content";
import { getProjectSlugs } from "@/lib/projects";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/layanan`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE.url}/portofolio`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/kontak`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = getServiceSlugs().map((slug) => ({
    url: `${SITE.url}/layanan/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projectSlugs = await getProjectSlugs();
  const projectRoutes: MetadataRoute.Sitemap = projectSlugs.map((slug) => ({
    url: `${SITE.url}/portofolio/${slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...serviceRoutes, ...projectRoutes];
}
