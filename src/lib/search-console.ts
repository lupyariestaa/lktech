import "server-only";
import crypto from "node:crypto";
import {
  dateRange,
  buildQueryBody,
  normalizeGscRows,
  normalizeGscSummary,
  isValidGscResponse,
  parseServiceAccount,
  gscErrorCode,
  reportStatus,
  type GscErrorCode,
  type GscRow,
} from "@/lib/search-console-pure";

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
): Promise<Result<unknown>> {
  const siteUrl = process.env.GSC_SITE_URL?.trim();
  if (!siteUrl) return { ok: false, error: "invalid_credentials" };
  try {
    const response = await fetch(
      `${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchanalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildQueryBody({ startDate, endDate, dimensions, rowLimit })),
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
  unavailableSections?: Array<"summary" | "queries" | "pages">;
  topQueries: GscRow[];
  topPages: GscRow[];
};

export async function getSearchConsoleReport(days = 28): Promise<SearchConsoleReport> {
  const range = dateRange(days, new Date());
  const fetchedAt = new Date().toISOString();
  const empty = {
    range,
    fetchedAt,
    topQueries: [] as GscRow[],
    topPages: [] as GscRow[],
  };
  if (!isSearchConsoleConfigured()) return { ...empty, status: "not_configured" };

  const tokenResult = await getAccessToken();
  if (!tokenResult.ok) return { ...empty, status: "error", errorCode: tokenResult.error };

  const [summaryResult, queriesResult, pagesResult] = await Promise.all([
    querySearchAnalytics(tokenResult.data, [], range.startDate, range.endDate, 1),
    querySearchAnalytics(tokenResult.data, ["query"], range.startDate, range.endDate, 25),
    querySearchAnalytics(tokenResult.data, ["page"], range.startDate, range.endDate, 25),
  ]);
  const summary = summaryResult.ok ? normalizeGscSummary(summaryResult.data) : null;
  const topQueries = queriesResult.ok && isValidGscResponse(queriesResult.data)
    ? normalizeGscRows(queriesResult.data)
    : null;
  const topPages = pagesResult.ok && isValidGscResponse(pagesResult.data)
    ? normalizeGscRows(pagesResult.data)
    : null;

  const failures = [
    !summaryResult.ok ? summaryResult.error : summary === null ? "invalid_response" : null,
    !queriesResult.ok ? queriesResult.error : topQueries === null ? "invalid_response" : null,
    !pagesResult.ok ? pagesResult.error : topPages === null ? "invalid_response" : null,
  ].filter((error): error is GscErrorCode => error !== null);

  const hasData = (summary?.impressions ?? 0) > 0 || (summary?.clicks ?? 0) > 0;
  const status = reportStatus({ configured: true, failureCount: failures.length, hasData });
  if (status === "error") {
    return { ...empty, status, errorCode: failures[0] };
  }
  if (status === "partial") {
    const unavailableSections: SearchConsoleReport["unavailableSections"] = [];
    if (summary === null) unavailableSections.push("summary");
    if (topQueries === null) unavailableSections.push("queries");
    if (topPages === null) unavailableSections.push("pages");
    return {
      ...empty,
      status: "partial",
      errorCode: failures[0],
      ...(summary ? { summary } : {}),
      unavailableSections,
      topQueries: topQueries ?? [],
      topPages: topPages ?? [],
    };
  }

  return {
    ...empty,
    status,
    summary: summary!,
    topQueries: topQueries!,
    topPages: topPages!,
  };
}
