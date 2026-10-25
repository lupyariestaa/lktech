"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Play, RefreshCw, ShieldCheck } from "lucide-react";
import {
  fetchLatestSeoAudit,
  runSeoAudit,
  type SeoAuditLatestResponse,
} from "@/lib/admin-settings-api";
import { cn } from "@/lib/utils";
import {
  AUDIT_INVENTORY_GROUPS,
  pageSeverity,
  SEO_AUDIT_ISSUE_LABEL,
  type AuditInventoryGroup,
  type SeoAuditPage,
  type SeoAuditReport,
  type SeoAuditSeverity,
} from "@/lib/seo-audit-pure";

const SEVERITY_LABEL: Record<SeoAuditSeverity, string> = {
  critical: "Kritis",
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

const SEVERITY_CLASS: Record<SeoAuditSeverity, string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

function SeverityBadge({ severity }: { severity: SeoAuditSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        SEVERITY_CLASS[severity],
      )}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

/**
 * Panel AUDIT SEO TEKNIS (fase D4) — inventaris URL publik, crawler internal
 * on-demand, dan daftar masalah yang dapat diverifikasi. Tidak mengubah konten
 * apa pun dan tidak menyimpulkan status indexing Google.
 */
export function SeoAuditPanel() {
  const [report, setReport] = useState<SeoAuditReport | null>(null);
  const [meta, setMeta] = useState<{ createdAt: string; actor: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<AuditInventoryGroup[]>([]);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const latest: SeoAuditLatestResponse = await fetchLatestSeoAudit();
      if (latest.available) {
        setReport(latest.report);
        setMeta({ createdAt: latest.createdAt, actor: latest.actor });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat hasil audit.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const latest: SeoAuditLatestResponse = await fetchLatestSeoAudit();
        if (!active) return;
        if (latest.available) {
          setReport(latest.report);
          setMeta({ createdAt: latest.createdAt, actor: latest.actor });
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat hasil audit.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runSeoAudit({ groups: groups.length > 0 ? groups : undefined, save: true });
      setReport(res.report);
      setMeta({ createdAt: res.report.finishedAt, actor: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit gagal dijalankan.");
    } finally {
      setRunning(false);
    }
  };

  const toggleGroup = (group: AuditInventoryGroup) => {
    setGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const summary = report?.summary;

  const pagesByImpact = useMemo(() => (report ? report.pages : []), [report]);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Audit SEO teknis (on-demand)
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] text-muted">
            Memeriksa URL publik dari inventaris situs (sitemap, artikel, produk, layanan, kota,
            portofolio, kategori/tag) lewat crawler internal same-origin. Tidak mengubah konten dan
            tidak menyimpulkan status indexing Google.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadLatest()}
            disabled={loading || running}
            aria-label="Muat ulang hasil audit terakhir"
            className="rounded-lg border border-slate-200 p-2 text-secondary disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {running ? "Menjalankan audit..." : "Jalankan audit"}
          </button>
        </div>
      </div>

      <fieldset className="mt-3">
        <legend className="text-[11px] font-medium text-muted">
          Batasi grup (kosong = semua)
        </legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {AUDIT_INVENTORY_GROUPS.map((group) => {
            const active = groups.includes(group);
            return (
              <button
                key={group}
                type="button"
                onClick={() => toggleGroup(group)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-200 text-secondary hover:border-primary/40",
                )}
              >
                {group}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-xs text-rose-600">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
        </p>
      )}

      {loading && !report && (
        <div className="mt-4 flex items-center gap-2 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span className="text-sm">Memuat hasil audit terakhir...</span>
        </div>
      )}

      {!loading && !report && !error && (
        <p className="mt-4 text-xs text-muted">
          Belum ada hasil audit tersimpan. Jalankan audit untuk memeriksa inventaris URL publik.
        </p>
      )}

      {report && summary && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="URL diperiksa" value={String(summary.pages)} />
            <Stat label="Tanpa masalah" value={String(summary.ok)} tone="emerald" />
            <Stat label="Ada masalah" value={String(summary.withIssues)} />
            <Stat label="Error HTTP/gagal" value={String(summary.errors)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity="critical" /> <span className="text-xs text-secondary">{summary.bySeverity.critical}</span>
            <SeverityBadge severity="high" /> <span className="text-xs text-secondary">{summary.bySeverity.high}</span>
            <SeverityBadge severity="medium" /> <span className="text-xs text-secondary">{summary.bySeverity.medium}</span>
            <SeverityBadge severity="low" /> <span className="text-xs text-secondary">{summary.bySeverity.low}</span>
          </div>

          <p className="text-[11px] text-muted">
            Aturan v{report.ruleVersion} · inventaris {report.inventorySize} URL
            {report.truncated && " (dipotong karena batas)"} · sitemap{" "}
            {report.sitemapChecked ? "terperiksa" : `tidak diperiksa${report.sitemapError ? ` (${report.sitemapError})` : ""}`} ·{" "}
            {meta?.createdAt ? `dijalankan ${new Date(meta.createdAt).toLocaleString("id-ID")}` : ""}
            {meta?.actor ? ` oleh ${meta.actor}` : ""}
          </p>

          {report.grouped.length === 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Tidak ada masalah yang terdeteksi pada URL ini.
            </p>
          ) : (
            <div>
              <h3 className="mb-2 text-xs font-bold text-secondary">Prioritas masalah (berdasarkan dampak teknis)</h3>
              <ul className="flex flex-col gap-2">
                {report.grouped.map((group) => (
                  <li key={group.code} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-secondary">{group.label}</p>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={group.severity} />
                        <span className="text-[11px] text-muted">{group.count} URL</span>
                      </div>
                    </div>
                    <p className="mt-1 break-words text-[11px] text-muted">
                      {group.paths.slice(0, 6).join(", ")}
                      {group.count > 6 ? `, +${group.count - 6} lagi` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pagesByImpact.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-secondary">
                Lihat semua {pagesByImpact.length} URL yang diperiksa
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-muted">
                      <th className="py-1.5 pr-3 font-medium">Path</th>
                      <th className="py-1.5 pr-3 font-medium">Status</th>
                      <th className="py-1.5 pr-3 font-medium">Sitemap</th>
                      <th className="py-1.5 font-medium">Masalah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagesByImpact.map((page) => (
                      <AuditRow key={page.path} page={page} origin={origin} />
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-muted">
            {report.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function AuditRow({ page, origin }: { page: SeoAuditPage; origin: string }) {
  const severity = pageSeverity(page);
  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-1.5 pr-3">
        <a
          href={`${origin}${page.path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary hover:underline"
        >
          {page.path}
        </a>
      </td>
      <td className="py-1.5 pr-3 tabular-nums text-secondary">{page.httpStatus || "—"}</td>
      <td className="py-1.5 pr-3 text-secondary">{page.inSitemap ? "Ya" : "Tidak"}</td>
      <td className="py-1.5">
        {page.issues.length === 0 ? (
          <span className="text-emerald-700">OK</span>
        ) : (
          <span className="flex flex-wrap items-center gap-1">
            {severity && <SeverityBadge severity={severity} />}
            <span className="text-muted">
              {page.issues.map((i) => SEO_AUDIT_ISSUE_LABEL[i.code]).join(", ")}
            </span>
          </span>
        )}
      </td>
    </tr>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xl font-bold tabular-nums",
          tone === "emerald" ? "text-emerald-600" : "text-secondary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
