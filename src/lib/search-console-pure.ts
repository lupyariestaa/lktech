/**
 * Logika MURNI Search Console (fase S6) — bebas impor runtime agar dapat diuji.
 * Mencakup: parsing service account, normalisasi respons GSC, & pembangun body
 * permintaan `searchanalytics.query`.
 */

/** Kredensial service account (dari JSON satu baris di env). */
export type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

/** Baris hasil GSC (subset yang dipakai UI). */
export type GscRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/** Safe status codes surfaced to the admin dashboard (never provider payloads). */
export type GscErrorCode =
  | "invalid_credentials"
  | "permission_denied"
  | "quota_limited"
  | "provider_unavailable"
  | "request_timeout"
  | "invalid_response"
  | "request_failed";

export type GscQueryResult = {
  rows: GscRow[];
  /** Rentang tanggal yang dipakai (yyyy-mm-dd). */
  startDate: string;
  endDate: string;
};

/**
 * Parse JSON service account (string) menjadi kredensial. Mengembalikan `null`
 * bila kosong/tidak valid atau field wajib tak ada. Toleran terhadap `\n` ganda.
 */
export function parseServiceAccount(raw: string | undefined | null): ServiceAccount | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  try {
    const obj = JSON.parse(s) as Record<string, unknown>;
    const client_email = typeof obj.client_email === "string" ? obj.client_email : "";
    const private_key = typeof obj.private_key === "string" ? obj.private_key : "";
    if (!client_email || !private_key) return null;
    return {
      client_email,
      // Normalisasi escape `\n` (sering tersalin ganda dari env).
      private_key: private_key.replace(/\\n/g, "\n"),
      project_id: typeof obj.project_id === "string" ? obj.project_id : undefined,
    };
  } catch {
    return null;
  }
}

/** Rentang N hari untuk GSC; mengecualikan 3 hari terakhir yang rawan belum matang. */
export function dateRange(days: number, now: Date): { startDate: string; endDate: string } {
  return resolveReportRange({ days, now })!;
}

export function reportStatus(input: {
  configured: boolean;
  failureCount: number;
  hasData: boolean;
}): "not_configured" | "connected" | "no_data" | "partial" | "error" {
  if (!input.configured) return "not_configured";
  if (input.failureCount >= 3) return "error";
  if (input.failureCount > 0) return "partial";
  return input.hasData ? "connected" : "no_data";
}

