import { adminFetch } from "@/lib/admin-fetch";
import type { SiteContent } from "@/lib/content-types";

/** Mengambil konten situs terbaru (SEGAR, admin) + versi optimistic lock (ADM-11). */
export async function fetchSiteContent(): Promise<{
  content: SiteContent;
  version: string | null;
}> {
  return adminFetch<{ content: SiteContent; version: string | null }>(
    "/api/admin/content",
  );
}

/**
 * Menyimpan seluruh konten situs. `version` (ADM-11) = versi yang dimuat
 * terakhir; server menolak (409) bila admin lain sudah menyimpan lebih dulu.
 * Mengembalikan konten ternormalisasi + versi baru.
 */
export async function saveSiteContent(
  content: SiteContent,
  version?: string | null,
): Promise<{ content: SiteContent; version: string | null }> {
  return adminFetch<{ ok: boolean; content: SiteContent; version: string | null }>(
    "/api/admin/content",
    {
      method: "PUT",
      body: JSON.stringify({ ...content, expectedVersion: version ?? undefined }),
    },
  );
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
