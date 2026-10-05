"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  Minus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  exportAnalyticsToCsv,
  fetchSalesAnalytics,
} from "@/lib/admin-analytics-api";
import {
  fetchOrdersByDay,
} from "@/lib/admin-orders-api";
import {
  ANALYTICS_RANGES,
  type AnalyticsMode,
  type SalesAnalytics,
} from "@/lib/sales-analytics-types";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@/lib/order-types";
import { METRIC_HINT, METRIC_LABEL } from "@/lib/metrics-spec";
import { formatRupiah, formatCompactRupiah, formatDateTime, shortOrderCode } from "@/lib/format";
import { LineChart } from "@/components/admin/line-chart";
import { useToast } from "@/components/admin/toast";
import { cn } from "@/lib/utils";

const STATUS_ACCENT: Record<OrderStatus, string> = {
  baru: "bg-blue-500",
  menunggu_bayar: "bg-amber-500",
  dibayar: "bg-emerald-500",
  menunggu_konfirmasi: "bg-purple-500",
  diproses: "bg-amber-500",
  selesai: "bg-emerald-500",
  dibatalkan: "bg-slate-400",
  kedaluwarsa: "bg-slate-400",
};

export function AnalyticsDashboard() {
  const toast = useToast();
  const [days, setDays] = useState<number>(30);
  const [mode, setMode] = useState<AnalyticsMode>("completed");
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drillDate, setDrillDate] = useState<string | null>(null);

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

        <button
          onClick={() => {
            if (!data) return;
            exportAnalyticsToCsv(data);
            toast.success("Analitik diekspor ke CSV.");
          }}
          disabled={!data}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Ekspor CSV
        </button>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              icon={Wallet}
              label={METRIC_LABEL.omzetPeriod}
              value={formatRupiah(totals.omzet)}
              hint={METRIC_HINT.omzetPeriod}
              delta={data.deltas.omzet}
              accent="bg-primary-50 text-primary"
            />
            <SummaryCard
              icon={ReceiptText}
              label={METRIC_LABEL.ordersRevenue}
              value={String(totals.orders)}
              hint={METRIC_HINT.ordersRevenue}
              delta={data.deltas.orders}
              accent="bg-blue-50 text-blue-600"
            />
            <SummaryCard
              icon={TrendingUp}
              label={METRIC_LABEL.aov}
              value={totals.aov > 0 ? formatRupiah(totals.aov) : "—"}
              hint={METRIC_HINT.aov}
              delta={data.deltas.aov}
              accent="bg-emerald-50 text-emerald-600"
            />
            <SummaryCard
              icon={CheckCircle2}
              label={METRIC_LABEL.completion}
              value={`${Math.round(totals.completionRate * 100)}%`}
              hint={`${totals.completed} selesai · ${totals.cancelled} batal`}
              accent="bg-amber-50 text-amber-600"
            />
            <SummaryCard
              icon={CreditCard}
              label={METRIC_LABEL.paymentConversion}
              value={
                data.payment.paid + data.payment.expired > 0
                  ? `${Math.round(data.payment.rate * 100)}%`
                  : "—"
              }
              hint={`${data.payment.paid} dibayar · ${data.payment.expired} kedaluwarsa`}
              accent="bg-purple-50 text-purple-600"
            />
          </div>

          {/* Grafik omzet */}
          <ChartCard
            title={`Omzet Harian (${days} hari terakhir)`}
            subtitle={`Total ${formatRupiah(totals.omzet)} pada periode ini. Klik titik untuk melihat pesanan hari itu.`}
            badge={formatCompactRupiah(totals.omzet)}
          >
            <LineChart
              points={data.series.map((s) => ({
                label: s.label,
                full: s.full,
                value: s.omzet,
              }))}
              formatValue={formatRupiah}
              ariaLabel={`Grafik omzet harian ${days} hari terakhir, total ${formatRupiah(totals.omzet)}.`}
              emptyLabel={`Belum ada omzet pada ${days} hari terakhir.`}
              accent="#004EDF"
              onPointClick={(i) => setDrillDate(data.series[i]?.dateISO ?? null)}
            />
          </ChartCard>

          {/* Grafik jumlah pesanan */}
          <ChartCard
            title={`Jumlah Pesanan Harian (${days} hari terakhir)`}
            subtitle={`Total ${totals.orders} pesanan penghasil omzet pada periode ini.`}
            badge={`${totals.orders} pesanan`}
          >
            <LineChart
              points={data.series.map((s) => ({
                label: s.label,
                full: s.full,
                value: s.orders,
              }))}
              formatValue={(v) => `${v} pesanan`}
              accent="#7C3AED"
              ariaLabel={`Grafik jumlah pesanan harian ${days} hari terakhir, total ${totals.orders} pesanan.`}
              emptyLabel={`Belum ada pesanan pada ${days} hari terakhir.`}
            />
          </ChartCard>

          {/* Produk terlaris + distribusi status */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TopProducts products={data.topProducts} />
            <StatusBreakdown breakdown={data.statusBreakdown} />
          </div>

          {drillDate && (
            <DrillDownDialog
              dateISO={drillDate}
              onClose={() => setDrillDate(null)}
            />
          )}
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
  delta,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", accent)}>
          <Icon className="h-5 w-5" />
        </span>
        {delta !== undefined && <DeltaBadge delta={delta} />}
      </div>
      <p className="mt-3 text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-secondary tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** Indikator perubahan % vs periode sebelumnya (`AN-P1`). */
function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-[11px] font-medium text-muted">—</span>;
  }
  const pct = Math.round(delta * 100);
  const up = pct > 0;
  const flat = pct === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span
      title="Dibanding periode sebelumnya"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        flat
          ? "bg-slate-100 text-slate-500"
          : up
            ? "bg-emerald-50 text-emerald-600"
            : "bg-rose-50 text-rose-600",
      )}
    >
      <Icon className="h-3 w-3" />
      {pct > 0 ? "+" : ""}
      {pct}%
    </span>
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
        <div>
          <h2 className="text-sm font-bold text-secondary">Produk Terlaris</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Omzet bruto (sebelum diskon) — untuk peringkat, bukan rekonsiliasi.
          </p>
        </div>
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
      <h2 className="text-sm font-bold text-secondary">{METRIC_LABEL.ordersTotal}</h2>
      <p className="mt-0.5 text-xs text-muted">{METRIC_HINT.ordersTotal}</p>

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

