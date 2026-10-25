import "server-only";
import crypto from "node:crypto";
import {
  dateRange,
  resolveReportRange,
  previousDateRange,
  buildDimensionFilters,
  type GscFilters,
  buildQueryBody,
  normalizeGscRows,
  normalizeGscSummary,
  isValidGscResponse,
  parseServiceAccount,
  gscErrorCode,
  type GscErrorCode,
  type GscRow,
} from "@/lib/search-console-pure";
import {
  computeSeoInsights,
  DEFAULT_SEO_INSIGHT_CONFIG,
  type SeoInsight,
  type SeoInsightConfig,
} from "@/lib/seo-insights-pure";
import { SITE_URL } from "@/lib/site";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API_BASE = "https://searchconsole.googleapis.com/webmasters/v3";
const REQUEST_TIMEOUT_MS = 15_000;

export function isSearchConsoleConfigured(): boolean {
  return Boolean(
    process.env.GSC_SERVICE_ACCOUNT?.trim() && process.env.GSC_SITE_URL?.trim(),
  );
}

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createJwt(clientEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = { iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signature = crypto.createSign("RSA-SHA256").update(input).sign(privateKey);
  return `${input}.${b64url(signature)}`;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: GscErrorCode };

async function getAccessToken(): Promise<Result<string>> {
  const sa = parseServiceAccount(process.env.GSC_SERVICE_ACCOUNT);
  if (!sa) return { ok: false, error: "invalid_credentials" };
  try {
    let jwt: string;
    try {
      jwt = createJwt(sa.client_email, sa.private_key);
    } catch {
      return { ok: false, error: "invalid_credentials" };
    }
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, error: gscErrorCode(response.status) };
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return { ok: false, error: "invalid_response" };
    const token = (payload as { access_token?: unknown }).access_token;
    return typeof token === "string" && token.trim()
      ? { ok: true, data: token }
      : { ok: false, error: "invalid_response" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error && error.name === "TimeoutError" ? "request_timeout" : "provider_unavailable",
    };
  }
}