/** Body permintaan Search Analytics; rowLimit mengikuti batas API GSC (25.000). */
export function buildQueryBody(options: {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
  searchType?: "web" | "image" | "video" | "news";
  dimensionFilterGroups?: Array<{ filters: Array<{ dimension: string; operator: string; expression: string }> }>;
}): Record<string, unknown> {
  return {
    startDate: options.startDate,
    endDate: options.endDate,
    dimensions: options.dimensions,
    rowLimit: Math.min(Math.max(options.rowLimit ?? 25, 1), 25_000),
    ...(options.searchType ? { type: options.searchType } : {}),
    ...(options.dimensionFilterGroups?.length ? { dimensionFilterGroups: options.dimensionFilterGroups } : {}),
  };
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_CUSTOM_RANGE_DAYS = 180;
export const GSC_DATA_LAG_DAYS = 3;

function validDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function resolveReportRange(input: {
  days?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  now: Date;
}): { startDate: string; endDate: string } | null {
  const start = typeof input.startDate === "string" ? input.startDate : "";
  const end = typeof input.endDate === "string" ? input.endDate : "";
  if (start || end) {
    if (!validDay(start) || !validDay(end) || start > end) return null;
    const latest = new Date(input.now);
    latest.setUTCHours(0, 0, 0, 0);
    latest.setUTCDate(latest.getUTCDate() - GSC_DATA_LAG_DAYS);
    const latestDay = latest.toISOString().slice(0, 10);
    if (end > latestDay) return null;
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T00:00:00.000Z`);
    const spanDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (spanDays > MAX_CUSTOM_RANGE_DAYS) return null;
    return { startDate: start, endDate: end };
  }
  const days = input.days === undefined ? 28 : Number(input.days);
  const safeDays = Math.min(Math.max(Math.floor(days) || 28, 1), 180);
  const rangeEnd = new Date(input.now);
  rangeEnd.setUTCHours(0, 0, 0, 0);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() - GSC_DATA_LAG_DAYS);
  const startDate = new Date(rangeEnd);
  startDate.setUTCDate(startDate.getUTCDate() - (safeDays - 1));
  return { startDate: startDate.toISOString().slice(0, 10), endDate: rangeEnd.toISOString().slice(0, 10) };
}

export function previousDateRange(range: { startDate: string; endDate: string }): { startDate: string; endDate: string } {
  const start = new Date(`${range.startDate}T00:00:00.000Z`);
  const end = new Date(`${range.endDate}T00:00:00.000Z`);
  const span = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  end.setUTCDate(end.getUTCDate() - span);
  start.setUTCDate(start.getUTCDate() - span);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export type GscFilters = {
  country?: string;
  device?: "DESKTOP" | "MOBILE" | "TABLET";
  searchType?: "web" | "image" | "video" | "news";
  queryContains?: string;
  pageContains?: string;
};

export function buildDimensionFilters(filters: GscFilters): Array<{ filters: Array<{ dimension: string; operator: string; expression: string }> }> {
  const dimensions: Array<{ dimension: string; operator: string; expression: string }> = [];
  if (filters.country) dimensions.push({ dimension: "country", operator: "equals", expression: filters.country.toLowerCase() });
  if (filters.device) dimensions.push({ dimension: "device", operator: "equals", expression: filters.device });
  if (filters.queryContains) dimensions.push({ dimension: "query", operator: "contains", expression: filters.queryContains });
  if (filters.pageContains) dimensions.push({ dimension: "page", operator: "contains", expression: filters.pageContains });
  return dimensions.length ? [{ filters: dimensions }] : [];
}

export function parseGscFilters(params: URLSearchParams): GscFilters | null {
  const country = params.get("country")?.trim().toLowerCase() ?? "";
  const device = params.get("device")?.trim().toUpperCase() ?? "";
  const searchType = params.get("searchType")?.trim().toLowerCase() ?? "";
  const queryContains = params.get("query")?.trim() ?? "";
  const pageContains = params.get("page")?.trim() ?? "";
  const allowed = new Set(["days", "startDate", "endDate", "country", "device", "searchType", "query", "page", "minImpressions"]);
  for (const key of params.keys()) if (!allowed.has(key)) return null;
  if (params.getAll("days").length > 1 || params.getAll("startDate").length > 1 || params.getAll("endDate").length > 1
    || params.getAll("country").length > 1 || params.getAll("device").length > 1 || params.getAll("searchType").length > 1
    || params.getAll("query").length > 1 || params.getAll("page").length > 1 || params.getAll("minImpressions").length > 1) return null;
  if (country && !/^[a-z]{3}$/.test(country)) return null;
  if (device && !["DESKTOP", "MOBILE", "TABLET"].includes(device)) return null;
  if (searchType && !["web", "image", "video", "news"].includes(searchType)) return null;
  if (queryContains.length > 100 || pageContains.length > 300) return null;
  return {
    ...(country ? { country } : {}),
    ...(device ? { device: device as GscFilters["device"] } : {}),
    ...(searchType ? { searchType: searchType as GscFilters["searchType"] } : {}),
    ...(queryContains ? { queryContains } : {}),
    ...(pageContains ? { pageContains } : {}),
  };
}

export function safeCsvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Normalisasi respons GSC mentah → `GscRow[]` (buang baris kosong). */
export function normalizeGscRows(raw: unknown): GscRow[] {
  if (!raw || typeof raw !== "object") return [];
  const rows = (raw as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        keys: Array.isArray(row.keys) ? row.keys.map((k) => String(k)) : [],
        clicks: Number(row.clicks) || 0,
        impressions: Number(row.impressions) || 0,
        ctr: Number(row.ctr) || 0,
        position: Number(row.position) || 0,
      };
    })
    .filter((r) => r.keys!.length > 0 || r.impressions > 0);
}

/** True for a well-formed Search Analytics response, including omitted rows. */
export function isValidGscResponse(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const rows = (raw as { rows?: unknown }).rows;
  if (rows === undefined) return true;
  if (!Array.isArray(rows)) return false;
  return rows.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return [row.clicks, row.impressions, row.ctr, row.position].every(
      (value) => value !== undefined && Number.isFinite(Number(value)),
    ) && (row.keys === undefined || (Array.isArray(row.keys) && row.keys.every((key) => typeof key === "string")));
  });
}

/** Normalize a single aggregate Search Analytics response row. */
export function normalizeGscSummary(raw: unknown): {
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const rows = (raw as { rows?: unknown }).rows;
  if (rows === undefined) {
    return { clicks: 0, impressions: 0, ctr: 0, averagePosition: 0 };
  }
  if (!Array.isArray(rows)) return null;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return { clicks: 0, impressions: 0, ctr: 0, averagePosition: 0 };
  const clicks = Number(row.clicks);
  const impressions = Number(row.impressions);
  const ctr = Number(row.ctr);
  const averagePosition = Number(row.position);
  if (![clicks, impressions, ctr, averagePosition].every(Number.isFinite)) return null;
  return { clicks, impressions, ctr, averagePosition };
}

/** Map provider status to a safe, stable error code; do not expose response text. */
export function gscErrorCode(status: number): GscErrorCode {
  if (status === 400 || status === 401) return "invalid_credentials";
  if (status === 403) return "permission_denied";
  if (status === 429) return "quota_limited";
  if (status >= 500) return "provider_unavailable";
  return "request_failed";
}

/** Ringkas total dari daftar baris (klik/impresi/CTR rata-rata/posisi rata-rata). */
export function summarizeGsc(rows: readonly GscRow[]): {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
} {
  const clicks = rows.reduce((n, r) => n + r.clicks, 0);
  const impressions = rows.reduce((n, r) => n + r.impressions, 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  // Rata-rata posisi dibobot impresi (lebih bermakna daripada rata-rata polos).
  const weighted = rows.reduce((n, r) => n + r.position * r.impressions, 0);
  const avgPosition = impressions > 0 ? weighted / impressions : 0;
  return { clicks, impressions, ctr, avgPosition };
}
