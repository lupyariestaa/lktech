import { adminFetch } from "@/lib/admin-fetch";
import type { StoredLead, LeadStatus } from "@/lib/lead-types";
import type {
  MediaItem,
  MediaListQuery,
  MediaListResult,
} from "@/lib/media-types";
import type { Project, StoredProject } from "@/lib/project-types";
import type { Product, StoredProduct } from "@/lib/product-types";
import type { Article, StoredArticle } from "@/lib/article-types";
import type { SiteSettings } from "@/lib/settings-types";

export async function fetchLeads(): Promise<StoredLead[]> {
  const data = await adminFetch<{ leads: StoredLead[] }>("/api/admin/leads");
  return data.leads;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  return adminFetch<{ ok: boolean }>("/api/admin/leads", {
    method: "PATCH",
    body: JSON.stringify({ id, status }),
  });
}

/** Ubah tahap pipeline lead (CRM mini, Tema 3.2). */
export async function updateLeadStage(id: string, stage: string) {
  return adminFetch<{ ok: boolean; stage?: string }>("/api/admin/leads", {
    method: "PATCH",
    body: JSON.stringify({ id, stage }),
  });
}

/** Tambah aktivitas timeline lead (catatan/panggilan/email/wa). */
export async function addLeadActivity(
  id: string,
  activity: { type: string; note: string },
) {
  return adminFetch<{ ok: boolean }>("/api/admin/leads", {
    method: "PATCH",
    body: JSON.stringify({ id, activity }),
  });
}

/** Ambil timeline aktivitas lead. */
export async function fetchLeadActivities(
  id: string,
): Promise<import("@/lib/lead-types").LeadActivity[]> {
  const data = await adminFetch<{
    activities: import("@/lib/lead-types").LeadActivity[];
  }>(`/api/admin/leads/${encodeURIComponent(id)}/activities`);
  return data.activities;
}

