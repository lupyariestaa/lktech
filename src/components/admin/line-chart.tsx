"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type LineChartPoint = {
  label: string;
  full: string;
  value: number;
};

/**
 * Grafik GARIS (SVG, tanpa dependensi) — pengganti grafik batang.
 * Dipakai untuk omzet, jumlah pesanan, & tren lead.
 *
 * Fitur:
 * - Area gradient di bawah garis + titik data.
 * - Tooltip pada hover/sentuh/fokus (roving tabindex + panah).
 * - A11y: tabel data `sr-only` sebagai sumber lengkap; kontainer `role="group"`.
 * - Responsif (viewBox + `preserveAspectRatio="none"` untuk skala halus),
 *   label sumbu X ditampilkan berselang agar tidak berdesakan.
 */
export function LineChart({
  points,
  formatValue,
  ariaLabel,
  emptyLabel = "Belum ada data pada periode ini.",
  height = 220,
  accent = "#004EDF",
  onPointClick,
}: {
  points: LineChartPoint[];
  formatValue: (v: number) => string;
  ariaLabel: string;
  emptyLabel?: string;
  height?: number;
  /** Warna garis (hex). */
  accent?: string;
  onPointClick?: (index: number) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [roving, setRoving] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const VIEW_W = 1000;
  const VIEW_H = 320;
  const PAD_X = 12;
  const PAD_Y = 24;

  const { max, total, coords, linePath, areaPath, gridYs } = useMemo(() => {
    const m = Math.max(1, ...points.map((p) => p.value));
    const t = points.reduce((sum, p) => sum + p.value, 0);
    const n = points.length;
    const innerW = VIEW_W - PAD_X * 2;
    const innerH = VIEW_H - PAD_Y * 2;

    const xy = points.map((p, i) => {
      const x = n <= 1 ? VIEW_W / 2 : PAD_X + (i / (n - 1)) * innerW;
      const y = PAD_Y + innerH - (p.value / m) * innerH;
      return { x, y };
    });

    const line = xy.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const area =
      xy.length > 0
        ? `${line} L${xy[xy.length - 1].x.toFixed(1)},${VIEW_H - PAD_Y} L${xy[0].x.toFixed(1)},${VIEW_H - PAD_Y} Z`
        : "";
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => PAD_Y + innerH - f * innerH);

    return { max: m, total: t, coords: xy, linePath: line, areaPath: area, gridYs: grid };
  }, [points]);

  if (points.length === 0 || total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-muted"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = Math.min(
        points.length - 1,
        Math.max(0, roving + (e.key === "ArrowRight" ? 1 : -1)),
      );
      setRoving(next);
      setActive(next);
      wrapRef.current
        ?.querySelector<HTMLElement>(`[data-point="${next}"]`)
        ?.focus();
    }
  };

  return (
    <div ref={wrapRef} role="group" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="line-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid horizontal */}
          {gridYs.map((y, i) => (
            <line
              key={i}
              x1={PAD_X}
              x2={VIEW_W - PAD_X}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={i === gridYs.length - 1 ? "0" : "4 6"}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Area + garis */}
          <path d={areaPath} fill="url(#line-area-fill)" stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Titik + pemicu interaksi */}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={active === i ? 5 : 3}
              fill={active === i ? accent : "#fff"}
              stroke={accent}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Overlay tombol per titik (posisi absolut, % agar mengikuti viewBox) */}
        <div className="absolute inset-0">
          {points.map((p, i) => {
            const left = `${(coords[i].x / VIEW_W) * 100}%`;
            const top = `${(coords[i].y / VIEW_H) * 100}%`;
            const isActive = active === i;
            return (
              <button
                key={`${p.label}-${i}`}
                data-point={i}
                type="button"
                tabIndex={i === roving ? 0 : -1}
                aria-label={`${p.full}: ${formatValue(p.value)}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
                onFocus={() => {
                  setActive(i);
                  setRoving(i);
                }}
                onBlur={() => setActive((cur) => (cur === i ? null : cur))}
                onPointerDown={() => setActive(i)}
                onClick={() => onPointClick?.(i)}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                style={{ left, top, width: 22, height: 22 }}
              >
                {isActive && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
                    {formatValue(p.value)}
                    <span className="ml-1 font-normal opacity-80">{p.full}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sumbu X */}
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        {points.map((p, i) => (
          <span
            key={`x-${p.label}-${i}`}
            className={cn("tabular-nums", i % labelStep === 0 || i === points.length - 1 ? "" : "invisible")}
          >
            {p.label}
          </span>
        ))}
      </div>

      <p className="mt-1 text-center text-[10px] text-muted">
        Puncak {formatValue(max)} · Total {formatValue(total)}
      </p>

      {/* Tabel data aksesibel (sr-only). */}
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
