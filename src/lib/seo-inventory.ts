import { getProjects } from "@/lib/projects";
import { getArticleCategoryList, getArticleTags, getArticles } from "@/lib/articles";
import { taxonomySlug } from "@/lib/article-types";
import { getProducts } from "@/lib/products";
import { SERVICES } from "@/lib/services";
import { getLocationSlugs } from "@/lib/locations";
import {
  AUDIT_INVENTORY_GROUPS,
  normalizeAuditPath,
  type AuditInventoryGroup,
} from "@/lib/seo-audit-pure";

export { AUDIT_INVENTORY_GROUPS };
export type { AuditInventoryGroup };

/**
 * INVENTARIS URL PUBLIK (fase D4) — dibangun dari sumber yang SUDAH ADA
 * (inventaris sitemap, artikel, produk, layanan, kota terkurasi, portofolio,
 * kategori/tag). Tidak menambah sumber data baru.
 *
 * Hanya menghimpun PATH internal; validasi origin dilakukan crawler sebelum
 * permintaan apa pun (SSRF-safe). Modul ini server-only (memakai loader Firestore).
 */

export type AuditInventoryItem = {
  /** Path internal, mis. "/produk/template". */
  path: string;
  /** Grup sumber untuk tampilan & pemilihan subset audit. */
  group: AuditInventoryGroup;
};

const STATIC_PATHS: Array<{ path: string; group: AuditInventoryGroup }> = [
  { path: "/", group: "Halaman statis" },
  { path: "/layanan", group: "Halaman statis" },
  { path: "/produk", group: "Halaman statis" },
  { path: "/harga", group: "Halaman statis" },
  { path: "/promo", group: "Halaman statis" },
  { path: "/portofolio", group: "Halaman statis" },
  { path: "/blog", group: "Halaman statis" },
  { path: "/tentang", group: "Halaman statis" },
  { path: "/kontak", group: "Halaman statis" },
];

/**
 * Bangun inventaris URL publik. Setiap kegagalan sumber data diabaikan
 * (best-effort) agar satu sumber bermasalah tidak menggagalkan seluruh audit.
 */
export async function buildAuditInventory(): Promise<AuditInventoryItem[]> {
  const [projects, articles, products, categories, tags] = await Promise.all([
    safe(() => getProjects(), []),
    safe(() => getArticles(), []),
    safe(() => getProducts(), []),
    safe(() => getArticleCategoryList(), []),
    safe(() => getArticleTags(), []),
  ]);

  const items: AuditInventoryItem[] = [...STATIC_PATHS];

  for (const s of SERVICES) {
    items.push({ path: `/layanan/${s.slug}`, group: "Layanan" });
  }

  const locationSlugs = getLocationSlugs();
  for (const s of SERVICES) {
    for (const kota of locationSlugs) {
      items.push({ path: `/layanan/${s.slug}/${kota}`, group: "Layanan × Kota" });
    }
  }

  for (const p of projects) {
    items.push({ path: `/portofolio/${p.slug}`, group: "Portofolio" });
  }

  for (const a of articles) {
    items.push({ path: `/blog/${a.slug}`, group: "Artikel" });
  }

  for (const p of products) {
    items.push({ path: `/produk/${p.slug}`, group: "Produk" });
  }

  for (const label of categories) {
    items.push({ path: `/blog/kategori/${taxonomySlug(label)}`, group: "Kategori blog" });
  }

  for (const { tag } of tags) {
    items.push({ path: `/blog/tag/${taxonomySlug(tag)}`, group: "Tag blog" });
  }

  return dedupeInventory(items);
}

/** Buang path tidak valid & duplikat (path pertama yang menang). */
export function dedupeInventory(
  items: readonly AuditInventoryItem[],
): AuditInventoryItem[] {
  const seen = new Set<string>();
  const out: AuditInventoryItem[] = [];
  for (const item of items) {
    const path = normalizeAuditPath(item.path);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push({ path, group: item.group });
  }
  return out;
}

/**
 * Pilih subset inventaris: filter per grup (bila diberikan) lalu batasi jumlah.
 * `truncated` menandai bahwa masih ada URL lain di luar batas.
 */
export function selectInventory(
  inventory: readonly AuditInventoryItem[],
  options: { groups?: readonly AuditInventoryGroup[]; maxUrls: number },
): { items: AuditInventoryItem[]; truncated: boolean } {
  const allowed = options.groups && options.groups.length > 0
    ? new Set(options.groups)
    : null;
  const filtered = allowed
    ? inventory.filter((i) => allowed.has(i.group))
    : inventory;
  const max = Math.max(1, Math.floor(options.maxUrls));
  return {
    items: filtered.slice(0, max),
    truncated: filtered.length > max,
  };
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
