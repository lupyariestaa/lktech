"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.15;

/**
 * Kanvas paket: konten di dalamnya bisa di-geser (drag) dan di-zoom.
 *
 * Interaksi (ala papan Figma/maps):
 * - Tahan klik kiri + drag untuk pan.
 * - Tombol `+` / `−` untuk zoom, tombol reset & fit.
 * - Mobile: drag via pointer events (touch).
 *
 * A11y: kontrol dapat difokus & memiliki label; konten tetap di DOM (bisa
 * di-Tab). `prefers-reduced-motion` → tanpa transisi. Konten di dalam kanvas
 * sebaiknya berukuran tetap (fixed width) agar transformasi stabil.
 */
export function VariantCanvas({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, originX: 0, originY: 0 });
  const movedRef = useRef(false);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomBy = useCallback((delta: number) => {
    setTransform((t) => ({ ...t, scale: clampScale(t.scale + delta) }));
  }, []);

  const reset = useCallback(() => setTransform({ x: 0, y: 0, scale: 1 }), []);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    const content = vp?.firstElementChild as HTMLElement | null;
    if (!vp || !content) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }
    // "Sesuaikan": perkecil bila konten lebih lebar dari viewport; JANGAN
    // memperbesar melebihi 100% (agar konten sedikit tetap enak dibaca).
    const scale = clampScale(
      Math.min(1, vp.clientWidth / Math.max(content.scrollWidth, 1)),
    );
    setTransform({ x: 0, y: 0, scale });
  }, []);

  // Fit pertama kali saat mount (konten besar seperti 6 paket auto menyesuaikan).
  useEffect(() => {
    // Tunggu layout selesai.
    const t = window.setTimeout(() => fit(), 40);
    return () => window.clearTimeout(t);
  }, [fit]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Hanya tombol kiri mouse / sentuh.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const vp = viewportRef.current;
    if (!vp) return;
    movedRef.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    setDragging(true);
    vp.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
    setTransform((t) => ({
      ...t,
      x: dragStart.current.originX + dx,
      y: dragStart.current.originY + dy,
    }));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    viewportRef.current?.releasePointerCapture?.(e.pointerId);
  };

  // Cegah klik "bocor" ke tombol di dalam kartu setelah drag.
  const onClickCapture = (e: React.MouseEvent) => {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
    }
  };

  return (
    <div className="relative min-w-0 max-w-full">
      {/* Viewport */}
      <div
        ref={viewportRef}
        className={cn(
          "relative min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-surface",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{ touchAction: dragging ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        role="group"
        aria-label="Kanvas paket — geser dan perbesar"
      >
        <div
          className="origin-top-left p-6 transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {children}
        </div>
      </div>

      {/* Kontrol zoom */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => zoomBy(-SCALE_STEP)}
            disabled={transform.scale <= MIN_SCALE + 1e-6}
            aria-label="Perkecil"
            className="grid h-10 w-10 place-items-center text-slate-600 transition-colors hover:bg-surface hover:text-primary disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-14 text-center text-xs font-semibold tabular-nums text-secondary">
            {Math.round(transform.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(SCALE_STEP)}
            disabled={transform.scale >= MAX_SCALE - 1e-6}
            aria-label="Perbesar"
            className="grid h-10 w-10 place-items-center text-slate-600 transition-colors hover:bg-surface hover:text-primary disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={fit}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Sesuaikan
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        <span className="ml-auto hidden text-xs text-muted sm:block">
          Geser kanvas dengan menahan klik
        </span>
      </div>
    </div>
  );
}
