"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import type { HeroShowcaseEffect, HeroShowcaseImage } from "@/lib/content-types";
import { useReducedMotionPreference } from "@/lib/intro";
import { cn } from "@/lib/utils";

/**
 * Carousel gambar untuk mockup hero.
 * - Berganti otomatis sesuai `interval` (detik).
 * - Efek transisi `fade` atau `slide`.
 * - Bila daftar kosong / nonaktif → tampilkan placeholder halus.
 * - `prefers-reduced-motion` → tanpa auto-rotate (hanya gambar pertama).
 */
export function HeroShowcaseCarousel({
  images,
  enabled,
  interval,
  effect,
  sizes,
  className,
  priority,
}: {
  images: HeroShowcaseImage[];
  enabled: boolean;
  interval: number; // detik
  effect: HeroShowcaseEffect;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const reduced = useReducedMotionPreference();
  const [index, setIndex] = useState(0);
  const count = images.length;
  const active = enabled && count > 0;
  const autoRotate = active && count > 1 && !reduced;

  // Auto-rotate. `safeIndex` (di bawah) sudah membatasi index agar tetap valid
  // saat daftar berubah, jadi effect ini tidak perlu setState sinkron.
  useEffect(() => {
    if (!autoRotate) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, Math.max(2, interval) * 1000);
    return () => clearInterval(id);
  }, [autoRotate, count, interval]);

  // Gambar saat ini (aman bila index di luar rentang).
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = active ? images[safeIndex] : null;

  if (!current) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center",
          "bg-gradient-to-br from-primary via-primary to-primary-light",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-white/80">
          <ImageIcon className="h-8 w-8" />
          <span className="text-xs font-medium">Pratinjau</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <AnimatePresence initial={false}>
        <motion.div
          key={`${current.url}-${safeIndex}`}
          initial={
            effect === "slide"
              ? { opacity: 0, x: 40 }
              : { opacity: 0 }
          }
          animate={{ opacity: 1, x: 0 }}
          exit={
            effect === "slide"
              ? { opacity: 0, x: -40 }
              : { opacity: 0 }
          }
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={current.url}
            alt={current.alt || "Pratinjau LKTech"}
            fill
            sizes={sizes ?? "(max-width: 1024px) 90vw, 480px"}
            priority={priority}
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Indikator titik */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <span
              key={`${img.url}-${i}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
