"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, RefreshCw, Search, TrendingUp } from "lucide-react";
import { fetchSeoReport, type GscRow, type SearchConsoleReport } from "@/lib/admin-settings-api";
import { cn } from "@/lib/utils";

/** Format angka ringkas (mis. 1.2K). */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

/**
 * Panel SEO (Search Console) — fase S6. Menampilkan query & halaman teratas
 * dari Google Search Console. Fail-safe: bila belum dikonfigurasi, tampilkan
 * panduan setup (bukan error).
 */
export function SeoDashboard() {
  const [report, setReport] = useState<SearchConsoleReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(28);
  const requestId = useRef(0);

  const load = useCallback(async (d: number) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchSeoReport(d);
      if (id === requestId.current) setReport(next);
    } catch (err) {
      if (id === requestId.current) {
        setError(err instanceof Error ? err.message : "Gagal memuat data.");
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const id = ++requestId.current;
    (async () => {
      try {
        const data = await fetchSeoReport(28);
        if (active && id === requestId.current) setReport(data);
      } catch (err) {
        if (active && id === requestId.current) {
          setError(err instanceof Error ? err.message : "Gagal memuat data.");
        }
      } finally {
        if (active && id === requestId.current) setLoading(false);
      }
    })();
    return () => {
      active = false;
      requestId.current += 1;
    };
  }, []);

  const onRange = (d: number) => {
    setDays(d);
    void load(d);
  };

  const summary = report?.summary;

  return (
    <div className="flex flex-col gap-5">
      {/* Kontrol rentang + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {[7, 28, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onRange(d)}
              aria-pressed={days === d}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                days === d ? "bg-primary text-white" : "text-slate-600 hover:text-primary",
              )}
            >
              {d} hari
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => load(days)}
          disabled={loading}
          aria-label="Muat ulang data SEO"
          className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </div>

      {loading && !report ? (
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Memuat data Search Console…</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : !report ? (
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Memuat data Search Console…</span>
        </div>
      ) : report.status === "not_configured" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Search Console belum dikonfigurasi
          </p>
          <p className="mt-2 text-xs leading-relaxed">
            Untuk menampilkan data klik/impresi & query teratas, isi env produksi:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li><code>GSC_SERVICE_ACCOUNT</code> — JSON service account (satu baris).</li>
            <li><code>GSC_SITE_URL</code> — properti GSC (mis. <code>https://lktech.id/</code> atau <code>sc-domain:lktech.id</code>).</li>
          </ul>
          <p className="mt-2 text-xs">
            Beri akses service account sebagai <em>pengguna</em> di properti Search Console.
            Atur service account read-only dan properti GSC pada environment server.
          </p>
        </div>
      ) : (
        <>
          {/* Ringkasan */}
          {(report.status === "error" || report.status === "partial") && (
            <ReportNotice
              status={report.status}
              code={report.errorCode}
            />
          )}
          {report.status === "no_data" && (
            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Search Console berhasil dihubungi, tetapi belum mengembalikan data untuk rentang ini.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Klik" value={summary ? fmt(summary.clicks) : "—"} tone="emerald" />
            <Metric label="Impresi" value={summary ? fmt(summary.impressions) : "—"} />
            <Metric label="CTR" value={summary ? pct(summary.ctr) : "—"} />
            <Metric
              label="Posisi rata-rata"
              value={summary ? summary.averagePosition.toFixed(1) : "—"}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <RowTable
              title="Query teratas"
              icon={<Search className="h-4 w-4" aria-hidden="true" />}
              rows={report.topQueries}
              emptyHint={report.unavailableSections?.includes("queries")
                ? "Data query gagal dimuat; coba muat ulang."
                : "Belum ada data query pada rentang ini."}
            />
            <RowTable
              title="Halaman teratas"
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
              rows={report.topPages}
              emptyHint={report.unavailableSections?.includes("pages")
                ? "Data halaman gagal dimuat; coba muat ulang."
                : "Belum ada data halaman pada rentang ini."}
              isUrl
            />
          </div>
          <p className="text-[11px] text-muted">
            Data {report.range.startDate} → {report.range.endDate}. Diambil {new Date(report.fetchedAt).toLocaleString("id-ID")}. Search Console dapat memiliki jeda beberapa hari.
          </p>
        </>
      )}
    </div>
  );
}

function ReportNotice({
  status,
  code,
}: {
  status: "error" | "partial";
  code?: string;
}) {
  const message = status === "partial"
    ? "Sebagian laporan gagal dimuat. Angka atau tabel yang tersedia ditandai; muat ulang nanti."
    : "Laporan Search Console gagal dimuat. Periksa akses service account, properti, API, lalu coba lagi.";
  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      <p>{message}</p>
      {code && <p className="mt-1 text-xs opacity-80">Kode: {code}</p>}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "emerald" ? "text-emerald-600" : "text-secondary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RowTable({
  title,
  icon,
  rows,
  emptyHint,
  isUrl = false,
}: {
  title: string;
  icon: React.ReactNode;
  rows: GscRow[];
  emptyHint: string;
  isUrl?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
        {icon} {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted">{emptyHint}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr className="border-b border-slate-100">
                <th className="py-2 pr-3 font-medium">{isUrl ? "Halaman" : "Query"}</th>
                <th className="py-2 px-2 text-right font-medium tabular-nums">Klik</th>
                <th className="py-2 px-2 text-right font-medium tabular-nums">Impresi</th>
                <th className="py-2 pl-2 text-right font-medium tabular-nums">Posisi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const key = r.keys?.[0] ?? "—";
                return (
                  <tr key={`${key}-${i}`} className="border-b border-slate-50 last:border-0">
                    <td className="max-w-[220px] truncate py-2 pr-3 text-slate-700" title={key}>
                      {isUrl ? (
                        <a
                          href={key}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {key.replace(/^https?:\/\/[^/]+/, "") || "/"}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : (
                        key
                      )}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-secondary">{Math.round(r.clicks)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-muted">{Math.round(r.impressions)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums text-muted">{r.position.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
