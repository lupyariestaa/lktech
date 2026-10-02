"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductLightbox, type GalleryImage } from "@/components/product-lightbox";

/**
 * Galeri produk interaktif: gambar besar (16:9) + strip thumbnail.
 *
 * - Klik thumbnail → ganti gambar besar (state `activeIndex`).
 * - Klik gambar besar → buka lightbox (gambar penuh + navigasi).
 * - Semua gambar rasio 16:9 `object-cover`; di lightbox `object-contain`.
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const hasImages = images.length > 0;
  const current = images[activeIndex] ?? images[0];

  return (
    <section>
      {/* Gambar besar */}
      <button
        type="button"
        onClick={() => hasImages && setLightboxOpen(true)}
        className={cn(
          "group relative block aspect-video w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/10 to-primary-light/10",
          hasImages ? "cursor-zoom-in" : "cursor-default",
        )}
        aria-label={hasImages ? "Perbesar gambar" : undefined}
      >
        {hasImages ? (
          <>
            <Image
              src={current.url}
              alt={current.alt || productName}
              fill
              sizes="(max-width: 1024px) 100vw, 720px"
              priority
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <Expand className="h-3.5 w-3.5" />
              Perbesar
            </span>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/40">
            <Package className="h-16 w-16" />
          </div>
        )}
      </button>

      {/* Strip thumbnail */}
      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Tampilkan gambar ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
              className={cn(
                "relative aspect-video w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:w-28",
                i === activeIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-slate-200 opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && hasImages && (
        <ProductLightbox
          images={images}
          index={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </section>
  );
}
