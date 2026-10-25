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
  const safeDays = Math.min(Math.max(Math.floor(days) || 28, 1), 180);
  const end = new Date(now);
  const start = new Date(now);
  // -3 hari: GSC performance data lazim tertunda 2–3 hari.
  end.setUTCDate(end.getUTCDate() - 3);
  start.setTime(end.getTime());
  start.setUTCDate(start.getUTCDate() - (safeDays - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
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

/** Body permintaan `searchanalytics.query` (top queries/pages). */
export function buildQueryBody(options: {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
}): Record<string, unknown> {
  return {
    startDate: options.startDate,
    endDate: options.endDate,
    dimensions: options.dimensions,
    rowLimit: Math.min(Math.max(options.rowLimit ?? 25, 1), 100),
  };
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
