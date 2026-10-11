"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  Loader2,
  Pencil,
  Users,
} from "lucide-react";
import {
  fetchCouponDetail,
  updateCoupon,
  deleteCoupon,
  restoreCoupon,
  type CouponDetailResult,
} from "@/lib/admin-coupons-api";
import {
  COUPON_TYPE_LABEL,
  COUPON_AUDIENCE_LABEL,
  type Coupon,
} from "@/lib/coupon-types";
import { ADMIN_AUDIT_ACTION_LABEL } from "@/lib/admin-audit-types";
import {
  formatPercent,
  formatRoi,
  type CouponAnalytics,
} from "@/lib/coupon-analytics-pure";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

/** Badge status kupon (aktif/nonaktif/arsip). */
function statusBadge(c: Coupon): { label: string; cls: string } {
  if (c.archived) return { label: "Diarsipkan", cls: "bg-slate-100 text-slate-500" };
  if (!c.active) return { label: "Nonaktif", cls: "bg-amber-50 text-amber-600" };
  return { label: "Aktif", cls: "bg-emerald-50 text-emerald-600" };
}

/** Label nilai diskon (persen/nominal/bertingkat). */
function valueLabel(c: Coupon): string {
  if (c.type === "tiered") {
    return `${c.tiers?.length ?? 0} tingkat`;
  }
  return c.type === "percent" ? `${c.value}%` : formatRupiah(c.value);
}

