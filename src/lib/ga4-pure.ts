/**
 * Logika MURNI Google Analytics 4 (fase D6) — bebas impor runtime agar dapat
 * diuji dengan `node --experimental-strip-types`.
 *
 * Mencakup: validasi properti/rentang tanggal, pembangun body `runReport`,
 * normalisasi respons, kode error aman, status laporan, parsing nama event
 * konversi, dan redaksi rahasia untuk log.
 *
 * Prinsip:
 * - **Pemisahan sumber**: GA4 adalah sumber TERPISAH dari Search Console;
 *   tidak ada penggabungan angka yang menyamarkan asal data.
 * - **Tanpa PII**: laporan memakai agregat (pageviews/sesi/pengguna/event),
 *   bukan data pengguna individual.
 * - **Batas eksplisit**: setiap batas (rentang, jumlah event konversi) terlihat
 *   dan divalidasi ulang di server.
 */

/** Status laporan GA4 (mirror gaya GSC, agar konsisten di UI). */
export type Ga4Status = "not_configured" | "connected" | "no_data" | "partial" | "error";

/** Kode error aman yang boleh tampil ke admin (tanpa payload provider). */
export type Ga4ErrorCode =
  | "invalid_credentials"
  | "permission_denied"
  | "quota_limited"
  | "provider_unavailable"
  | "request_timeout"
  | "invalid_response"
  | "request_failed";

/** Satu baris hasil `runReport` (dimensi berupa string, metrik berupa angka). */
export type Ga4Row = {
  dimensions: string[];
  metrics: number[];
};

/** Rentang tanggal inklusif (yyyy-mm-dd). */
export type Ga4Range = { startDate: string; endDate: string };

/**
 * GA4 memproses data dengan jeda; kecualikan hari terakhir yang belum matang.
 * Berbeda dari GSC (3 hari) karena pipeline GA4 umumnya lebih cepat, tetapi
 * tetap tidak dijamin selesai — keterbatasan ini ditampilkan di UI.
 */
export const GA4_DATA_LAG_DAYS = 1;

export const GA4_DEFAULT_RANGE_DAYS = 28;
export const GA4_MAX_RANGE_DAYS = 180;

/** Metrik keterlibatan yang dipakai ringkasan & tren. */
export const GA4_SUMMARY_METRICS = [
  "screenPageViews",
  "sessions",
  "activeUsers",
  "engagedSessions",
  "engagementRate",
] as const;

export type Ga4SummaryMetric = (typeof GA4_SUMMARY_METRICS)[number];

/** Label tampilan metrik GA4 (Bahasa Indonesia). */
export const GA4_METRIC_LABEL: Record<string, string> = {
  screenPageViews: "Tampilan halaman",
  sessions: "Sesi",
  activeUsers: "Pengguna aktif",
  engagedSessions: "Sesi terlibat",
  engagementRate: "Rasio keterlibatan",
  eventCount: "Jumlah event",
};

/**
 * Maksimum event konversi yang boleh dipilih. Sengaja kecil: hanya event yang
 * benar-benar dipakai keputusan bisnis, dan minimalkan data yang diambil.
 */
export const MAX_CONVERSION_EVENTS = 3;

