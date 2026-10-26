import "server-only";
import {
  analyzePage,
  buildAuditReport,
  DEFAULT_SEO_AUDIT_LIMITS,
  isSameOriginAllowed,
  parseSitemapXml,
  sitemapPaths,
  type SeoAuditLimits,
  type SeoAuditPage,
  type SeoAuditPageFacts,
  type SeoAuditReport,
} from "@/lib/seo-audit-pure";
import type { AuditInventoryItem } from "@/lib/seo-inventory";

/**
 * CRAWLER AUDIT SEO INTERNAL (fase D4) — server-only.
 *
 * Keamanan (SSRF & sumber daya):
 * - **Same-origin allowlist**: setiap hop (termasuk redirect) divalidasi terhadap
 *   origin situs; redirect ke host lain TIDAK diikuti, hanya dilaporkan.
 * - **Batas**: timeout per permintaan, ukuran body maksimum, jumlah redirect,
 *   jumlah URL, dan concurrency.
 * - **On-demand**: hanya dipanggil dari route admin terautentikasi; tidak ada
 *   penjadwalan otomatis.
 *
 * Modul ini tidak menulis apa pun ke Firestore; penyimpanan hasil ditangani route.
 */

const USER_AGENT = "LKTechSEOAuditBot/1.0 (+same-origin admin audit)";

type RawResponse = {
  status: number;
  location: string | null;
  contentType: string | null;
  xRobotsTag: string | null;
  html: string | null;
  error: string | null;
};

/** Satu permintaan HTTP dengan timeout & batas body. Tanpa mengikuti redirect. */
async function requestOnce(url: string, limits: SeoAuditLimits, deadlineMs: number): Promise<RawResponse> {
  const remaining = deadlineMs - Date.now();
  if (remaining <= 0) {
    // Anggaran waktu audit habis: jangan mulai permintaan baru.
    return {
      status: 0,
      location: null,
      contentType: null,
      xRobotsTag: null,
      html: null,
      error: "budget_exceeded",
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(limits.timeoutMs, remaining));
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    const contentTypeRaw = res.headers.get("content-type");
    const contentType = contentTypeRaw ? contentTypeRaw.split(";")[0].trim().toLowerCase() : null;
    const isTextual =
      contentType === "text/html" ||
      contentType === "application/xhtml+xml" ||
      (contentType?.startsWith("text/") ?? false);
    const html = isTextual ? await readCapped(res, limits.maxBodyBytes) : null;

    return {
      status: res.status,
      location: res.headers.get("location"),
      contentType,
      xRobotsTag: res.headers.get("x-robots-tag"),
      html,
      error: null,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      status: 0,
      location: null,
      contentType: null,
      xRobotsTag: null,
      html: null,
      error: aborted ? "request_timeout" : "request_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Baca body respons dengan batas byte (mencegah respons raksasa). */
async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return (await res.text()).slice(0, maxBytes);
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let out = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        out += decoder.decode(value, { stream: true });
        if (received >= maxBytes) {
          try {
            await reader.cancel();
          } catch {
            /* abaikan */
          }
          break;
        }
      }
    }
    out += decoder.decode();
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* abaikan */
    }
  }
  return out;
}

/** Resolve Location relatif terhadap URL saat ini. `null` bila tidak valid. */
function resolveLocation(location: string, base: string): string | null {
  try {
    return new URL(location, base).toString();
  } catch {
    return null;
  }
}

/** Ambil satu URL, mengikuti redirect selama tetap same-origin. */
async function fetchPage(
  origin: string,
  startUrl: string,
  limits: SeoAuditLimits,
  deadlineMs: number,
): Promise<{
  httpStatus: number;
  finalUrl: string | null;
  redirected: boolean;
  redirectExternal: boolean;
  contentType: string | null;
  xRobotsTag: string | null;
  html: string | null;
  fetchError: string | null;
}> {
  let current = startUrl;
  let redirected = false;

  if (!isSameOriginAllowed(origin, current)) {
    return {
      httpStatus: 0,
      finalUrl: null,
      redirected: false,
      redirectExternal: true,
      contentType: null,
      xRobotsTag: null,
      html: null,
      fetchError: "blocked_origin",
    };
  }

  for (let hop = 0; hop <= limits.maxRedirects; hop += 1) {
    const res = await requestOnce(current, limits, deadlineMs);

    if (res.error === "budget_exceeded") {
      return {
        httpStatus: 0,
        finalUrl: current,
        redirected,
        redirectExternal: false,
        contentType: null,
        xRobotsTag: null,
        html: null,
        fetchError: "budget_exceeded",
      };
    }

    if (res.error) {
      return {
        httpStatus: 0,
        finalUrl: current,
        redirected,
        redirectExternal: false,
        contentType: res.contentType,
        xRobotsTag: res.xRobotsTag,
        html: null,
        fetchError: res.error,
      };
    }

    if (res.status >= 300 && res.status < 400 && res.location) {
      redirected = true;
      const next = resolveLocation(res.location, current);
      if (!next || !isSameOriginAllowed(origin, next)) {
        return {
          httpStatus: res.status,
          finalUrl: current,
          redirected: true,
          redirectExternal: true,
          contentType: res.contentType,
          xRobotsTag: res.xRobotsTag,
          html: null,
          fetchError: null,
        };
      }
      current = next;
      continue;
    }

    return {
      httpStatus: res.status,
      finalUrl: current,
      redirected,
      redirectExternal: false,
      contentType: res.contentType,
      xRobotsTag: res.xRobotsTag,
      html: res.html,
      fetchError: null,
    };
  }

  // Melebihi batas redirect (tetap same-origin).
  return {
    httpStatus: 0,
    finalUrl: current,
    redirected: true,
    redirectExternal: false,
    contentType: null,
    xRobotsTag: null,
    html: null,
    fetchError: "too_many_redirects",
  };
}

