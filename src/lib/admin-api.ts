import { getIdToken } from "@/lib/auth";
import type { StoredLead, LeadStatus } from "@/lib/lead-types";
import type { MediaItem } from "@/lib/media-types";
import type { Project, StoredProject } from "@/lib/project-types";
import type { Article, StoredArticle } from "@/lib/article-types";
import type { SiteSettings } from "@/lib/settings-types";

async function authHeaders() {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Terjadi kesalahan.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function fetchLeads(): Promise<StoredLead[]> {
  const res = await fetch("/api/admin/leads", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ leads: StoredLead[] }>(res);
  return data.leads;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const res = await fetch("/api/admin/leads", {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ id, status }),
  });
  return handle<{ ok: boolean }>(res);
}

export async function deleteLead(id: string) {
  const res = await fetch(`/api/admin/leads?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return handle<{ ok: boolean }>(res);
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
  const res = await fetch("/api/admin/media", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ items: MediaItem[] }>(res);
  return data.items;
}

export async function saveMedia(
  item: Omit<MediaItem, "id" | "createdAt">,
) {
  const res = await fetch("/api/admin/media", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(item),
  });
  return handle<{ ok: boolean; id: string }>(res);
}

export async function deleteMedia(id: string, publicId: string) {
  const res = await fetch(
    `/api/admin/media?id=${encodeURIComponent(id)}&publicId=${encodeURIComponent(publicId)}`,
    { method: "DELETE", headers: await authHeaders() },
  );
  return handle<{ ok: boolean }>(res);
}

export async function fetchSettings(): Promise<SiteSettings> {
  const res = await fetch("/api/settings", { cache: "no-store" });
  const data = await handle<{ settings: SiteSettings }>(res);
  return data.settings;
}

export async function saveSettings(settings: SiteSettings) {
  const res = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(settings),
  });
  return handle<{ ok: boolean; settings: SiteSettings }>(res);
}

export async function fetchProjects(): Promise<StoredProject[]> {
  const res = await fetch("/api/admin/projects", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ projects: StoredProject[] }>(res);
  return data.projects;
}

export async function saveProject(project: Project) {
  const res = await fetch("/api/admin/projects", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(project),
  });
  return handle<{ ok: boolean; project: Project }>(res);
}

export async function deleteProject(slug: string) {
  const res = await fetch(
    `/api/admin/projects?slug=${encodeURIComponent(slug)}`,
    { method: "DELETE", headers: await authHeaders() },
  );
  return handle<{ ok: boolean }>(res);
}

export async function sendTestEmail(to?: string) {
  const res = await fetch("/api/admin/email/test", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ to }),
  });
  return handle<{ ok: boolean; to: string }>(res);
}

export async function fetchArticles(): Promise<StoredArticle[]> {
  const res = await fetch("/api/admin/articles", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ articles: StoredArticle[] }>(res);
  return data.articles;
}

export async function saveArticle(article: Article) {
  const res = await fetch("/api/admin/articles", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(article),
  });
  return handle<{ ok: boolean; article: Article }>(res);
}

export async function deleteArticle(slug: string) {
  const res = await fetch(
    `/api/admin/articles?slug=${encodeURIComponent(slug)}`,
    { method: "DELETE", headers: await authHeaders() },
  );
  return handle<{ ok: boolean }>(res);
}
