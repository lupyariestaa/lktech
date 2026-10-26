"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  fetchSeoObservability,
  type SeoObservabilityResponse,
} from "@/lib/admin-settings-api";
import { SEO_FEATURES, SEO_FEATURE_LABEL } from "@/lib/seo-flags-pure";
import { cn } from "@/lib/utils";

/** Format waktu ISO ke lokal; fallback ke teks asli bila tak valid. */
function fmtTime(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("id-ID");
}

/**
 * Panel status & observabilitas SEO (fase D7).
 *
 * Menampilkan status kill switch tiap fitur (`SEO_DISABLED_FEATURES`) dan metrik
 * pemanggilan provider (sukses/gagal, kode error, kuota, latency). Metrik
 * bersifat per-proses server (in-memory): indikator cepat, bukan pengganti
 * monitoring produksi. Tidak ada data sensitif (tanpa query/URL/token).
 */
export function SeoOpsPanel() {
  const [data, setData] = useState<SeoObservabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchSeoObservability());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat observabilitas.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pemuatan awal: hindari `setState` sinkron di dalam effect (react-hooks).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const next = await fetchSeoObservability();
        if (active) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Gagal memuat observabilitas.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const observability = data?.observability;
  const flags = data?.flags;

  return (
    <section
      aria-labelledby="seo-ops-heading"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="seo-ops-heading"
            className="flex items-center gap-1.5 text-sm font-bold text-secondary"
          >
            <Activity className="h-4 w-4" aria-hidden="true" /> Status &amp; observabilitas
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] text-muted">
            Status kill switch tiap fitur dan metrik pemanggilan provider. Angka bersifat
            per-proses (in-memory) dan dapat ter-reset saat instance server didaur ulang — bukan
            pengganti monitoring produksi. Tanpa data sensitif.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Muat ulang observabilitas SEO"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="mt-3 flex items-center gap-3 text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          <span className="text-sm">Memuat status...</span>
        </div>
      ) : (
        <>
          {flags && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {SEO_FEATURES.map((feature) => (
                <li key={feature}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                      flags[feature]
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        flags[feature] ? "bg-emerald-500" : "bg-amber-500",
                      )}
                      aria-hidden="true"
                    />
                    {SEO_FEATURE_LABEL[feature]}: {flags[feature] ? "aktif" : "nonaktif"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {observability && observability.providers.length === 0 ? (
            <p className="mt-4 text-xs text-muted">
              Belum ada pemanggilan provider yang tercatat di proses ini.
            </p>
          ) : observability ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 pr-3 font-medium">Provider</th>
                    <th className="py-2 px-2 text-right font-medium">Sukses</th>
                    <th className="py-2 px-2 text-right font-medium">Gagal</th>
                    <th className="py-2 px-2 font-medium">Kode error</th>
                    <th className="py-2 px-2 text-right font-medium">Kuota</th>
                    <th className="py-2 px-2 text-right font-medium">Latency (ms)</th>
                    <th className="py-2 pl-2 font-medium">Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {observability.providers.map((provider) => (
                    <tr key={provider.provider} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3 font-medium text-secondary">{provider.provider}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-600">
                        {provider.success}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-rose-600">
                        {provider.failure}
                      </td>
                      <td className="py-2 px-2 text-muted">
                        {Object.keys(provider.byErrorCode).length === 0
                          ? "—"
                          : Object.entries(provider.byErrorCode)
                              .map(([code, count]) => `${code}×${count}`)
                              .join(", ")}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-muted">
                        {provider.quotaLimited}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-muted">
                        avg {provider.latencyMs.avg} · max {provider.latencyMs.max}
                      </td>
                      <td className="py-2 pl-2 text-muted">{fmtTime(provider.lastAtISO)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-muted">
                Diperbarui {fmtTime(observability.generatedAtISO)} · cakupan: proses ini
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
