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

/** Rentang tanggal ISO (yyyy-mm-dd) untuk N hari terakhir, dari `now`. */
export function dateRange(days: number, now: Date): { startDate: string; endDate: string } {
  const safeDays = Math.min(Math.max(Math.floor(days) || 28, 1), 180);
  const end = new Date(now);
  const start = new Date(now);
  // -1 hari karena GSC sering belum punya data hari ini (lag).
  end.setUTCDate(end.getUTCDate() - 1);
  start.setUTCDate(start.getUTCDate() - safeDays);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
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
  const rows = (raw as { rows?: unknown })?.rows;
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