/** Nama event GA4: huruf awal, lalu huruf/angka/underscore (≤40, aturan GA4). */
export const GA4_EVENT_NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function validDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Normalisasi ID properti GA4: buang prefix `properties/`, wajib numerik. */
export function normalizePropertyId(raw: string | undefined | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const id = value.replace(/^properties\//i, "").trim();
  return /^\d{1,20}$/.test(id) ? id : null;
}

/**
 * Resolusi rentang tanggal GA4. Perilaku mirror `resolveReportRange` GSC:
 * - rentang kustom inklusif, maksimum `GA4_MAX_RANGE_DAYS`, tanggal akhir tidak
 *   melewati jeda data;
 * - preset `days` di-clamp 1..180.
 * Mengembalikan `null` bila tidak valid.
 */
export function resolveGa4Range(input: {
  days?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  now: Date;
}): Ga4Range | null {
  const start = typeof input.startDate === "string" ? input.startDate : "";
  const end = typeof input.endDate === "string" ? input.endDate : "";
  if (start || end) {
    if (!validDay(start) || !validDay(end) || start > end) return null;
    const latest = new Date(input.now);
    latest.setUTCHours(0, 0, 0, 0);
    latest.setUTCDate(latest.getUTCDate() - GA4_DATA_LAG_DAYS);
    if (end > latest.toISOString().slice(0, 10)) return null;
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T00:00:00.000Z`);
    const spanDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (spanDays > GA4_MAX_RANGE_DAYS) return null;
    return { startDate: start, endDate: end };
  }
  const days = input.days === undefined ? GA4_DEFAULT_RANGE_DAYS : Number(input.days);
  const safeDays = Math.min(Math.max(Math.floor(days) || GA4_DEFAULT_RANGE_DAYS, 1), GA4_MAX_RANGE_DAYS);
  const rangeEnd = new Date(input.now);
  rangeEnd.setUTCHours(0, 0, 0, 0);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() - GA4_DATA_LAG_DAYS);
  const startDate = new Date(rangeEnd);
  startDate.setUTCDate(startDate.getUTCDate() - (safeDays - 1));
  return { startDate: startDate.toISOString().slice(0, 10), endDate: rangeEnd.toISOString().slice(0, 10) };
}

/** Periode pembanding setara sebelumnya (panjang sama, tanpa tumpang tindih). */
export function previousGa4Range(range: Ga4Range): Ga4Range {
  const start = new Date(`${range.startDate}T00:00:00.000Z`);
  const end = new Date(`${range.endDate}T00:00:00.000Z`);
  const span = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  end.setUTCDate(end.getUTCDate() - span);
  start.setUTCDate(start.getUTCDate() - span);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

/**
 * Parse daftar event konversi dari string env (dipisah koma). Buang nama tidak
 * valid/duplikat, jaga urutan, dan batasi `MAX_CONVERSION_EVENTS`.
 */
export function parseConversionEvents(raw: string | undefined | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw ?? "").split(",")) {
    const name = part.trim();
    if (!name || !GA4_EVENT_NAME_RE.test(name) || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= MAX_CONVERSION_EVENTS) break;
  }
  return out;
}

/** Batas baris permintaan (dibatasi ulang agar tidak berlebihan). */
export const GA4_MAX_ROW_LIMIT = 250_000;

/**
 * Body permintaan `properties.runReport`. `limit` dikirim sebagai string karena
 * GA4 memperlakukannya sebagai int64.
 */
export function buildRunReportBody(options: {
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions?: string[];
  limit?: number;
  orderBys?: Array<{ metric?: string; dimension?: string; desc?: boolean }>;
  /** Bila diisi, hanya baris dengan `eventName` di daftar ini. */
  eventNames?: string[];
}): Record<string, unknown> {
  const rawLimit = options.limit === undefined ? 25 : Number(options.limit);
  const safeLimit = Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 25;
  const body: Record<string, unknown> = {
    dateRanges: [{ startDate: options.startDate, endDate: options.endDate }],
    metrics: options.metrics.map((name) => ({ name })),
    limit: String(Math.min(Math.max(safeLimit, 1), GA4_MAX_ROW_LIMIT)),
  };
  if (options.dimensions?.length) {
    body.dimensions = options.dimensions.map((name) => ({ name }));
  }
  if (options.orderBys?.length) {
    body.orderBys = options.orderBys.map((order) => ({
      ...(order.metric ? { metric: { metricName: order.metric } } : {}),
      ...(order.dimension ? { dimension: { dimensionName: order.dimension } } : {}),
      desc: order.desc ?? false,
    }));
  }
  if (options.eventNames?.length) {
    body.dimensionFilter = {
      filter: { fieldName: "eventName", inListFilter: { values: options.eventNames } },
    };
  }
  return body;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** True untuk respons `runReport` yang berbentuk benar (termasuk tanpa baris). */
export function isValidGa4Response(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const rows = (raw as { rows?: unknown }).rows;
  if (rows === undefined) return true;
  if (!Array.isArray(rows)) return false;
  return rows.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    const dimensionValues = row.dimensionValues;
    const metricValues = row.metricValues;
    const dimsOk =
      dimensionValues === undefined ||
      (Array.isArray(dimensionValues) &&
        dimensionValues.every((d) => d && typeof d === "object" && "value" in (d as object)));
    const metricsOk =
      Array.isArray(metricValues) &&
      metricValues.every((m) => m && typeof m === "object" && Number.isFinite(Number((m as { value?: unknown }).value)));
    return dimsOk && metricsOk;
  });
}

/** Normalisasi respons `runReport` mentah → `Ga4Row[]` (buang baris tanpa metrik). */
export function normalizeGa4Rows(raw: unknown): Ga4Row[] {
  if (!raw || typeof raw !== "object") return [];
  const rows = (raw as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const dimensions = Array.isArray(row.dimensionValues)
        ? row.dimensionValues.map((d) => String((d as { value?: unknown })?.value ?? ""))
        : [];
      const metrics = Array.isArray(row.metricValues)
        ? row.metricValues.map((m) => toNumber((m as { value?: unknown })?.value))
        : [];
      return { dimensions, metrics };
    })
    .filter((row) => row.metrics.length > 0);
}

export type Ga4Summary = {
  pageViews: number;
  sessions: number;
  activeUsers: number;
  engagedSessions: number;
  engagementRate: number;
};

/**
 * Normalisasi baris ringkasan tunggal (tanpa dimensi). Respons tanpa `rows`
 * adalah laporan kosong yang VALID → nol, sedangkan bentuk rusak → `null`.
 */
export function normalizeGa4Summary(raw: unknown): Ga4Summary | null {
  if (!raw || typeof raw !== "object") return null;
  const rows = (raw as { rows?: unknown }).rows;
  if (rows === undefined) {
    return { pageViews: 0, sessions: 0, activeUsers: 0, engagedSessions: 0, engagementRate: 0 };
  }
  if (!Array.isArray(rows)) return null;
  const first = rows[0] as Record<string, unknown> | undefined;
  if (!first) {
    return { pageViews: 0, sessions: 0, activeUsers: 0, engagedSessions: 0, engagementRate: 0 };
  }
  const values = Array.isArray(first.metricValues)
    ? first.metricValues.map((m) => Number((m as { value?: unknown })?.value))
    : [];
  if (values.length < GA4_SUMMARY_METRICS.length || !values.every(Number.isFinite)) return null;
  return {
    pageViews: values[0],
    sessions: values[1],
    activeUsers: values[2],
    engagedSessions: values[3],
    engagementRate: values[4],
  };
}

/** Map status provider ke kode error aman, tanpa mengekspos teks respons. */
export function ga4ErrorCode(status: number): Ga4ErrorCode {
  if (status === 400 || status === 401) return "invalid_credentials";
  if (status === 403) return "permission_denied";
  if (status === 429) return "quota_limited";
  if (status >= 500) return "provider_unavailable";
  return "request_failed";
}

/** Status laporan turunan dari keberhasilan bagian-bagiannya. */
export function ga4Status(input: {
  configured: boolean;
  failureCount: number;
  requiredCount?: number;
  hasData: boolean;
}): Ga4Status {
  if (!input.configured) return "not_configured";
  const required = input.requiredCount ?? 3;
  if (input.failureCount >= required) return "error";
  if (input.failureCount > 0) return "partial";
  return input.hasData ? "connected" : "no_data";
}

/** Pesan aman per kode error (tanpa URL/token/detail provider). */
export const GA4_ERROR_MESSAGE: Record<Ga4ErrorCode, string> = {
  invalid_credentials: "Kredensial GA4 tidak valid. Periksa JSON service account.",
  permission_denied: "Service account tidak punya akses ke properti GA4 ini.",
  quota_limited: "Kuota GA4 Data API tercapai. Coba lagi nanti.",
  provider_unavailable: "Layanan GA4 sedang tidak tersedia. Coba lagi nanti.",
  request_timeout: "Permintaan ke GA4 melewati batas waktu.",
  invalid_response: "Respons GA4 tidak dapat dibaca.",
  request_failed: "Permintaan ke GA4 gagal.",
};

/**
 * Redaksi rahasia sebelum menulis ke log: kunci privat/token/`Bearer`.
 * Tidak pernah menampilkan atau mencatat secret apa pun.
 */
export function redactSecrets(text: string): string {
  let out = String(text ?? "");
  out = out.replace(
    /("(?:private_key|access_token|client_secret|refresh_token|id_token)"\s*:\s*)"[^"]*"/gi,
    '$1"[redacted]"',
  );
  out = out.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[redacted private key]");
  out = out.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]");
  return out;
}
