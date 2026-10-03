"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type SalesChartPoint = {
  label: string;
  full: string;
  value: number;
};

/**
 * Grafik batang CSS murni (tanpa dependensi) — dipakai untuk omzet & jumlah
 * pesanan. Mendukung tooltip hover, label sumbu, dan mode aksesibel.
 *
 * Menyederhanakan jumlah batang bila data panjang (mis. 90 hari) agar tetap
 * terbaca: label hanya ditampilkan pada interval tertentu.
 */
export function SalesChart({
  points,
  formatValue,
  accent = "from-primary to-primary-light",
  ariaLabel,
  emptyLabel = "Belum ada data pada periode ini.",
  height = 160,
}: {
  points: SalesChartPoint[];
  /** Formatter nilai untuk tooltip & sumbu. */
  formatValue: (v: number) => string;
  /** Kelas gradient batang (tailwind from-… to-…). */
  accent?: string;
  ariaLabel: string;
  emptyLabel?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const { max, total } = useMemo(() => {
    const m = Math.max(1, ...points.map((p) => p.value));
    const t = points.reduce((sum, p) => sum + p.value, 0);
    return { max: m, total: t };
  }, [points]);

  // Interval label agar tidak berdesakan (maks ~7 label).
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  if (points.length === 0 || total === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className="flex items-end gap-[3px] sm:gap-1.5"
      role="img"
      aria-label={ariaLabel}
      style={{ height }}
    >
      {points.map((p, i) => {
        const pct = p.value === 0 ? 0 : Math.max(3, Math.round((p.value / max) * 100));
        const showLabel = i % labelStep === 0 || i === points.length - 1;
        const isHover = hover === i;
        return (
          <div
            key={`${p.label}-${i}`}
            className="group relative flex h-full flex-1 flex-col items-center justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            title={`${p.full}: ${formatValue(p.value)}`}
            aria-label={`${p.full}: ${formatValue(p.value)}`}
          >
            {/* Tooltip */}
            {isHover && (
              <div className="pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
                {formatValue(p.value)}
              </div>
            )}
            <div
              className={cn(
                "w-full rounded-t transition-all duration-200",
                p.value === 0
                  ? "bg-slate-100"
                  : cn("bg-gradient-to-t", accent, isHover && "opacity-80"),
              )}
              style={{ height: `${pct}%` }}
            />
            <span
              className={cn(
                "mt-1.5 text-[9px] tabular-nums sm:text-[10px]",
                showLabel ? "text-muted" : "text-transparent",
              )}
            >
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