/** Jalankan tugas dengan batas concurrency sederhana (tanpa dependency). */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/** Ambil & parse sitemap.xml situs (best-effort). */
async function fetchSitemapPaths(
  origin: string,
  limits: SeoAuditLimits,
  deadlineMs: number,
): Promise<{ paths: Set<string>; checked: boolean; error: string | null }> {
  const sitemapUrl = `${origin.replace(/\/+$/, "")}/sitemap.xml`;
  if (!isSameOriginAllowed(origin, sitemapUrl)) {
    return { paths: new Set(), checked: false, error: "blocked_origin" };
  }
  // Sitemap dibatasi satu timeout agar tidak menghabiskan seluruh anggaran audit.
  const sitemapDeadline = Math.min(deadlineMs, Date.now() + limits.timeoutMs);
  const res = await requestOnce(sitemapUrl, { ...limits, maxBodyBytes: 2 * 1024 * 1024 }, sitemapDeadline);
  if (res.error) return { paths: new Set(), checked: false, error: res.error };
  if (res.status >= 400) return { paths: new Set(), checked: false, error: `http_${res.status}` };
  if (!res.html) return { paths: new Set(), checked: false, error: "empty_sitemap" };
  return { paths: sitemapPaths(parseSitemapXml(res.html), origin), checked: true, error: null };
}

/**
 * Jalankan audit lengkap untuk daftar inventaris. `origin` = URL absolut situs
 * (mis. `https://lktech.id`). Mengembalikan laporan bertipe siap disimpan/ditampilkan.
 */
export async function runSeoAudit(input: {
  origin: string;
  items: readonly AuditInventoryItem[];
  inventorySize?: number;
  truncated?: boolean;
  limits?: Partial<SeoAuditLimits>;
}): Promise<SeoAuditReport> {
  const limits: SeoAuditLimits = { ...DEFAULT_SEO_AUDIT_LIMITS, ...(input.limits ?? {}) };
  const origin = input.origin.replace(/\/+$/, "");
  const startedAt = new Date().toISOString();
  // Anggaran waktu total: menjamin respons selesai sebelum `maxDuration` route.
  const deadline = Date.now() + Math.max(0, limits.budgetMs);

  const sitemap = await fetchSitemapPaths(origin, limits, deadline);

  const pages = await mapWithConcurrency(input.items, limits.concurrency, async (item) => {
    const checkedAt = new Date().toISOString();
    const base = { path: item.path, group: item.group, checkedAt };
    const url = `${origin}${item.path}`;
    const inSitemap = sitemap.paths.has(item.path) || sitemap.paths.has(item.path.replace(/\/$/, ""));

    if (!isSameOriginAllowed(origin, url)) {
      const facts: SeoAuditPageFacts = {
        ...base,
        httpStatus: 0,
        fetchError: "blocked_origin",
        finalUrl: null,
        redirected: false,
        redirectExternal: false,
        html: null,
        inSitemap: false,
      };
      return analyzePage(facts, origin);
    }

    // Anggaran habis sebelum URL ini dimulai → tandai `not_checked`, bukan error.
    if (Date.now() >= deadline) {
      const facts: SeoAuditPageFacts = {
        ...base,
        httpStatus: 0,
        fetchError: "budget_exceeded",
        finalUrl: null,
        redirected: false,
        redirectExternal: false,
        html: null,
        inSitemap,
      };
      return analyzePage(facts, origin);
    }

    const result = await fetchPage(origin, url, limits, deadline);

    const facts: SeoAuditPageFacts = {
      ...base,
      httpStatus: result.httpStatus,
      fetchError: result.fetchError,
      finalUrl: result.finalUrl,
      redirected: result.redirected,
      redirectExternal: result.redirectExternal,
      contentType: result.contentType,
      html: result.html,
      xRobotsTag: result.xRobotsTag,
      inSitemap,
    };
    return analyzePage(facts, origin);
  });

  const finishedAt = new Date().toISOString();
  return buildAuditReport({
    origin,
    pages,
    startedAt,
    finishedAt,
    truncated: input.truncated ?? false,
    inventorySize: input.inventorySize ?? input.items.length,
    sitemapChecked: sitemap.checked,
    sitemapError: sitemap.error,
    limits,
  });
}

/** Halaman kosong (dipakai bila tidak ada URL untuk diaudit). */
export function emptyAuditReport(origin: string): SeoAuditReport {
  const now = new Date().toISOString();
  return buildAuditReport({
    origin,
    pages: [] as SeoAuditPage[],
    startedAt: now,
    finishedAt: now,
    truncated: false,
    inventorySize: 0,
    sitemapChecked: false,
    sitemapError: null,
    limits: DEFAULT_SEO_AUDIT_LIMITS,
  });
}
