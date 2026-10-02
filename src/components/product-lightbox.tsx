"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Satu gambar galeri (URL + alt). */
export type GalleryImage = { url: string; alt: string };

/**
 * Lightbox (overlay fullscreen) untuk melihat gambar produk lebih besar.
 *
 * - Navigasi: tombol prev/next, tombol panah keyboard (←/→), tutup via Escape
 *   atau klik backdrop.
 * - Gambar ditampilkan `object-contain` agar UTUH (tidak terpotong), dengan
 *   latar gelap.
 * - Kunci scroll body, focus trap sederhana, fokus dikembalikan saat ditutup.
 */
export function ProductLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const total = images.length;

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      onIndexChange((index + delta + total) % total);
    },
    [index, total, onIndexChange],
  );

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [onClose, go]);

  if (total === 0) return null;
  const current = images[index] ?? images[0];

  return (
    <div
      className="fixed inset-0 z-[14000] flex flex-col bg-slate-950/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Lihat gambar produk"
      onClick={onClose}
    >
      {/* Bar atas */}
      <div className="flex items-center justify-between px-4 py-3 text-white/80 sm:px-6">
        <span className="text-xs font-medium tabular-nums">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Gambar */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-4 sm:px-12"
        onClick={(e) => e.stopPropagation()}
      >
        {total > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
            aria-label="Gambar sebelumnya"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="relative h-full w-full max-w-5xl">
          <Image
            src={current.url}
            alt={current.alt}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
            aria-label="Gambar berikutnya"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Strip thumbnail */}
      {total > 1 && (
        <div
          className="no-scrollbar flex justify-start gap-2 overflow-x-auto px-4 pb-5 sm:justify-center sm:px-6"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Lihat gambar ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === index
                  ? "border-white opacity-100"
                  : "border-transparent opacity-50 hover:opacity-90",
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
