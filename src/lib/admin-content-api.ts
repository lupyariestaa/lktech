import { adminFetch } from "@/lib/admin-fetch";
import type { SiteContent } from "@/lib/content-types";

/** Mengambil konten situs terbaru (SEGAR, admin) untuk dashboard. */
export async function fetchSiteContent(): Promise<SiteContent> {
  const data = await adminFetch<{ content: SiteContent }>("/api/admin/content");
  return data.content;
}

/** Menyimpan seluruh konten situs. Mengembalikan konten yang sudah dinormalkan. */
export async function saveSiteContent(
  content: SiteContent,
): Promise<SiteContent> {
  const data = await adminFetch<{ ok: boolean; content: SiteContent }>(
    "/api/admin/content",
    { method: "PUT", body: JSON.stringify(content) },
  );
  return data.content;
}
