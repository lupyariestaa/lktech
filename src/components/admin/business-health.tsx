import "server-only";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Minus,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getSalesAnalytics } from "@/lib/sales-analytics";
import { getOrdersSummary } from "@/lib/orders";
import { METRIC_HINT, METRIC_LABEL } from "@/lib/metrics-spec";
import { formatCompactRupiah, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * KESEHATAN BISNIS (Tema 3.3, FASE L5) — ringkasan KPI 30 hari terakhir vs
 * periode sebelumnya, dirender di halaman Ringkasan admin.
 *
 * Server component: memakai agregasi analitik yang sudah teruji
 * (`getSalesAnalytics`). Aman bila Admin SDK tak tersedia (kartu nol).
 */

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const pct = Math.round(value * 100);
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold",
        flat ? "text-slate-400" : up ? "text-emerald-600" : "text-rose-500",
      )}
    >
      {flat ? (
        <Minus className="h-3 w-3" />
      ) : up ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {pct > 0 ? "+" : ""}
      {pct}%
    </span>
  );
}

export async function BusinessHealth() {
  // 30 hari terakhir, mode "completed" (omzet pesanan selesai) — konsisten
  // dengan definisi metrik resmi (metrics-spec).
  const analytics = await getSalesAnalytics({ days: 30, mode: "completed" });
  const summary = await getOrdersSummary().catch(() => null);

  const t = analytics.totals;
  const p = analytics.payment;

  const cards = [
    {
      icon: Wallet,
      label: METRIC_LABEL.omzetPeriod,
      hint: METRIC_HINT.omzetPeriod,
      value: formatRupiah(t.omzet),
      sub: `30 hari terakhir`,
      delta: analytics.deltas.omzet,
      accent: "bg-primary-50 text-primary",
    },
    {
      icon: ReceiptText,
      label: METRIC_LABEL.ordersRevenue,
      hint: METRIC_HINT.ordersRevenue,
      value: String(t.orders),
      sub: `${t.completed} selesai · ${t.cancelled} batal`,
      delta: analytics.deltas.orders,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      icon: TrendingUp,
      label: METRIC_LABEL.aov,
      hint: METRIC_HINT.aov,
      value: t.aov > 0 ? formatRupiah(t.aov) : "—",
      sub: "Rata-rata per pesanan",
      delta: analytics.deltas.aov,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: CreditCard,
      label: METRIC_LABEL.paymentConversion,
      hint: METRIC_HINT.paymentConversion,
      value: p.paid + p.expired > 0 ? `${Math.round(p.rate * 100)}%` : "—",
      sub: `${p.paid} dibayar · ${p.expired} kedaluwarsa`,
      delta: null,
      accent: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-secondary">
            Kesehatan Bisnis (30 hari)
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Perbandingan dengan 30 hari sebelumnya.{" "}
            {summary
              ? `Omzet selesai sepanjang waktu: ${formatCompactRupiah(summary.omzet)}.`
              : ""}
          </p>
        </div>
        <Link
          href="/admin/analytics"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          Analitik lengkap
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-slate-200 p-4"
              title={c.hint}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl",
                    c.accent,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <DeltaBadge value={c.delta} />
              </div>
              <p className="mt-3 text-lg font-bold text-secondary tabular-nums">
                {c.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted">{c.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
