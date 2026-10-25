"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, ExternalLink, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import {
  fetchGa4Report,
  type Ga4Report,
  type Ga4ReportRequest,
} from "@/lib/admin-settings-api";
import { cn } from "@/lib/utils";
import { LineChart } from "@/components/admin/line-chart";
import { GA4_ERROR_MESSAGE, type Ga4ErrorCode } from "@/lib/ga4-pure";
import { safeCsvCell } from "@/lib/search-console-pure";

/** Format angka ringkas (mis. 1.2K). */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function delta(current: number, previous: number): string {
  const change = current - previous;
  if (previous === 0) return change === 0 ? "0" : `+${fmt(change)} (basis sebelumnya 0)`;
  const ratio = (change / previous) * 100;
  return `${change > 0 ? "+" : ""}${fmt(change)} (${ratio > 0 ? "+" : ""}${ratio.toFixed(1)}%)`;
}

/**
 * Panel Google Analytics 4 (fase D6). Sumber data TERPISAH dari Search Console:
 * metrik keterlibatan (tampilan halaman/sesi/pengguna) + maksimum 3 event
 * konversi yang dipilih admin. Hanya agregat — tanpa data pengguna individual.
 */
export function Ga4Panel() {
  const [report, setReport] = useState<Ga4Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(28);
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (options: Ga4ReportRequest) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchGa4Report(options);
      if (id === requestId.current) setReport(next);
    } catch (err) {
      if (id === requestId.current) {
        setError(err instanceof Error ? err.message : "Gagal memuat data GA4.");
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
        const data = await fetchGa4Report({ days: 28 });
        if (active && id === requestId.current) setReport(data);
      } catch (err) {
        if (active && id === requestId.current) {
          setError(err instanceof Error ? err.message : "Gagal memuat data GA4.");
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

  const summary = report?.summary;

  return (
    <section aria-labelledby="ga4-heading" className="mt-8">
      <div className="mb-4">
        <h2 id="ga4-heading" className="text-lg font-bold text-secondary">
          Google Analytics 4
        </h2>
        <p className="mt-1 text-sm text-muted">
          Sumber terpisah dari Search Console: keterlibatan di situs (tampilan halaman, sesi, pengguna)
          dan event konversi terpilih. Angka GA4 tidak digabung dengan angka GSC.
        </p>
      </div>

      {/* Kontrol rentang + refresh */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {[7, 28, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDays(d);
                setCustomRange(null);
                void load({ days: d });
              }}
              aria-pressed={!customRange && days === d}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                !customRange && days === d ? "bg-primary text-white" : "text-slate-600 hover:text-primary",
              )}
            >
              {d} hari
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load(customRange ?? { days })}
          disabled={loading}
          aria-label="Muat ulang data GA4"
          className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-muted">
          Mulai tanggal
          <input
            type="date"
            value={customRange?.startDate ?? ""}
            onChange={(e) => setCustomRange((r) => ({ startDate: e.target.value, endDate: r?.endDate ?? "" }))}
            className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm text-secondary"
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Sampai tanggal
          <input
            type="date"
            value={customRange?.endDate ?? ""}
            onChange={(e) => setCustomRange((r) => ({ startDate: r?.startDate ?? "", endDate: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm text-secondary"
          />
        </label>
        <button
          type="button"
          onClick={() => customRange && void load(customRange)}
          disabled={!customRange?.startDate || !customRange.endDate || loading}
          className="self-end rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Terapkan tanggal
        </button>
        <p className="self-end text-xs text-muted">
          Maksimal 180 hari. GA4 dapat memiliki jeda pemrosesan, jadi hari terakhir dikecualikan.
        </p>
      </div>

      <div className="mt-4">
        {loading && !report ? (
          <div className="flex items-center gap-3 text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Memuat data Google Analytics 4...</span>
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : !report ? (
          <div className="flex items-center gap-3 text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Memuat data Google Analytics 4...</span>
          </div>
        ) : report.status === "not_configured" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Google Analytics 4 belum dikonfigurasi untuk dashboard
            </p>
            <p className="mt-2 text-xs leading-relaxed">
              GA4 tetap berjalan di situs (bila <code>NEXT_PUBLIC_GA_ID</code> diisi). Untuk menampilkan
              metrik di sini, isi env produksi:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              <li><code>GA4_SERVICE_ACCOUNT</code> — JSON service account read-only (satu baris, rahasia).</li>
              <li><code>GA4_PROPERTY_ID</code> — ID numerik properti GA4 (mis. <code>123456789</code>).</li>
              <li><code>GA4_CONVERSION_EVENTS</code> — opsional, maks 3 nama event konversi (dipisah koma).</li>
            </ul>
            <p className="mt-2 text-xs">
              Gunakan kredensial TERPISAH dari Search Console dan beri akses baca (Viewer) pada properti GA4.
            </p>
          </div>
        ) : (
          <>
            {report.status === "error" || report.status === "partial" ? (
              <div role="status" className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <p>
                  {report.status === "partial"
                    ? "Sebagian laporan GA4 gagal dimuat. Bagian yang tersedia tetap ditampilkan."
                    : "Laporan GA4 gagal dimuat. Periksa kredensial/properti, lalu coba lagi."}
                </p>
                {report.errorCode && (
                  <p className="mt-1 text-xs opacity-80">
                    {GA4_ERROR_MESSAGE[report.errorCode as Ga4ErrorCode] ?? "Kode: " + report.errorCode}
                  </p>
                )}
              </div>
            ) : null}
            {report.status === "no_data" && (
              <div role="status" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                GA4 berhasil dihubungi, tetapi belum mengembalikan data untuk rentang ini.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Tampilan halaman" value={summary ? fmt(summary.pageViews) : "—"} tone="emerald" />
              <Metric label="Sesi" value={summary ? fmt(summary.sessions) : "—"} />
              <Metric label="Pengguna aktif" value={summary ? fmt(summary.activeUsers) : "—"} />
              <Metric label="Rasio keterlibatan" value={summary ? pct(summary.engagementRate) : "—"} />
            </div>

            {summary && report.comparisonSummary && (
              <p className="mt-3 text-xs text-muted">
                Dibanding {report.previousRange?.startDate} → {report.previousRange?.endDate}: tampilan halaman{" "}
                {delta(summary.pageViews, report.comparisonSummary.pageViews)}, sesi{" "}
                {delta(summary.sessions, report.comparisonSummary.sessions)}.
              </p>
            )}

            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-bold text-secondary">Tren tampilan halaman</h3>
                <LineChart
                  points={report.trend.map((row) => ({ label: row.date.slice(5), full: row.date, value: row.pageViews }))}
                  formatValue={fmt}
                  ariaLabel="Tren tampilan halaman GA4 per hari"
                  emptyLabel={report.unavailableSections?.includes("trend") ? "Tren gagal dimuat." : "Belum ada data tren."}
                />
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-bold text-secondary">Tren sesi</h3>
                <LineChart
                  points={report.trend.map((row) => ({ label: row.date.slice(5), full: row.date, value: row.sessions }))}
                  formatValue={fmt}
                  accent="#7C3AED"
                  ariaLabel="Tren sesi GA4 per hari"
                  emptyLabel={report.unavailableSections?.includes("trend") ? "Tren gagal dimuat." : "Belum ada data tren."}
                />
              </section>
            </div>

            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <Ga4PagesTable rows={report.topPages} unavailable={report.unavailableSections?.includes("pages") ?? false} />
              <ConvTable
                rows={report.conversions}
                configured={report.conversionEvents}
                unavailable={report.unavailableSections?.includes("conversions") ?? false}
              />
            </div>

            <p className="mt-3 text-[11px] text-muted">
              Data {report.range.startDate} → {report.range.endDate}. Diambil {new Date(report.fetchedAt).toLocaleString("id-ID")}.
              GA4 dapat memakai sampling/thresholding dan memiliki jeda pemrosesan; angka dapat berbeda dari antarmuka GA4.
              Perbedaan definisi berarti angka GA4 tidak boleh dibandingkan langsung dengan GSC.
            </p>
          </>
        )}
      </div>

      <p className="mt-4 text-[11px] text-muted">
        Indikator performa pengalaman (Core Web Vitals) tersedia terpisah melalui Speed Insights Vercel —{" "}
        <a
          href="https://vercel.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          buka dashboard Vercel
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        . CWV bukan faktor peringkat langsung dan sumbernya berbeda dari GA4.
      </p>
    </section>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "emerald" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone === "emerald" ? "text-emerald-600" : "text-secondary")}>
        {value}
      </p>
    </div>
  );
}

function Ga4PagesTable({
  rows,
  unavailable,
}: {
  rows: Ga4Report["topPages"];
  unavailable: boolean;
}) {
  const [sortBy, setSortBy] = useState<"pageViews" | "sessions">("pageViews");
  const [page, setPage] = useState(0);
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b[sortBy] - a[sortBy] || a.path.localeCompare(b.path)),
    [rows, sortBy],
  );
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visiblePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);

  const exportCsv = () => {
    const header = ["Halaman", "Tampilan halaman", "Sesi", "Pengguna aktif"].map(safeCsvCell).join(",");
    const body = sorted.map((r) => [r.path, r.pageViews, r.sessions, r.activeUsers].map(safeCsvCell).join(","));
    const blob = new Blob(["\uFEFF", [header, ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ga4-halaman.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
          <TrendingUp className="h-4 w-4" aria-hidden="true" /> Halaman teratas
        </h3>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!rows.length}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-secondary disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          {unavailable ? "Data halaman gagal dimuat; coba muat ulang." : "Belum ada data halaman pada rentang ini."}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr className="border-b border-slate-100">
                <th className="py-2 pr-3 font-medium">Halaman</th>
                <th className="py-2 px-2 text-right font-medium tabular-nums">
                  <button type="button" onClick={() => { setSortBy("pageViews"); setPage(0); }} aria-pressed={sortBy === "pageViews"}>
                    Tampilan{sortBy === "pageViews" ? " ↓" : ""}
                  </button>
                </th>
                <th className="py-2 pl-2 text-right font-medium tabular-nums">
                  <button type="button" onClick={() => { setSortBy("sessions"); setPage(0); }} aria-pressed={sortBy === "sessions"}>
                    Sesi{sortBy === "sessions" ? " ↓" : ""}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={`${r.path}-${i}`} className="border-b border-slate-50 last:border-0">
                  <td className="max-w-[240px] truncate py-2 pr-3 text-slate-700" title={r.path}>
                    {r.path || "/"}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-secondary">{Math.round(r.pageViews)}</td>
                  <td className="py-2 pl-2 text-right tabular-nums text-muted">{Math.round(r.sessions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>
                {visiblePage * pageSize + 1}–{Math.min((visiblePage + 1) * pageSize, sorted.length)} dari {sorted.length}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage(visiblePage - 1)} disabled={visiblePage === 0} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">
                  Sebelumnya
                </button>
                <button type="button" onClick={() => setPage(visiblePage + 1)} disabled={visiblePage >= pageCount - 1} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ConvTable({
  rows,
  configured,
  unavailable,
}: {
  rows: Ga4Report["conversions"];
  configured: string[];
  unavailable: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-bold text-secondary">Event konversi terpilih</h3>
      <p className="mt-1 text-[11px] text-muted">
        Maksimum 3 event yang dipilih admin. Bukan penggabungan dengan Search Console.
      </p>
      {configured.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          Belum ada event konversi dikonfigurasi (<code>GA4_CONVERSION_EVENTS</code>).
        </p>
      ) : unavailable ? (
        <p className="mt-3 text-xs text-muted">Data event konversi gagal dimuat; coba muat ulang.</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted">Tidak ada event konversi tercatat pada rentang ini.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.eventName} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
              <span className="truncate text-xs font-medium text-secondary" title={row.eventName}>
                {row.eventName}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-secondary">{fmt(row.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
