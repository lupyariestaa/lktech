import "server-only";
import crypto from "node:crypto";
import {
  parseServiceAccount,
  dateRange,
  buildQueryBody,
  normalizeGscRows,
  type GscRow,
} from "@/lib/search-console-pure";

/**
 * Klien Google Search Console API (fase S6) — OPSIONAL & fail-safe.
 *
 * Aktif HANYA bila env berikut diisi:
 * - `GSC_SERVICE_ACCOUNT` (JSON service account satu baris)
 * - `GSC_SITE_URL` (properti GSC, mis. "https://lktech.id/" atau "sc-domain:lktech.id")
 *
 * Tanpa dependensi tambahan: access token OAuth2 (JWT grant) dibuat manual via
 * `node:crypto`. Semua error ditangani → endpoint admin mengembalikan status
 * "belum dikonfigurasi"/pesan jelas, bukan crash.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API_BASE = "https://searchconsole.googleapis.com/webmasters/v3";

/** Apakah Search Console dikonfigurasi (env lengkap). */
export function isSearchConsoleConfigured(): boolean {
  return Boolean(
    process.env.GSC_SERVICE_ACCOUNT?.trim() && process.env.GSC_SITE_URL?.trim(),
  );
}

/** Base64url encode (tanpa padding). */
function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Ciptakan JWT yang ditandatangani RS256 untuk OAuth2 service-account flow. */
function createJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  return `${signingInput}.${b64url(signature)}`;
}

/** Tukar JWT dengan access token. Mengembalikan `null` bila gagal. */
async function getAccessToken(): Promise<string | null> {
  const sa = parseServiceAccount(process.env.GSC_SERVICE_ACCOUNT);
  if (!sa) return null;
  try {
    const jwt = createJwt(sa.client_email, sa.private_key);
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token?.trim() || null;
  } catch (err) {
    console.error("[search-console] gagal mendapat access token:", err);
    return null;
  }
}

/** Query `searchanalytics` (dimensi mis. ["query"] atau ["page"]). */
async function querySearchAnalytics(
  dimensions: string[],
  startDate: string,
  endDate: string,
  rowLimit: number,
): Promise<GscRow[] | null> {
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!siteUrl) return null;
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchanalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildQueryBody({ startDate, endDate, dimensions, rowLimit })),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      console.error("[search-console] query gagal HTTP", res.status);
      return null;
    }
    const json = (await res.json()) as unknown;
    return normalizeGscRows(json);
  } catch (err) {
    console.error("[search-console] query gagal:", err);
    return null;
  }
}

export type SearchConsoleReport = {
  configured: boolean;
  range: { startDate: string; endDate: string };
  topQueries: GscRow[];
  topPages: GscRow[];
};

/**
 * Laporan SEO ringkas: query & halaman teratas untuk `days` terakhir.
 * Bila belum dikonfigurasi / gagal → `configured:false` dengan daftar kosong
 * (UI menampilkan panduan setup, bukan error).
 */
export async function getSearchConsoleReport(days = 28): Promise<SearchConsoleReport> {
  const { startDate, endDate } = dateRange(days, new Date());
  const empty: SearchConsoleReport = {
    configured: isSearchConsoleConfigured(),
    range: { startDate, endDate },
    topQueries: [],
    topPages: [],
  };
  if (!isSearchConsoleConfigured()) return empty;

  const [topQueries, topPages] = await Promise.all([
    querySearchAnalytics(["query"], startDate, endDate, 25),
    querySearchAnalytics(["page"], startDate, endDate, 25),
  ]);

  return {
    configured: true,
    range: { startDate, endDate },
    topQueries: topQueries ?? [],
    topPages: topPages ?? [],
  };
}
