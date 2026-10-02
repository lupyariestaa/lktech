"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaLightbox, type GalleryImage } from "@/components/media-lightbox";

export type { GalleryImage };

/**
 * Galeri media interaktif & super responsif — GENERIK (dipakai Produk & Portfolio).
 *
 * - Gambar besar 16:9 (`object-cover`) + tombol navigasi prev/next.
 * - Strip thumbnail horizontal (scroll/snap di mobile), selalu terkurung dalam
 *   lebar container (`w-full min-w-0 max-w-full`).
 * - Klik gambar besar → lightbox; klik thumbnail → ganti gambar besar.
 */
export function MediaGallery({
  images,
  label,
  placeholderIcon,
  ratio = "video",
}: {
  images: GalleryImage[];
  /** Nama untuk alt fallback & label aksesibel (mis. nama produk). */
  label?: string;
  /** Ikon fallback bila tidak ada gambar. */
  placeholderIcon?: React.ReactNode;
  /** Rasio gambar besar: "video" (16:9) | "photo" (16:10). */
  ratio?: "video" | "photo";
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const total = images.length;
  const hasImages = total > 0;
  const current = images[activeIndex] ?? images[0];
  const aspectClass = ratio === "photo" ? "aspect-[16/10]" : "aspect-video";

  const go = (delta: number) => {
    if (total === 0) return;
    setActiveIndex((i) => (i + delta + total) % total);
  };

  // Geser thumbnail aktif agar selalu terlihat saat index berubah.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const btn = strip.children[activeIndex] as HTMLElement | undefined;
    btn?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeIndex]);

  return (
    <section className="w-full min-w-0 max-w-full">
      {/* Gambar besar */}
      <div className="relative w-full min-w-0">
        <button
          type="button"
          onClick={() => hasImages && setLightboxOpen(true)}
          className={cn(
            "group relative block w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-primary/10 to-primary-light/10 sm:rounded-3xl",
            aspectClass,
            hasImages ? "cursor-zoom-in" : "cursor-default",
          )}
          aria-label={hasImages ? "Perbesar gambar" : undefined}
        >
          {hasImages ? (
            <>
              <Image
                src={current.url}
                alt={current.alt || label || ""}
                fill
                sizes="(max-width: 1024px) 100vw, 720px"
                priority
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <span className="pointer-events-none absolute right-3 bottom-3 hidden items-center gap-1.5 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:inline-flex">
                <Expand className="h-3.5 w-3.5" />
                Perbesar
              </span>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/40">
              {placeholderIcon ?? <ImageIcon className="h-16 w-16" />}
            </div>
          )}
        </button>

        {/* Navigasi prev/next (mobile-friendly) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Gambar sebelumnya"
              className="absolute top-1/2 left-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-secondary shadow-md backdrop-blur transition-colors hover:bg-white active:scale-95 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Gambar berikutnya"
              className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-secondary shadow-md backdrop-blur transition-colors hover:bg-white active:scale-95 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <span className="absolute top-3 right-3 rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm sm:hidden">
              {activeIndex + 1}/{total}
            </span>
          </>
        )}
      </div>

      {/* Strip thumbnail */}
      {total > 1 && (
        <div
          ref={stripRef}
          className="no-scrollbar mt-3 flex w-full min-w-0 snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 sm:gap-3"
        >
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Tampilkan gambar ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
              className={cn(
                "relative aspect-video w-20 shrink-0 snap-start overflow-hidden rounded-lg border-2 transition-all sm:w-24 md:w-28",
                i === activeIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-slate-200 opacity-70 hover:opacity-100",
              )}
            >
              <Image src={img.url} alt="" fill sizes="112px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && hasImages && (
        <MediaLightbox
          images={images}
          index={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setLightboxOpen(false)}
          label={`Lihat gambar ${label ?? ""}`.trim()}
        />
      )}
    </section>
  );
}
