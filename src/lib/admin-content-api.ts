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

/** Angka statistik turunan yang objektif (S4): jumlah proyek/layanan/kota. */
export type DerivedStatCounts = {
  counts: { projects: number; services: number; locations: number };
  asOf: string;
};

/** Ambil angka turunan terkini dari sumber data (read-only, admin). */
export async function fetchDerivedStatCounts(): Promise<DerivedStatCounts> {
  return adminFetch<DerivedStatCounts>("/api/admin/stats/derived");
}
