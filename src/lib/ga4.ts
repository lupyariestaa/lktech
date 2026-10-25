import "server-only";
import crypto from "node:crypto";
import { parseServiceAccount } from "@/lib/search-console-pure";
import {
  GA4_SUMMARY_METRICS,
  buildRunReportBody,
  ga4ErrorCode,
  ga4Status,
  isValidGa4Response,
  normalizeGa4Rows,
  normalizeGa4Summary,
  normalizePropertyId,
  parseConversionEvents,
  previousGa4Range,
  resolveGa4Range,
  type Ga4ErrorCode,
  type Ga4Range,
  type Ga4Status,
  type Ga4Summary,
} from "@/lib/ga4-pure";

/**
 * Integrasi Google Analytics 4 (fase D6) — server-side, READ-ONLY.
 *
 * - Kredensial TERPISAH dari Search Console: `GA4_SERVICE_ACCOUNT` (JSON satu
 *   baris) + `GA4_PROPERTY_ID` (ID numerik properti, mis. "123456789").
 * - Event konversi (maks 3) dari `GA4_CONVERSION_EVENTS` (dipisah koma).
 * - Cakupan hanya agregat (tampilan halaman/sesi/pengguna/event); tidak ada PII.
 * - Tidak pernah mencatat/menampilkan secret; error dipetakan ke kode aman.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const API_BASE = "https://analyticsdata.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 15_000;

/** Event konversi yang dikonfigurasi admin (maks 3, tervalidasi). */
export function configuredConversionEvents(): string[] {
  return parseConversionEvents(process.env.GA4_CONVERSION_EVENTS);
}