async function querySearchAnalytics(
  token: string,
  dimensions: string[],
  startDate: string,
  endDate: string,
  rowLimit?: number,
  filters: GscFilters = {},
): Promise<Result<unknown>> {
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!siteUrl) return { ok: false, error: "invalid_credentials" };
  try {
    const response = await fetch(
      `${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchanalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildQueryBody({
          startDate,
          endDate,
          dimensions,
          rowLimit,
          searchType: filters.searchType,
          dimensionFilterGroups: buildDimensionFilters(filters),
        })),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!response.ok) return { ok: false, error: gscErrorCode(response.status) };
    return { ok: true, data: await response.json() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error && error.name === "TimeoutError" ? "request_timeout" : "provider_unavailable",
    };
  }
}

export type SearchConsoleReport = {
  status: "not_configured" | "connected" | "no_data" | "partial" | "error";
  errorCode?: GscErrorCode;
  range: { startDate: string; endDate: string };
  fetchedAt: string;
  summary?: { clicks: number; impressions: number; ctr: number; averagePosition: number };
  unavailableSections?: Array<"summary" | "queries" | "pages" | "trend" | "comparison" | "declines">;
  topQueries: GscRow[];
  topPages: GscRow[];
  previousRange?: { startDate: string; endDate: string };
  comparisonSummary?: { clicks: number; impressions: number; ctr: number; averagePosition: number };
  trend: GscRow[];
  /** Insight berbasis aturan (fase D3); heuristik & transparan. */
  insights: SeoInsight[];
  /** Ambang heuristik aktif yang dipakai untuk `insights`. */
  insightConfig: SeoInsightConfig;
};

export async function getSearchConsoleReport(options: {
  days?: number;
  startDate?: string;
  endDate?: string;
  filters?: GscFilters;
  insightConfig?: Partial<SeoInsightConfig>;
} = {}): Promise<SearchConsoleReport> {
  const now = new Date();
  const range = resolveReportRange({ ...options, now }) ?? dateRange(options.days ?? 28, now);
  const fetchedAt = new Date().toISOString();
  const insightConfig = { ...DEFAULT_SEO_INSIGHT_CONFIG, ...(options.insightConfig ?? {}) };
  const empty = {
    range,
    fetchedAt,
    topQueries: [] as GscRow[],
    topPages: [] as GscRow[],
    trend: [] as GscRow[],
    insights: [] as SeoInsight[],
    insightConfig,
  };
  if (!isSearchConsoleConfigured()) return { ...empty, status: "not_configured" };

  const tokenResult = await getAccessToken();
  if (!tokenResult.ok) return { ...empty, status: "error", errorCode: tokenResult.error };

  const previousRange = previousDateRange(range);
  const filters = options.filters ?? {};
  const [summaryResult, queriesResult, pagesResult, trendResult, comparisonResult, previousQueriesResult, previousPagesResult] =
    await Promise.all([
      querySearchAnalytics(tokenResult.data, [], range.startDate, range.endDate, 1, filters),
      querySearchAnalytics(tokenResult.data, ["query"], range.startDate, range.endDate, 100, filters),
      querySearchAnalytics(tokenResult.data, ["page"], range.startDate, range.endDate, 100, filters),
      querySearchAnalytics(tokenResult.data, ["date"], range.startDate, range.endDate, 1000, filters),
      querySearchAnalytics(tokenResult.data, [], previousRange.startDate, previousRange.endDate, 1, filters),
      querySearchAnalytics(tokenResult.data, ["query"], previousRange.startDate, previousRange.endDate, 100, filters),
      querySearchAnalytics(tokenResult.data, ["page"], previousRange.startDate, previousRange.endDate, 100, filters),
    ]);
  const summary = summaryResult.ok ? normalizeGscSummary(summaryResult.data) : null;
  const topQueries = queriesResult.ok && isValidGscResponse(queriesResult.data)
    ? normalizeGscRows(queriesResult.data)
    : null;
  const topPages = pagesResult.ok && isValidGscResponse(pagesResult.data)
    ? normalizeGscRows(pagesResult.data)
    : null;
  const trend = trendResult.ok && isValidGscResponse(trendResult.data)
    ? normalizeGscRows(trendResult.data)
    : null;
  const comparisonSummary = comparisonResult.ok ? normalizeGscSummary(comparisonResult.data) : null;
  const previousQueries = previousQueriesResult.ok && isValidGscResponse(previousQueriesResult.data)
    ? normalizeGscRows(previousQueriesResult.data)
    : null;
  const previousPages = previousPagesResult.ok && isValidGscResponse(previousPagesResult.data)
    ? normalizeGscRows(previousPagesResult.data)
    : null;

  const insights = computeSeoInsights({
    queries: topQueries ?? [],
    pages: topPages ?? [],
    // Hanya kirim periode pembanding bila KEDUA breakdown valid, agar aturan
    // penurunan tidak membandingkan data yang sebagian hilang.
    ...(previousQueries && previousPages ? { previousQueries, previousPages } : {}),
    origin: SITE_URL,
    range,
    config: options.insightConfig,
  });

  const failures = [
    !summaryResult.ok ? summaryResult.error : summary === null ? "invalid_response" : null,
    !queriesResult.ok ? queriesResult.error : topQueries === null ? "invalid_response" : null,
    !pagesResult.ok ? pagesResult.error : topPages === null ? "invalid_response" : null,
    !trendResult.ok ? trendResult.error : trend === null ? "invalid_response" : null,
    !comparisonResult.ok ? comparisonResult.error : comparisonSummary === null ? "invalid_response" : null,
    !previousQueriesResult.ok ? previousQueriesResult.error : previousQueries === null ? "invalid_response" : null,
    !previousPagesResult.ok ? previousPagesResult.error : previousPages === null ? "invalid_response" : null,
  ].filter((error): error is GscErrorCode => error !== null);

  const hasData = (summary?.impressions ?? 0) > 0 || (summary?.clicks ?? 0) > 0;
  const requiredFailures = [summary, topQueries, topPages].filter((value) => value === null).length;
  const status = requiredFailures === 3
    ? "error"
    : failures.length > 0
      ? "partial"
      : hasData ? "connected" : "no_data";
  if (requiredFailures === 3) {
    return { ...empty, status, errorCode: failures[0] };
  }
  if (failures.length > 0) {
    const unavailableSections: SearchConsoleReport["unavailableSections"] = [];
    if (summary === null) unavailableSections.push("summary");
    if (topQueries === null) unavailableSections.push("queries");
    if (topPages === null) unavailableSections.push("pages");
    if (trend === null) unavailableSections.push("trend");
    if (comparisonSummary === null) unavailableSections.push("comparison");
    if (previousQueries === null || previousPages === null) unavailableSections.push("declines");
    return {
      ...empty,
      status,
      errorCode: failures[0],
      ...(summary ? { summary } : {}),
      ...(comparisonSummary !== null ? { comparisonSummary, previousRange } : {}),
      unavailableSections,
      topQueries: topQueries ?? [],
      topPages: topPages ?? [],
      trend: trend ?? [],
      insights,
    };
  }

  return {
    ...empty,
    status,
    summary: summary!,
    comparisonSummary: comparisonSummary!,
    previousRange,
    topQueries: topQueries!,
    topPages: topPages!,
    trend: trend!,
    insights,
  };
}
