"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SalesChartPoint = {
  label: string;
  full: string;
  value: number;
};

/**
 * Grafik batang CSS murni (tanpa dependensi) — dipakai untuk omzet & jumlah
 * pesanan. Mendukung tooltip (hover/sentuh/fokus), label sumbu, dan mode
 * aksesibel.
 *
 * A11y (`AN-H3`):
 * - Kontainer batang TIDAK `role="img"`; sebaliknya disediakan TABEL DATA
 *   `sr-only` sebagai sumber aksesibel lengkap (label + nilai).
 * - Batang dapat difokus via keyboard dengan ROVING TABINDEX (hanya satu batang
 *   `tabIndex=0`; sisanya `-1`, diubah dengan panah kiri/kanan).
 * - Tooltip juga muncul pada `onPointerDown`/sentuh, bukan hanya hover.
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
  onBarClick,
}: {
  points: SalesChartPoint[];
  /** Formatter nilai untuk tooltip & sumbu. */
  formatValue: (v: number) => string;
  /** Kelas gradient batang (tailwind from-… to-…). */
  accent?: string;
  ariaLabel: string;
  emptyLabel?: string;
  height?: number;
  /** Callback klik batang (drill-down `AN-P2`), indeks titik. */
  onBarClick?: (index: number) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [roving, setRoving] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = Math.min(
        points.length - 1,
        Math.max(0, roving + (e.key === "ArrowRight" ? 1 : -1)),
      );
      setRoving(next);
      setActive(next);
      const el = containerRef.current?.querySelector<HTMLElement>(
        `[data-bar="${next}"]`,
      );
      el?.focus();
    }
  };

  return (
    <div>
      <div
        ref={containerRef}
        className="flex items-end gap-[3px] sm:gap-1.5"
        role="group"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        style={{ height }}
      >
        {points.map((p, i) => {
          const pct = p.value === 0 ? 0 : Math.max(3, Math.round((p.value / max) * 100));
          const showLabel = i % labelStep === 0 || i === points.length - 1;
          const isActive = active === i;
          return (
            <div
              key={`${p.label}-${i}`}
              data-bar={i}
              className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end focus:outline-none"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
              onFocus={() => {
                setActive(i);
                setRoving(i);
              }}
              onBlur={() => setActive((cur) => (cur === i ? null : cur))}
              onPointerDown={() => setActive(i)}
              onClick={() => onBarClick?.(i)}
              tabIndex={i === roving ? 0 : -1}
              title={`${p.full}: ${formatValue(p.value)}`}
              aria-label={`${p.full}: ${formatValue(p.value)}`}
            >
              {/* Tooltip */}
              {isActive && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
                  {formatValue(p.value)}
                </div>
              )}
              <div
                className={cn(
                  "w-full rounded-t transition-all duration-200",
                  p.value === 0
                    ? "bg-slate-100"
                    : cn("bg-gradient-to-t", accent, isActive && "opacity-80"),
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

      {/* Tabel data aksesibel (sr-only) — sumber lengkap untuk screen reader. */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Periode</th>
            <th scope="col">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={`t-${p.label}-${i}`}>
              <th scope="row">{p.full}</th>
              <td>{formatValue(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
