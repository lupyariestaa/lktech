import { getIdToken } from "@/lib/auth";
import type { SiteContent } from "@/lib/content-types";

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

/** Mengambil konten situs terbaru (SEGAR, admin) untuk dashboard. */
export async function fetchSiteContent(): Promise<SiteContent> {
  const res = await fetch("/api/admin/content", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ content: SiteContent }>(res);
  return data.content;
}

/** Menyimpan seluruh konten situs. Mengembalikan konten yang sudah dinormalkan. */
export async function saveSiteContent(
  content: SiteContent,
): Promise<SiteContent> {
  const res = await fetch("/api/admin/content", {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(content),
  });
  const data = await handle<{ ok: boolean; content: SiteContent }>(res);
  return data.content;
}
