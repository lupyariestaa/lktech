"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, ExternalLink, Loader2, RefreshCw, Search, TrendingUp } from "lucide-react";
import { fetchSeoReport, type GscRow, type SearchConsoleReport, type SeoReportRequest } from "@/lib/admin-settings-api";
import { cn } from "@/lib/utils";
import { LineChart } from "@/components/admin/line-chart";
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
 * Panel SEO (Search Console) — fase S6. Menampilkan query & halaman teratas
 * dari Google Search Console. Fail-safe: bila belum dikonfigurasi, tampilkan
 * panduan setup (bukan error).
 */
export function SeoDashboard() {
  const [report, setReport] = useState<SearchConsoleReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(28);
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [filters, setFilters] = useState<Pick<SeoReportRequest, "country" | "device" | "searchType" | "query" | "page">>({ searchType: "web" });
  const requestId = useRef(0);

  const load = useCallback(async (options: SeoReportRequest) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchSeoReport(options);
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
        const data = await fetchSeoReport({ days: 28, searchType: "web" });
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
    setCustomRange(null);
    void load({ days: d, ...filters });
  };

  const applyCustomRange = () => {
    if (!customRange) return;
    void load({ ...customRange, ...filters });
  };
  const applyFilters = (next: typeof filters) => {
    setFilters(next);
    void load({ ...(customRange ?? { days }), ...next });
  };
  const exportCsv = (rows: GscRow[], label: string) => {
    const header = ["Item", "Klik", "Impresi", "CTR", "Posisi"].map(safeCsvCell).join(",");
    const body = rows.map((row) => [row.keys?.[0] ?? "", row.clicks, row.impressions, row.ctr, row.position].map(safeCsvCell).join(","));
    const blob = new Blob(["\uFEFF", [header, ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gsc-${label}-${report?.range.startDate ?? "range"}-${report?.range.endDate ?? ""}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
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
          onClick={() => load({ ...(customRange ?? { days }), ...filters })}
          disabled={loading}
          aria-label="Muat ulang data SEO"
          className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-muted">Mulai tanggal
          <input type="date" value={customRange?.startDate ?? ""} onChange={(e) => setCustomRange((r) => ({ startDate: e.target.value, endDate: r?.endDate ?? "" }))} className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm text-secondary" />
        </label>
        <label className="text-xs font-medium text-muted">Sampai tanggal
          <input type="date" value={customRange?.endDate ?? ""} onChange={(e) => setCustomRange((r) => ({ startDate: r?.startDate ?? "", endDate: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm text-secondary" />
        </label>
        <button type="button" onClick={applyCustomRange} disabled={!customRange?.startDate || !customRange.endDate || loading} className="self-end rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Terapkan tanggal</button>
        <p className="self-end text-xs text-muted">Maksimal 180 hari; tanggal akhir minimal 3 hari sebelum hari ini. CSV berisi hingga 100 baris teratas.</p>
        <input value={filters.country ?? ""} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value || undefined }))} placeholder="Negara (kode ISO 3 huruf)" className="rounded-lg border border-slate-200 p-2 text-sm" />
        <select value={filters.device ?? ""} onChange={(e) => setFilters((f) => ({ ...f, device: (e.target.value || undefined) as SeoReportRequest["device"] }))} className="rounded-lg border border-slate-200 p-2 text-sm"><option value="">Semua perangkat</option><option value="DESKTOP">Desktop</option><option value="MOBILE">Mobile</option><option value="TABLET">Tablet</option></select>
        <select value={filters.searchType ?? "web"} onChange={(e) => setFilters((f) => ({ ...f, searchType: e.target.value as SeoReportRequest["searchType"] }))} className="rounded-lg border border-slate-200 p-2 text-sm"><option value="web">Web</option><option value="image">Image</option><option value="video">Video</option><option value="news">News</option></select>
        <button type="button" onClick={() => { setFilters({}); void load(customRange ?? { days }); }} className="rounded-lg border border-slate-200 p-2 text-sm text-secondary">Reset filter</button>
        <input value={filters.query ?? ""} onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value || undefined }))} placeholder="Query mengandung…" className="rounded-lg border border-slate-200 p-2 text-sm" />
        <input value={filters.page ?? ""} onChange={(e) => setFilters((f) => ({ ...f, page: e.target.value || undefined }))} placeholder="URL mengandung…" className="rounded-lg border border-slate-200 p-2 text-sm" />
        <button type="button" onClick={() => applyFilters(filters)} disabled={loading} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">Terapkan filter</button>
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

          {summary && report.comparisonSummary && (
            <p className="text-xs text-muted">
              Dibanding {report.previousRange?.startDate} → {report.previousRange?.endDate}: klik {delta(summary.clicks, report.comparisonSummary.clicks)}, impresi {delta(summary.impressions, report.comparisonSummary.impressions)}.
            </p>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-secondary">Tren klik harian</h2>
            <LineChart
              points={report.trend.map((row) => ({ label: row.keys?.[0]?.slice(5) ?? "", full: row.keys?.[0] ?? "", value: row.clicks }))}
              formatValue={fmt}
              ariaLabel="Tren klik Search Console per hari"
              emptyLabel={report.unavailableSections?.includes("trend") ? "Tren gagal dimuat." : "Belum ada data tren."}
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <RowTable
              title="Query teratas"
              icon={<Search className="h-4 w-4" aria-hidden="true" />}
              rows={report.topQueries}
              onExport={() => exportCsv(report.topQueries, "queries")}
              emptyHint={report.unavailableSections?.includes("queries")
                ? "Data query gagal dimuat; coba muat ulang."
                : "Belum ada data query pada rentang ini."}
            />
            <RowTable
              title="Halaman teratas"
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
              rows={report.topPages}
              onExport={() => exportCsv(report.topPages, "pages")}
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
  onExport,
}: {
  title: string;
  icon: React.ReactNode;
  rows: GscRow[];
  emptyHint: string;
  isUrl?: boolean;
  onExport: () => void;
}) {
  const [sortBy, setSortBy] = useState<"clicks" | "impressions" | "position">("clicks");
  const [page, setPage] = useState(0);
  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const difference = sortBy === "position" ? a.position - b.position : b[sortBy] - a[sortBy];
    return difference || (a.keys?.[0] ?? "").localeCompare(b.keys?.[0] ?? "");
  }), [rows, sortBy]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visiblePage = Math.min(page, pageCount - 1);
  const pageRows = sortedRows.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">{icon} {title}</h2>
        <button type="button" onClick={onExport} disabled={!rows.length} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-secondary disabled:opacity-50"><Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV</button>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted">{emptyHint}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr className="border-b border-slate-100">
                <th className="py-2 pr-3 font-medium">{isUrl ? "Halaman" : "Query"}</th>
                <th className="py-2 px-2 text-right font-medium tabular-nums"><button type="button" onClick={() => { setSortBy("clicks"); setPage(0); }} aria-pressed={sortBy === "clicks"}>Klik{sortBy === "clicks" ? " ↓" : ""}</button></th>
                <th className="py-2 px-2 text-right font-medium tabular-nums"><button type="button" onClick={() => { setSortBy("impressions"); setPage(0); }} aria-pressed={sortBy === "impressions"}>Impresi{sortBy === "impressions" ? " ↓" : ""}</button></th>
                <th className="py-2 pl-2 text-right font-medium tabular-nums"><button type="button" onClick={() => { setSortBy("position"); setPage(0); }} aria-pressed={sortBy === "position"}>Posisi{sortBy === "position" ? " ↑" : ""}</button></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => {
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
          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{visiblePage * pageSize + 1}–{Math.min((visiblePage + 1) * pageSize, sortedRows.length)} dari {sortedRows.length}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage(visiblePage - 1)} disabled={visiblePage === 0} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">Sebelumnya</button>
                <button type="button" onClick={() => setPage(visiblePage + 1)} disabled={visiblePage >= pageCount - 1} className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40">Berikutnya</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