export async function deleteLead(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/leads?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** Bungkus nilai agar aman sebagai sel CSV (quote + escape). */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Mengubah daftar lead menjadi teks CSV dan mengunduhnya di browser.
 * Kolom mengikuti data yang tampil di dashboard.
 */
export function exportLeadsToCsv(leads: StoredLead[], filename?: string) {
  const headers = [
    "Nama",
    "Email",
    "Telepon",
    "Layanan",
    "Pesan",
    "Status",
    "Tanggal",
    "Sumber",
  ];
  const rows = leads.map((l) =>
    [
      l.name,
      l.email,
      l.phone,
      l.service,
      l.message,
      l.status,
      l.createdAt ?? "",
      l.source ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  // BOM agar Excel membaca UTF-8 dengan benar.
  const csv = "\uFEFF" + [headers.map(csvCell).join(","), ...rows].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename ?? `lead-lktech-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Bangun query string dari `MediaListQuery` (hanya field terisi). */
function buildMediaQuery(query: MediaListQuery = {}): string {
  const params = new URLSearchParams();
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== null && `${v}`.length > 0) {
      params.set(k, String(v));
    }
  };
  set("q", query.q);
  set("category", query.category);
  set("collectionId", query.collectionId);
  set("tag", query.tag);
  if (query.favorite === true) params.set("favorite", "true");
  set("status", query.status);
  set("sort", query.sort);
  set("cursor", query.cursor);
  set("limit", query.limit);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Daftar media terpaginasi dengan pencarian/filter/sortir. */
export async function listMedia(
  query: MediaListQuery = {},
): Promise<MediaListResult> {
  return adminFetch<MediaListResult>(
    `/api/admin/media${buildMediaQuery(query)}`,
  );
}

/**
 * Ambil SEMUA halaman media (untuk kebutuhan lama yang masih memuat satu
 * daftar penuh, mis. picker). Mengikuti `nextCursor` sampai habis.
 */
export async function fetchAllMedia(
  query: MediaListQuery = {},
): Promise<MediaItem[]> {
  const acc: MediaItem[] = [];
  let cursor: string | null | undefined = query.cursor;
  let guard = 0;
  for (;;) {
    const res: MediaListResult = await listMedia({
      ...query,
      cursor: cursor ?? undefined,
      limit: query.limit ?? 100,
    });
    acc.push(...res.items);
    if (!res.nextCursor || (guard += 1) > 100) break;
    cursor = res.nextCursor;
  }
  return acc;
}

/** Perbarui metadata media (partial). */
export async function updateMedia(
  id: string,
  patch: Partial<
    Pick<
      MediaItem,
      | "title"
      | "alt"
      | "description"
      | "tags"
      | "category"
      | "collectionId"
      | "projectSlug"
      | "productSlug"
      | "articleSlug"
      | "favorite"
      | "order"
    >
  >,
) {
  return adminFetch<{ ok: boolean; item: MediaItem }>(
    `/api/admin/media?id=${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export async function saveMedia(
  item: Omit<
    MediaItem,
    | "id"
    | "createdAt"
    | "alt"
    | "tags"
    | "favorite"
    | "status"
    | "usageCount"
    | "usedIn"
  > &
    Partial<Pick<MediaItem, "alt" | "tags" | "favorite">>,
) {
  return adminFetch<{ ok: boolean; id: string }>("/api/admin/media", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

/**
 * Hapus media. Default = soft delete (trash). Gunakan `hard: true` untuk
 * menghapus permanen (metadata + aset Cloudinary).
 *
 * Bila `hard` dan aset masih dipakai konten, server menolak (HTTP 409) dengan
 * payload `{ error, usedIn }` â€” pesan itu diteruskan sebagai Error.
 * `force: true` mengabaikan guard (hati-hati).
 */
export async function deleteMedia(
  id: string,
  opts: { publicId?: string; hard?: boolean; force?: boolean } = {},
) {
  const params = new URLSearchParams({ id });
  if (opts.publicId) params.set("publicId", opts.publicId);
  if (opts.hard) params.set("hard", "true");
  if (opts.force) params.set("force", "true");
  return adminFetch<{ ok: boolean; trashed?: boolean }>(
    `/api/admin/media?${params.toString()}`,
    { method: "DELETE" },
  );
}

/** Daftar pemakaian sebuah aset media (dari pemindaian konten terkini). */
export async function fetchMediaUsage(id: string): Promise<{
  usageCount: number;
  usedIn: MediaItem["usedIn"];
}> {
  return adminFetch<{ ok: boolean; usageCount: number; usedIn: MediaItem["usedIn"] }>(
    `/api/admin/media/usage?id=${encodeURIComponent(id)}`,
  );
}

/** Pindai ulang seluruh media & simpan usageCount/usedIn (dari dashboard). */
export async function rescanMediaUsage(): Promise<{
  scanned: number;
  used: number;
}> {
  return adminFetch<{ ok: boolean; scanned: number; used: number }>(
    "/api/admin/media/scan",
    { method: "POST", body: JSON.stringify({}) },
  );
}

/** Daftar aset yatim (tak dipakai di konten). */
export async function fetchOrphanMedia(limit = 200): Promise<MediaItem[]> {
  const data = await adminFetch<{ ok: boolean; count: number; items: MediaItem[] }>(
    `/api/admin/media/orphans?limit=${limit}`,
  );
  return data.items;
}

/** Koleksi media + jumlah asetnya. */
export type MediaCollectionWithCount = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverMediaId?: string;
  createdAtISO: string;
  updatedAtISO?: string;
  mediaCount: number;
};

/** Daftar koleksi media. */
export async function fetchMediaCollections(): Promise<MediaCollectionWithCount[]> {
  const data = await adminFetch<{ ok: boolean; items: MediaCollectionWithCount[] }>(
    "/api/admin/media/collections",
  );
  return data.items;
}

/** Buat koleksi baru. */
export async function createMediaCollection(input: {
  name: string;
  description?: string;
}) {
  return adminFetch<{ ok: boolean; collection: MediaCollectionWithCount }>(
    "/api/admin/media/collections",
    { method: "POST", body: JSON.stringify(input) },
  );
}

/** Perbarui koleksi (nama/deskripsi). */
export async function updateMediaCollection(
  id: string,
  patch: { name?: string; description?: string; coverMediaId?: string },
) {
  return adminFetch<{ ok: boolean; collection: MediaCollectionWithCount }>(
    `/api/admin/media/collections?id=${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

/** Hapus koleksi (aset tidak dihapus, hanya dilepas). */
export async function deleteMediaCollection(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/media/collections?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** Daftar tag unik + jumlah pemakaian. */
export async function fetchMediaTags(): Promise<
  Array<{ tag: string; count: number }>
> {
  const data = await adminFetch<{
    ok: boolean;
    items: Array<{ tag: string; count: number }>;
  }>("/api/admin/media/tags");
  return data.items;
}

/** Satu entri riwayat (audit trail) media. */
export type MediaAuditEntry = {
  id: string;
  action: string;
  mediaId: string;
  publicId: string;
  actor: string;
  atISO: string;
  meta?: Record<string, unknown>;
};

/** Riwayat perubahan sebuah aset media. */
export async function fetchMediaAudit(
  mediaId: string,
): Promise<MediaAuditEntry[]> {
  const data = await adminFetch<{ ok: boolean; items: MediaAuditEntry[] }>(
    `/api/admin/media/audit?mediaId=${encodeURIComponent(mediaId)}`,
  );
  return data.items;
}

/** Bungkus nilai agar aman sebagai sel CSV (quote + escape). */
function mediaCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Ubah daftar media menjadi CSV dan unduh di browser. Kolom mencakup metadata
 * inti + `alt`, kategori, tag, koleksi, dan status.
 */
export function exportMediaToCsv(
  items: MediaItem[],
  collections: Array<{ id: string; name: string }> = [],
  filename?: string,
) {
  const colName = new Map(collections.map((c) => [c.id, c.name]));
  const headers = [
    "ID",
    "Judul",
    "Alt",
    "Kategori",
    "Tag",
    "Koleksi",
    "Status",
    "Favorit",
    "Dimensi",
    "Ukuran (KB)",
    "Format",
    "Public ID",
    "URL",
    "Dibuat",
    "Dipakai (jumlah)",
  ];
  const rows = items.map((m) =>
    [
      m.id,
      m.title,
      m.alt,
      m.category,
      m.tags.join("; "),
      m.collectionId ? (colName.get(m.collectionId) ?? m.collectionId) : "",
      m.status,
      m.favorite ? "ya" : "tidak",
      `${m.width}x${m.height}`,
      (m.bytes / 1024).toFixed(0),
      m.format,
      m.publicId,
      m.secureUrl,
      m.createdAt ?? "",
      m.usageCount,
    ]
      .map(mediaCsvCell)
      .join(","),
  );

  const csv = "\uFEFF" + [headers.map(mediaCsvCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename ?? `media-lktech-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Pulihkan media dari trash. */
export async function restoreMedia(id: string) {
  return adminFetch<{ ok: boolean; item: MediaItem }>(
    `/api/admin/media?id=${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ status: "active" }) },
  );
}

/** Deskripsi aksi massal media (diterapkan per item secara berurutan). */
export type MediaBulkAction =
  | { action: "trash" }
  | { action: "restore" }
  | { action: "delete" }
  | { action: "favorite" }
  | { action: "unfavorite" }
  | { action: "setCategory"; category: MediaItem["category"] }
  | { action: "setCollection"; collectionId: string }
  | { action: "addTag"; tag: string }
  | { action: "removeTag"; tag: string };

/**
 * Terapkan aksi massal ke sekumpulan media.
 *
 * Implementasi saat ini: sekuensial per item lewat endpoint PATCH/DELETE yang
 * sudah ada (aman & tanpa endpoint baru). Akan digantikan endpoint bulk
 * server-side di FASE M4 untuk efisiensi. Mengembalikan jumlah sukses/gagal.
 */
export async function applyBulkMedia(
  items: MediaItem[],
  action: MediaBulkAction,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const item of items) {
    try {
      switch (action.action) {
        case "trash":
          await deleteMedia(item.id, { hard: false });
          break;
        case "restore":
          await restoreMedia(item.id);
          break;
        case "delete":
          await deleteMedia(item.id, { publicId: item.publicId, hard: true });
          break;
        case "favorite":
          await updateMedia(item.id, { favorite: true });
          break;
        case "unfavorite":
          await updateMedia(item.id, { favorite: false });
          break;
        case "setCategory":
          await updateMedia(item.id, { category: action.category });
          break;
        case "setCollection":
          await updateMedia(item.id, { collectionId: action.collectionId });
          break;
        case "addTag": {
          const tags = Array.from(new Set([...item.tags, action.tag]));
          await updateMedia(item.id, { tags });
          break;
        }
        case "removeTag": {
          const tags = item.tags.filter((t) => t !== action.tag);
          await updateMedia(item.id, { tags });
          break;
        }
      }
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return { ok, failed };
}


export async function fetchSettings(): Promise<SiteSettings> {
  // Baca endpoint ADMIN (dilindungi & `no-store`) agar form dashboard tidak
  // pernah menampilkan data basi dari cache endpoint publik.
  const data = await adminFetch<{ settings: SiteSettings }>(
    "/api/admin/settings",
  );
  return data.settings;
}

/** Kesehatan konfigurasi email pembeli (`EM-C1`/`EM-H4`). */
export type EmailHealth = {
  configured: boolean;
  testOnly: boolean;
  from: string;
};

/** Pengaturan + status kesehatan email (untuk banner peringatan). */
export async function fetchSettingsWithHealth(): Promise<{
  settings: SiteSettings;
  emailHealth: EmailHealth;
}> {
  return adminFetch<{ settings: SiteSettings; emailHealth: EmailHealth }>(
    "/api/admin/settings",
  );
}

export async function saveSettings(settings: SiteSettings) {
  return adminFetch<{ ok: boolean; settings: SiteSettings }>(
    "/api/admin/settings",
    { method: "PUT", body: JSON.stringify(settings) },
  );
}

export async function fetchProjects(): Promise<StoredProject[]> {
  const data = await adminFetch<{ projects: StoredProject[] }>(
    "/api/admin/projects",
  );
  return data.projects;
}

export async function saveProject(project: Project) {
  return adminFetch<{ ok: boolean; project: Project }>("/api/admin/projects", {
    method: "POST",
    body: JSON.stringify(project),
  });
}

export async function deleteProject(slug: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/projects?slug=${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
}

export async function fetchProducts(): Promise<StoredProduct[]> {
  const data = await adminFetch<{ products: StoredProduct[] }>(
    "/api/admin/products",
  );
  return data.products;
}

export async function saveProduct(product: Product) {
  return adminFetch<{ ok: boolean; product: Product }>("/api/admin/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(slug: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/products?slug=${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
}

/**
 * Kirim email percobaan (notifikasi lead) ke alamat notifikasi DEFAULT.
 * Tidak menerima parameter `to` agar tidak bisa dipakai mengirim ke alamat
 * sembarangan (lihat pembatasan di route terkait).
 */
export async function sendTestEmail() {
  return adminFetch<{ ok: boolean; to: string }>("/api/admin/email/test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchArticles(): Promise<StoredArticle[]> {
  const data = await adminFetch<{ articles: StoredArticle[] }>(
    "/api/admin/articles",
  );
  return data.articles;
}

export async function saveArticle(
  article: Article & { renamedFrom?: string; duplicatedFrom?: string; originalSlug?: string },
) {
  return adminFetch<{ ok: boolean; article: Article }>("/api/admin/articles", {
    method: "POST",
    body: JSON.stringify(article),
  });
}

/** Aksi massal artikel (B4.3). Hasil per item dikembalikan server. */
export async function bulkArticles(action: "publish" | "unpublish" | "delete", slugs: string[]) {
  return adminFetch<{
    ok: boolean;
    done: number;
    failed: number;
    results: Array<{ slug: string; ok: boolean; error?: string }>;
  }>("/api/admin/articles/bulk", {
    method: "POST",
    body: JSON.stringify({ action, slugs }),
  });
}

export async function deleteArticle(slug: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/articles?slug=${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
}
