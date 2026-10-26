import "server-only";
import {
  SEO_PROVIDER_LOG_EVENT,
  buildProviderLogEvent,
  createMetricsRegistry,
  recordProviderCall,
  snapshotMetrics,
  type MetricsRegistry,
  type ObservabilitySnapshot,
  type ProviderResult,
} from "@/lib/seo-observability-pure";
import { logEvent } from "@/lib/observability";

/**
 * Observabilitas SEO server-side (fase D7).
 *
 * Registry hidup **per proses** (in-memory). Di lingkungan serverless, tiap
 * instance dapat memiliki salinan sendiri dan instance dapat didaur ulang, jadi
 * angka ini adalah indikator cepat — bukan pengganti monitoring produksi
 * (Sentry/log platform). Tidak ada data sensitif dan tidak ada penyimpanan.
 */
const registry: MetricsRegistry = createMetricsRegistry();

/** Snapshot metrik proses ini (aman untuk JSON, tanpa secret). */
export function getObservabilitySnapshot(): ObservabilitySnapshot {
  return snapshotMetrics(registry);
}

/**
 * Jalankan pemanggilan provider sambil mencatat hasil, latency, dan kode error
 * aman. Log hanya pada kegagalan, dengan event yang sudah dibatasi.
 */
export async function observeProvider<T extends ProviderResult>(
  provider: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  const result = await fn();
  const latencyMs = Date.now() - startedAt;
  const errorCode = result.ok ? undefined : result.error;

  recordProviderCall(registry, { provider, ok: result.ok, errorCode, latencyMs });
  if (!result.ok) {
    // Log terstruktur satu baris dengan tag `[obs]` (fase P6) agar konsisten
    // dengan event server lain dan mudah difilter di log Vercel/Sentry.
    logEvent(
      SEO_PROVIDER_LOG_EVENT,
      buildProviderLogEvent({ provider, ok: false, errorCode, latencyMs }),
    );
  }
  return result;
}
