import { adminFetch } from "@/lib/admin-fetch";
import type { StoredLead, LeadStatus } from "@/lib/lead-types";
import type { MediaItem } from "@/lib/media-types";
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

export async function fetchMedia(): Promise<MediaItem[]> {
  const data = await adminFetch<{ items: MediaItem[] }>("/api/admin/media");
  return data.items;
}

export async function saveMedia(
  item: Omit<MediaItem, "id" | "createdAt">,
) {
  return adminFetch<{ ok: boolean; id: string }>("/api/admin/media", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function deleteMedia(id: string, publicId: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/media?id=${encodeURIComponent(id)}&publicId=${encodeURIComponent(publicId)}`,
    { method: "DELETE" },
  );
}

export async function fetchSettings(): Promise<SiteSettings> {
  // Baca endpoint ADMIN (dilindungi & `no-store`) agar form dashboard tidak
  // pernah menampilkan data basi dari cache endpoint publik.
  const data = await adminFetch<{ settings: SiteSettings }>(
    "/api/admin/settings",
  );
  return data.settings;
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

export async function saveArticle(article: Article) {
  return adminFetch<{ ok: boolean; article: Article }>("/api/admin/articles", {
    method: "POST",
    body: JSON.stringify(article),
  });
}

export async function deleteArticle(slug: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/articles?slug=${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
}
