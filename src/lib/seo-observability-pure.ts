/**
 * Observabilitas SEO MURNI (fase D7) — agregasi metrik operasional per provider
 * dan pembangun log aman. Bebas impor runtime agar dapat diuji.
 *
 * Prinsip:
 * - **Tanpa data sensitif**: hanya provider, status, kode error aman, latency,
 *   dan waktu. Tidak ada query pencarian, URL halaman, email, atau token.
 * - **Tanpa penyimpanan**: registry hidup di memori proses (lihat catatan pada
 *   `src/lib/seo-observability.ts`); tidak menulis ke database.
 */

/** Hasil generik dari pemanggilan provider (cukup untuk observabilitas). */
export type ProviderResult = { ok: true } | { ok: false; error: string };

export type ProviderLatencyStats = {
  count: number;
  min: number;
  max: number;
  avg: number;
};

export type ProviderMetrics = {
  provider: string;
  success: number;
  failure: number;
  /** Jumlah kegagalan per kode error aman. */
  byErrorCode: Record<string, number>;
  /** Berapa kali provider menolak karena kuota/rate limit. */
  quotaLimited: number;
  latencyMs: ProviderLatencyStats;
  lastAtISO?: string;
};

export type ObservabilitySnapshot = {
  generatedAtISO: string;
  /** Cakupan: hanya proses server ini (bukan agregat lintas instance). */
  scope: "process";
  note: string;
  providers: ProviderMetrics[];
};

type MutableMetrics = {
  success: number;
  failure: number;
  byErrorCode: Record<string, number>;
  quotaLimited: number;
  count: number;
  min: number;
  max: number;
  sum: number;
  lastAtISO?: string;
};

export type MetricsRegistry = Map<string, MutableMetrics>;

export const OBSERVABILITY_NOTE =
  "Metrik bersifat per-proses (in-memory), tanpa data sensitif, dan tidak menggantikan monitoring produksi.";

export function createMetricsRegistry(): MetricsRegistry {
  return new Map();
}

function clampLatency(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Catat satu pemanggilan provider. Nama provider dinormalkan (lowercase) dan
 * dibatasi; kode error disimpan apa adanya (sudah berupa kode aman).
 */
export function recordProviderCall(
  registry: MetricsRegistry,
  input: {
    provider: string;
    ok: boolean;
    errorCode?: string;
    latencyMs: number;
    at?: Date;
  },
): void {
  const provider = String(input.provider ?? "").trim().toLowerCase() || "unknown";
  const entry =
    registry.get(provider) ??
    {
      success: 0,
      failure: 0,
      byErrorCode: {},
      quotaLimited: 0,
      count: 0,
      min: 0,
      max: 0,
      sum: 0,
    };
  const latency = clampLatency(input.latencyMs);

  if (input.ok) {
    entry.success += 1;
  } else {
    entry.failure += 1;
    const code = String(input.errorCode ?? "unknown");
    entry.byErrorCode[code] = (entry.byErrorCode[code] ?? 0) + 1;
    if (code === "quota_limited") entry.quotaLimited += 1;
  }

  entry.count += 1;
  entry.sum += latency;
  entry.min = entry.count === 1 ? latency : Math.min(entry.min, latency);
  entry.max = Math.max(entry.max, latency);
  entry.lastAtISO = (input.at ?? new Date()).toISOString();

  registry.set(provider, entry);
}

/** Snapshot metrik yang sudah dinormalisasi & terurut (aman untuk JSON). */
export function snapshotMetrics(registry: MetricsRegistry, at?: Date): ObservabilitySnapshot {
  const providers: ProviderMetrics[] = [];
  for (const [provider, entry] of registry) {
    providers.push({
      provider,
      success: entry.success,
      failure: entry.failure,
      byErrorCode: { ...entry.byErrorCode },
      quotaLimited: entry.quotaLimited,
      latencyMs: {
        count: entry.count,
        min: entry.min,
        max: entry.max,
        avg: entry.count > 0 ? Math.round(entry.sum / entry.count) : 0,
      },
      ...(entry.lastAtISO ? { lastAtISO: entry.lastAtISO } : {}),
    });
  }
  providers.sort((a, b) => a.provider.localeCompare(b.provider));
  return {
    generatedAtISO: (at ?? new Date()).toISOString(),
    scope: "process",
    note: OBSERVABILITY_NOTE,
    providers,
  };
}

/** Nama event observability untuk pemanggilan provider SEO. */
export const SEO_PROVIDER_LOG_EVENT = "seo.provider_call";

/**
 * Bangun properti log AMAN untuk satu pemanggilan provider (dipakai bersama
 * `logEvent`). Kunci dibatasi agar detail permintaan (query/URL/token) tidak
 * pernah ikut tercatat. Nama event TIDAK disertakan di sini karena menjadi
 * argumen `logEvent` (menghindari duplikasi `event` pada JSON log).
 */
export function buildProviderLogEvent(input: {
  provider: string;
  ok: boolean;
  errorCode?: string;
  latencyMs: number;
}): Record<string, string | number | boolean> {
  return {
    provider: String(input.provider ?? "").trim().toLowerCase() || "unknown",
    ok: input.ok,
    ...(input.ok ? {} : { errorCode: String(input.errorCode ?? "unknown") }),
    latencyMs: clampLatency(input.latencyMs),
  };
}