export function isGa4Configured(): boolean {
  return Boolean(
    process.env.GA4_SERVICE_ACCOUNT?.trim() &&
      normalizePropertyId(process.env.GA4_PROPERTY_ID),
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

type Result<T> = { ok: true; data: T } | { ok: false; error: Ga4ErrorCode };

async function getAccessToken(): Promise<Result<string>> {
  const sa = parseServiceAccount(process.env.GA4_SERVICE_ACCOUNT);
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
    if (!response.ok) return { ok: false, error: ga4ErrorCode(response.status) };
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

async function runReport(token: string, body: Record<string, unknown>): Promise<Result<unknown>> {
  const propertyId = normalizePropertyId(process.env.GA4_PROPERTY_ID);
  if (!propertyId) return { ok: false, error: "invalid_credentials" };
  try {
    const response = await fetch(`${API_BASE}/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, error: ga4ErrorCode(response.status) };
    return { ok: true, data: await response.json() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error && error.name === "TimeoutError" ? "request_timeout" : "provider_unavailable",
    };
  }
}

export type Ga4TrendPoint = { date: string; pageViews: number; sessions: number; activeUsers: number };
export type Ga4PageRow = { path: string; pageViews: number; sessions: number; activeUsers: number };
export type Ga4ConversionRow = { eventName: string; count: number };

export type Ga4Report = {
  status: Ga4Status;
  errorCode?: Ga4ErrorCode;
  range: Ga4Range;
  fetchedAt: string;
  summary?: Ga4Summary;
  comparisonSummary?: Ga4Summary;
  previousRange?: Ga4Range;
  trend: Ga4TrendPoint[];
  topPages: Ga4PageRow[];
  conversions: Ga4ConversionRow[];
  /** Nama event konversi aktif (nama saja, bukan rahasia). */
  conversionEvents: string[];
  unavailableSections?: Array<"summary" | "trend" | "pages" | "conversions" | "comparison">;
};

/** Laporan GA4 dengan struktur TERPISAH dari Search Console. */
export async function getGa4Report(options: { days?: number; startDate?: string; endDate?: string } = {}): Promise<Ga4Report> {
  const now = new Date();
  const range = resolveGa4Range({ ...options, now })!;
  const fetchedAt = new Date().toISOString();
  const conversionEvents = configuredConversionEvents();
  const empty = {
    range,
    fetchedAt,
    trend: [] as Ga4TrendPoint[],
    topPages: [] as Ga4PageRow[],
    conversions: [] as Ga4ConversionRow[],
    conversionEvents,
  };

  if (!isGa4Configured()) return { ...empty, status: "not_configured" };

  const tokenResult = await getAccessToken();
  if (!tokenResult.ok) return { ...empty, status: "error", errorCode: tokenResult.error };
  const token = tokenResult.data;

  const previousRange = previousGa4Range(range);
  const conversionRequest = conversionEvents.length
    ? [runReport(token, buildRunReportBody({
        startDate: range.startDate,
        endDate: range.endDate,
        dimensions: ["eventName"],
        metrics: ["eventCount"],
        eventNames: conversionEvents,
        limit: conversionEvents.length,
        orderBys: [{ metric: "eventCount", desc: true }],
      }))]
    : [];

  const [summaryR, trendR, pagesR, comparisonR, conversionR] = await Promise.all([
    runReport(token, buildRunReportBody({
      startDate: range.startDate,
      endDate: range.endDate,
      metrics: [...GA4_SUMMARY_METRICS],
      limit: 1,
    })),
    runReport(token, buildRunReportBody({
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["date"],
      metrics: ["screenPageViews", "sessions", "activeUsers"],
      limit: 400,
      orderBys: [{ dimension: "date" }],
    })),
    runReport(token, buildRunReportBody({
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["pagePath"],
      metrics: ["screenPageViews", "sessions", "activeUsers"],
      limit: 50,
      orderBys: [{ metric: "screenPageViews", desc: true }],
    })),
    runReport(token, buildRunReportBody({
      startDate: previousRange.startDate,
      endDate: previousRange.endDate,
      metrics: [...GA4_SUMMARY_METRICS],
      limit: 1,
    })),
    ...conversionRequest,
  ]);

  const summary = summaryR.ok ? normalizeGa4Summary(summaryR.data) : null;
  const trendRows = trendR.ok && isValidGa4Response(trendR.data) ? normalizeGa4Rows(trendR.data) : null;
  const pageRows = pagesR.ok && isValidGa4Response(pagesR.data) ? normalizeGa4Rows(pagesR.data) : null;
  const comparisonSummary = comparisonR.ok ? normalizeGa4Summary(comparisonR.data) : null;
  const conversionRows =
    conversionEvents.length > 0 && conversionR && conversionR.ok && isValidGa4Response(conversionR.data)
      ? normalizeGa4Rows(conversionR.data)
      : conversionEvents.length > 0
        ? null
        : [];

  const trend: Ga4TrendPoint[] = (trendRows ?? []).map((row) => ({
    date: formatGa4Date(row.dimensions[0] ?? ""),
    pageViews: row.metrics[0] ?? 0,
    sessions: row.metrics[1] ?? 0,
    activeUsers: row.metrics[2] ?? 0,
  }));
  const topPages: Ga4PageRow[] = (pageRows ?? []).map((row) => ({
    path: row.dimensions[0] ?? "",
    pageViews: row.metrics[0] ?? 0,
    sessions: row.metrics[1] ?? 0,
    activeUsers: row.metrics[2] ?? 0,
  }));
  const conversions: Ga4ConversionRow[] = (conversionRows ?? []).map((row) => ({
    eventName: row.dimensions[0] ?? "",
    count: row.metrics[0] ?? 0,
  }));

  const requiredFailures = [summary, trendRows, pageRows].filter((value) => value === null).length;
  const hasData = (summary?.pageViews ?? 0) > 0 || (summary?.sessions ?? 0) > 0;
  const status = ga4Status({ configured: true, failureCount: countFailures([summary, trendRows, pageRows, comparisonSummary, conversionRows]), requiredCount: 3, hasData });

  if (requiredFailures === 3) {
    const firstError = [summaryR, trendR, pagesR].find((r) => !r.ok) as { ok: false; error: Ga4ErrorCode } | undefined;
    return { ...empty, status: "error", errorCode: firstError?.error ?? "invalid_response" };
  }

  const optionalFailures =
    comparisonSummary === null || (conversionEvents.length > 0 && conversionRows === null);
  if (optionalFailures || requiredFailures > 0) {
    const unavailableSections: NonNullable<Ga4Report["unavailableSections"]> = [];
    if (summary === null) unavailableSections.push("summary");
    if (trendRows === null) unavailableSections.push("trend");
    if (pageRows === null) unavailableSections.push("pages");
    if (comparisonSummary === null) unavailableSections.push("comparison");
    if (conversionEvents.length > 0 && conversionRows === null) unavailableSections.push("conversions");
    return {
      ...empty,
      status: "partial",
      ...(summary ? { summary } : {}),
      ...(comparisonSummary ? { comparisonSummary, previousRange } : {}),
      trend,
      topPages,
      conversions,
      unavailableSections,
    };
  }

  return {
    ...empty,
    status,
    summary: summary!,
    comparisonSummary: comparisonSummary!,
    previousRange,
    trend,
    topPages,
    conversions,
  };
}

function countFailures(values: unknown[]): number {
  return values.filter((value) => value === null).length;
}

/** GA4 memakai "YYYYMMDD" untuk dimensi `date`; ubah ke "YYYY-MM-DD". */
export function formatGa4Date(value: string): string {
  const v = value.trim();
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  return v;
}