/** Ekspor daftar pemakai ke CSV (C5). */
function exportRedemptions(coupon: Coupon, rows: CouponDetailResult["redemptions"]) {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const headers = ["Email", "UID", "Jumlah Pakai", "Terakhir"];
  const body = rows.map((r) =>
    [r.email ?? "", r.uid, r.count, r.lastRedeemedAtISO ?? ""].map(cell).join(","),
  );
  const csv = "\uFEFF" + [headers.map(cell).join(","), ...body].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pemakai-${coupon.code}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Halaman detail kupon (FASE C5) — dua kolom: rincian/statistik + pemakai/timeline. */
export function CouponDetailClient({ coupon: initial }: { coupon: Coupon }) {
  const toast = useToast();
  const [data, setData] = useState<CouponDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [copied, setCopied] = useState(false);

  const coupon = data?.coupon ?? initial;

  // `reloadKey` memicu pemuatan ulang setelah aksi (setState hanya di async).
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchCouponDetail(initial.id, { analytics: true, days: 30 });
        if (active) setData(result);
      } catch (err) {
        if (active) {
          toast.error(err instanceof Error ? err.message : "Gagal memuat kupon.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id, reloadKey]);

  const onToggleActive = async () => {
    setBusy("active");
    try {
      await updateCoupon(coupon.id, { active: !coupon.active });
      toast.success(coupon.active ? "Kupon dinonaktifkan." : "Kupon diaktifkan.");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui.");
    } finally {
      setBusy(null);
    }
  };

  const onArchive = async () => {
    setBusy("archive");
    try {
      await deleteCoupon(coupon.id);
      toast.success("Kupon diarsipkan.");
      setConfirmArchive(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengarsipkan.");
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    setBusy("restore");
    try {
      await restoreCoupon(coupon.id);
      toast.success("Kupon dipulihkan.");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulihkan.");
    } finally {
      setBusy(null);
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tak tersedia */
    }
  };

  const badge = statusBadge(coupon);
  const stat = data?.stat;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Kolom kiri: rincian + statistik */}
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-secondary px-3 py-1.5 font-mono text-base font-bold tracking-wide text-white">
                {coupon.code}
              </span>
              <button
                type="button"
                onClick={onCopy}
                aria-label="Salin kode"
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badge.cls)}>
              {badge.label}
            </span>
          </div>

          {coupon.description && (
            <p className="mt-3 text-sm text-slate-600">{coupon.description}</p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <Info label="Jenis" value={COUPON_TYPE_LABEL[coupon.type]} />
            <Info label="Nilai" value={valueLabel(coupon)} />
            <Info
              label="Min. belanja"
              value={coupon.minSpend > 0 ? formatRupiah(coupon.minSpend) : "—"}
            />
            <Info
              label="Maks. diskon"
              value={
                coupon.type === "percent" && coupon.maxDiscount
                  ? formatRupiah(coupon.maxDiscount)
                  : "—"
              }
            />
            <Info
              label="Kuota"
              value={`${coupon.usageCount}/${coupon.usageLimit ?? "∞"}`}
            />
            <Info label="Batas/user" value={coupon.limitPerUser === 0 ? "∞" : `${coupon.limitPerUser}×`} />
            <Info label="Kustomer" value={COUPON_AUDIENCE_LABEL[coupon.audience ?? "semua"]} />
            <Info
              label="Single-use"
              value={coupon.singleUse ? "Ya" : "—"}
            />
            <Info
              label="Kuota harian"
              value={coupon.perDayLimit ? `${data?.dayUsage ?? 0}/${coupon.perDayLimit}` : "—"}
            />
            {(coupon.assignedEmail || coupon.assignedUid) && (
              <Info
                label="Khusus"
                value={coupon.assignedEmail ?? coupon.assignedUid ?? "—"}
              />
            )}
            <Info
              label="Mulai"
              value={coupon.startsAt ? formatDateTime(coupon.startsAt) : "—"}
            />
            <Info
              label="Berakhir"
              value={coupon.endsAt ? formatDateTime(coupon.endsAt) : "—"}
            />
            {coupon.campaign && <Info label="Kampanye" value={coupon.campaign} />}
            {(coupon.appliesToSlugs?.length || coupon.minItems) && (
              <Info
                label="Bundel"
                value={[
                  coupon.appliesToSlugs?.length
                    ? `${coupon.appliesToSlugs.length} produk`
                    : null,
                  coupon.minItems ? `min ${coupon.minItems} item` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
          </dl>
        </div>

        {/* Statistik dampak */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-secondary">Dampak</h2>
          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Order aktif" value={stat?.activeOrders ?? 0} tone="emerald" />
              <Stat label="Total order" value={stat?.orderCount ?? 0} />
              <Stat label="Σ diskon" value={formatRupiah(stat?.totalDiscount ?? 0)} tone="primary" />
              <Stat label="Dibatalkan" value={stat?.cancelledOrders ?? 0} tone="slate" />
            </div>
          )}
        </div>

        {/* Analitik 30 hari (C6) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-secondary">Analitik (30 hari)</h2>
          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
            </p>
          ) : !data?.analytics ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-3 text-xs text-muted">
              Belum ada data analitik.
            </p>
          ) : (
            <AnalyticsPanel analytics={data.analytics} />
          )}
        </div>
      </div>

      {/* Kolom kanan: aksi + pemakai + timeline */}
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-secondary">Aksi</h2>
          <div className="flex flex-wrap gap-2">
            {coupon.archived ? (
              <button
                type="button"
                onClick={onRestore}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
              >
                {busy === "restore" && <Loader2 className="h-4 w-4 animate-spin" />}
                Pulihkan
              </button>
            ) : (
              <>
                <Link
                  href={`/admin/coupons/${coupon.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={onToggleActive}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  {busy === "active" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {coupon.active ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmArchive(true)}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
                >
                  Arsipkan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Daftar pemakai */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-secondary">
              <Users className="h-4 w-4" /> Pemakai ({data?.redemptions.length ?? 0})
            </h2>
            {(data?.redemptions.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => exportRedemptions(coupon, data!.redemptions)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            )}
          </div>
          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…
            </p>
          ) : (data?.redemptions.length ?? 0) === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-3 text-xs text-muted">
              Belum ada pemakaian.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-slate-100">
              {data!.redemptions.slice(0, 30).map((r) => (
                <li key={r.uid} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate text-xs text-secondary">
                    {r.email ?? `${r.uid.slice(0, 8)}…`}
                  </span>
                  <span className="shrink-0 text-right text-[11px] text-muted">
                    {r.count}× · {r.lastRedeemedAtISO ? formatDateTime(r.lastRedeemedAtISO) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Timeline (audit) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-secondary">Timeline</h2>
          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…
            </p>
          ) : (data?.timeline.length ?? 0) === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-3 text-xs text-muted">
              Belum ada aktivitas.
            </p>
          ) : (
            <ol className="mt-3 flex flex-col gap-3">
              {data!.timeline.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1 grid h-2 w-2 shrink-0 place-items-center rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-secondary">
                      {ADMIN_AUDIT_ACTION_LABEL[e.action as keyof typeof ADMIN_AUDIT_ACTION_LABEL] ?? e.action}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatDateTime(e.atISO)}
                      {e.actor ? ` · ${e.actor}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        title="Arsipkan kupon ini?"
        description={`Kupon "${coupon.code}" akan diarsipkan (tidak dihapus permanen). Kupon bisa dipulihkan.`}
        confirmLabel="Arsipkan"
        busy={busy === "archive"}
        onConfirm={onArchive}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-secondary">{value}</dd>
    </div>
  );
}

/** Panel analitik kupon (C6). */
function AnalyticsPanel({ analytics }: { analytics: CouponAnalytics }) {
  const a = analytics;
  return (
    <div className="mt-4 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Konversi" value={formatPercent(a.conversionRate)} tone="emerald" />
        <Stat label="AOV berkupon" value={formatRupiah(Math.round(a.couponAov))} tone="primary" />
        <Stat label="AOV non-kupon" value={formatRupiah(Math.round(a.nonCouponAov))} />
        <Stat label="ROI" value={formatRoi(a.roi)} tone="emerald" />
        <Stat label="Omzet berkupon" value={formatRupiah(a.couponRevenue)} tone="primary" />
        <Stat label="Σ diskon" value={formatRupiah(a.totalDiscount)} />
        <Stat label="Order berkupon" value={a.convertedOrders} />
        <Stat label="Pangsa kupon" value={formatPercent(a.couponShare)} />
      </div>

      {/* Tren harian (bar sederhana) */}
      {a.trend.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Tren order harian
          </p>
          <div className="mt-2 flex items-end gap-1 overflow-x-auto pb-1">
            {a.trend.map((p) => {
              const max = Math.max(...a.trend.map((t) => t.orders), 1);
              const h = Math.max(4, Math.round((p.orders / max) * 48));
              return (
                <div
                  key={p.date}
                  className="flex w-3 shrink-0 flex-col items-center gap-1"
                  title={`${p.date}: ${p.orders} order · ${formatRupiah(p.discount)}`}
                >
                  <span className="w-full rounded-t bg-primary/70" style={{ height: `${h}px` }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Breakdown kampanye */}
      {a.campaigns.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Per kampanye
          </p>
          <ul className="mt-2 flex flex-col divide-y divide-slate-100 text-xs">
            {a.campaigns.map((c) => (
              <li key={c.campaign} className="flex items-center justify-between gap-2 py-1.5">
                <span className="font-medium text-secondary">{c.campaign}</span>
                <span className="text-muted">
                  {c.orders} order · {formatRupiah(c.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  tone?: "emerald" | "primary" | "slate";
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "primary"
        ? "text-primary"
        : "text-secondary";
  return (
    <div className="rounded-2xl border border-slate-100 bg-surface px-3 py-3">
      <p className={cn("text-lg font-bold tabular-nums", cls)}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}
