"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import type { TamanPublicView } from "@/lib/taman-logic";
import { ANIMAL_LABEL, VARIANT_LABEL } from "@/lib/taman-types";
import { cn } from "@/lib/utils";
import { AnimalSprite } from "@/components/taman/taman-animal-picker";

/** Batas lebar: di bawahnya kartu menjadi bottom sheet (Q8). */
export const DESKTOP_MIN_WIDTH = 768;

/** Format "Oktober 2026" dari tanggal ISO. */
export function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Isi kartu testimoni. Dipakai sebagai popover (desktop) atau bottom sheet (mobile).
 * Dialog: Esc menutup, panah kiri/kanan berpindah, fokus masuk ke tombol tutup,
 * klik di luar menutup (di popover & sheet).
 */
export function TamanCard({
  item,
  index,
  total,
  mode,
  onClose,
  onPrev,
  onNext,
  anchor,
}: {
  item: TamanPublicView;
  index: number;
  total: number;
  mode: "popover" | "sheet";
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Posisi popover relatif ke frame (persen), dihitung dari hewan yang dipilih. */
  anchor?: { left: number; top: number };
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Asynchronous (bukan sinkron di efek) agar tidak memicu render kaskade.
    const raf = requestAnimationFrame(() => setMounted(true));
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onPrev, onNext]);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white">
            {item.displayName.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-bold text-secondary">{item.displayName}</p>
            <p className="text-xs text-muted">{item.role}</p>
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup testimoni"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 hover:text-secondary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1" role="img" aria-label={`Penilaian ${item.rating} dari 5 bintang`}>
        {Array.from({ length: item.rating }).map((_, i) => (
          <Star key={i} aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
        {item.dateISO && <span className="ml-2 text-[11px] text-muted">{monthLabel(item.dateISO)}</span>}
      </div>

      <blockquote className="mt-3 text-sm leading-relaxed text-slate-700">&ldquo;{item.quote}&rdquo;</blockquote>

      {/* Pratinjau hewan + warnanya (keputusan #5): tampil seperti di kanvas. */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-3">
        <AnimalSprite animal={item.animal} variant={item.variant} size={48} />
        <div className="text-xs text-muted">
          <p className="font-semibold text-secondary">{ANIMAL_LABEL[item.animal]}</p>
          <p className="mt-0.5">Warna {VARIANT_LABEL[item.variant]} — hewan ini di Taman.</p>
        </div>
      </div>

      {(item.projectSlug || item.productSlug) && (
        <a
          href={item.projectSlug ? `/portofolio/${item.projectSlug}` : `/produk/${item.productSlug}`}
          className="mt-3 inline-block text-xs font-semibold text-primary underline underline-offset-2"
        >
          Lihat {item.projectSlug ? "proyek" : "produk"} terkait
        </a>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={total <= 1}
          aria-label="Testimoni sebelumnya"
          className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="text-xs tabular-nums text-muted">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={total <= 1}
          aria-label="Testimoni berikutnya"
          className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </>
  );

  if (mode === "sheet") {
    return (
      <div className="fixed inset-0 z-[12000] flex items-end" role="dialog" aria-modal="true" aria-label={`Testimoni ${item.displayName}`}>
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
        <div
          className={cn(
            "relative max-h-[70vh] w-full overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-5 shadow-2xl transition-transform duration-300 motion-reduce:transition-none",
            mounted ? "translate-y-0" : "translate-y-full",
          )}
        >
          {body}
        </div>
      </div>
    );
  }

  // Popover: di dekat hewan, dibatasi agar tetap di dalam frame.
  const left = anchor ? Math.min(Math.max(anchor.left, 22), 78) : 50;
  const top = anchor ? Math.min(anchor.top + 14, 58) : 50;
  return (
    <div
      role="dialog"
      aria-label={`Testimoni ${item.displayName}`}
      className="absolute z-30 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      {body}
    </div>
  );
}
