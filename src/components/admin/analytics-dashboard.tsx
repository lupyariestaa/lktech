"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { fetchSalesAnalytics } from "@/lib/admin-analytics-api";
import {
  ANALYTICS_RANGES,
  type AnalyticsMode,
  type SalesAnalytics,
} from "@/lib/sales-analytics-types";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/order-types";
import { formatRupiah, formatCompactRupiah } from "@/lib/format";
import { SalesChart } from "@/components/admin/sales-chart";
import { cn } from "@/lib/utils";

const STATUS_ACCENT: Record<OrderStatus, string> = {
  baru: "bg-blue-500",
  diproses: "bg-amber-500",
  selesai: "bg-emerald-500",
  dibatalkan: "bg-slate-400",
};

export function AnalyticsDashboard() {
  const [days, setDays] = useState<number>(30);
  const [mode, setMode] = useState<AnalyticsMode>("completed");
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchSalesAnalytics({ days, mode });
        if (active) setData(result);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Gagal memuat analitik.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [days, mode]);

  const totals = data?.totals;

  return (
    <div className="flex flex-col gap-6">
      {/* Kontrol periode */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Pilih rentang periode"
          className="flex items-center rounded-full border border-slate-200 bg-white p-1"
        >
          {ANALYTICS_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                days === r ? "bg-primary text-white" : "text-slate-500 hover:text-secondary",
              )}
            >
              {r} hari
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Sumber omzet"
          className="flex items-center rounded-full border border-slate-200 bg-white p-1"
        >
          <button
            onClick={() => setMode("completed")}
            aria-pressed={mode === "completed"}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              mode === "completed"
                ? "bg-secondary text-white"
                : "text-slate-500 hover:text-secondary",
            )}
          >
            Omzet selesai
          </button>
          <button
            onClick={() => setMode("all")}
            aria-pressed={mode === "all"}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              mode === "all" ? "bg-secondary text-white" : "text-slate-500 hover:text-secondary",
            )}
          >
            Semua status
          </button>
        </div>

        <p className="ml-auto text-xs text-muted">
          {mode === "completed"
            ? "Omzet dari pesanan berstatus selesai."
            : "Omzet dari semua pesanan (kecuali dibatalkan)."}
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
          {error}
        </div>
      ) : loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Menghitung analitik…
        </div>
      ) : data && totals ? (
        <>
          {/* Kartu ringkasan */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Wallet}
              label="Omzet Periode"
              value={formatRupiah(totals.omzet)}
              accent="bg-primary-50 text-primary"
            />
            <SummaryCard
              icon={ReceiptText}
              label="Jumlah Pesanan"
              value={String(totals.orders)}
              accent="bg-blue-50 text-blue-600"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Rata-rata / Pesanan"
              value={totals.aov > 0 ? formatRupiah(totals.aov) : "—"}
              accent="bg-emerald-50 text-emerald-600"
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Tingkat Selesai"
              value={`${Math.round(totals.completionRate * 100)}%`}
              hint={`${totals.completed} selesai · ${totals.cancelled} batal`}
              accent="bg-amber-50 text-amber-600"
            />
          </div>

          {/* Grafik omzet */}
          <ChartCard
            title={`Omzet Harian (${days} hari terakhir)`}
            subtitle={`Total ${formatRupiah(totals.omzet)} pada periode ini.`}
            badge={formatCompactRupiah(totals.omzet)}
          >
            <SalesChart
              points={data.series.map((s) => ({
                label: s.label,
                full: s.full,
                value: s.omzet,
              }))}
              formatValue={formatRupiah}
              ariaLabel={`Grafik omzet harian ${days} hari terakhir, total ${formatRupiah(totals.omzet)}.`}
              emptyLabel={`Belum ada omzet pada ${days} hari terakhir.`}
            />
          </ChartCard>

          {/* Grafik jumlah pesanan */}
          <ChartCard
            title={`Jumlah Pesanan Harian (${days} hari terakhir)`}
            subtitle={`Total ${totals.orders} pesanan pada periode ini.`}
            badge={`${totals.orders} pesanan`}
          >
            <SalesChart
              points={data.series.map((s) => ({
                label: s.label,
                full: s.full,
                value: s.orders,
              }))}
              formatValue={(v) => `${v} pesanan`}
              accent="from-secondary to-primary"
              ariaLabel={`Grafik jumlah pesanan harian ${days} hari terakhir, total ${totals.orders} pesanan.`}
              emptyLabel={`Belum ada pesanan pada ${days} hari terakhir.`}
            />
          </ChartCard>

          {/* Produk terlaris + distribusi status */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TopProducts products={data.topProducts} />
            <StatusBreakdown breakdown={data.statusBreakdown} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <span className={cn("grid h-10 w-10 place-items-center rounded-xl", accent)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-secondary tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-secondary">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
          {badge}
        </span>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TopProducts({
  products,
}: {
  products: SalesAnalytics["topProducts"];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-secondary">Produk Terlaris</h2>
        <Link
          href="/admin/products"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          Kelola produk
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-surface py-8 text-center text-xs text-muted">
          Belum ada penjualan pada periode ini.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-slate-100">
          {products.map((p, i) => (
            <li key={p.slug} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold",
                  i === 0
                    ? "bg-primary text-white"
                    : "bg-surface text-slate-500",
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-secondary">
                  {p.name}
                </p>
                <p className="text-xs text-muted">{p.units} unit terjual</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-secondary tabular-nums">
                {formatRupiah(p.omzet)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBreakdown({
  breakdown,
}: {
  breakdown: Record<OrderStatus, number>;
}) {
  const entries = (Object.keys(breakdown) as OrderStatus[]).map((k) => ({
    key: k,
    value: breakdown[k],
  }));
  const total = entries.reduce((sum, e) => sum + e.value, 0);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-secondary">Status Pesanan</h2>
      <p className="mt-0.5 text-xs text-muted">
        {total} pesanan dalam periode ini.
      </p>

      {total === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-surface py-8 text-center text-xs text-muted">
          Belum ada pesanan.
        </p>
      ) : (
        <>
          {/* Bar komposisi */}
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {entries.map((e) =>
              e.value > 0 ? (
                <div
                  key={e.key}
                  className={cn("h-full", STATUS_ACCENT[e.key])}
                  style={{ width: `${(e.value / total) * 100}%` }}
                  title={`${ORDER_STATUS_LABEL[e.key]}: ${e.value}`}
                />
              ) : null,
            )}
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-3">
            {entries.map((e) => (
              <li key={e.key} className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_ACCENT[e.key])} />
                <div className="min-w-0">
                  <p className="text-xs text-muted">{ORDER_STATUS_LABEL[e.key]}</p>
                  <p className="text-sm font-bold text-secondary tabular-nums">
                    {e.value}{" "}
                    <span className="text-xs font-normal text-muted">
                      ({Math.round((e.value / total) * 100)}%)
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