/** Dialog drill-down: daftar pesanan satu hari (`AN-P2`). */
function DrillDownDialog({
  dateISO,
  onClose,
}: {
  dateISO: string;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await fetchOrdersByDay(dateISO).catch(() => []);
      if (active) setOrders(list);
    })();
    return () => {
      active = false;
    };
  }, [dateISO]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dateLabel = new Date(`${dateISO}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const total = (orders ?? []).reduce((s, o) => s + o.total, 0);

  return (
    <div
      className="fixed inset-0 z-[13000] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Pesanan tanggal ${dateISO}`}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-sm font-bold text-secondary">Pesanan Harian</h2>
            <p className="mt-0.5 text-xs text-muted">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-surface"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {orders === null ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Memuat pesanan…
            </p>
          ) : orders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-surface py-10 text-center text-sm text-muted">
              Tidak ada pesanan pada tanggal ini.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted">
                {orders.length} pesanan · total{" "}
                <span className="font-semibold text-secondary">
                  {formatRupiah(total)}
                </span>
              </p>
              <ul className="mt-3 flex flex-col divide-y divide-slate-100">
                {orders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-secondary">
                        {o.buyerName || o.buyerEmail}
                      </p>
                      <p className="text-xs text-muted">
                        {shortOrderCode(o.id)} · {formatDateTime(o.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-secondary tabular-nums">
                        {formatRupiah(o.total)}
                      </p>
                      <p className="text-[11px] text-muted">
                        {ORDER_STATUS_LABEL[o.status]}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="border-t border-slate-100 p-5">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            Buka halaman Pesanan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
