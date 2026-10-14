"use client";

import { useRef, type ReactNode } from "react";
import {
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotionPreference } from "@/lib/intro";

/**
 * Rentang offset `useScroll` saat section dianggap "sedang di-pin":
 * mulai ketika bagian atas section mencapai atas viewport, berakhir saat
 * bagian bawah section mencapai bawah viewport. Selama rentang ini konten
 * anak "diam" di layar sementara halaman terus di-scroll.
 */
const PIN_OFFSET: ["start start", "end end"] = ["start start", "end end"];

/** Nilai progres (0–1) selama section ter-pin, untuk dipakai render-prop. */
export type PinProgress = MotionValue<number>;

/**
 * Section "pinned/sticky" untuk storytelling scroll (F3).
 *
 * Struktur:
 * ```
 * <section style={{ height: `${slides * 100}vh` }}>   // memberi ruang scroll
 *   <div class="sticky top-0 h-screen">              // panel yang diam
 *     ...konten yang bertransformasi via render-prop `progress`...
 *   </div>
 * </section>
 * ```
 *
 * PENTING (a11y & performa):
 * - **Tanpa scroll-hijack**: pinning memakai CSS `position: sticky` native.
 *   Scroll pengguna tidak pernah dicegat.
 * - **`prefers-reduced-motion`** → tidak dipin. Section menjadi blok normal dan
 *   konten ditampilkan statis. Bila diberi `aria-label`, `<section>` otomatis
 *   ber-role `region` sehingga struktur tetap bermakna.
 * - **JANGAN** membungkus komponen ini dengan elemen ber-`overflow: hidden`
 *   (atau `overflow-x: hidden`) — itu membuat wrapper menjadi scroll
 *   container dan **mematikan `position: sticky`**. Bila perlu memotong
 *   luapan horizontal, pakai `overflow-x: clip` (bukan `hidden`).
 *
 * @param slides Jumlah "layar" ruang scroll. 1 = tanpa pin (setara blok biasa),
 *               2 = diam selama 1 layar penuh, dst. Minimal 1.
 * @param progress Render-prop: progres 0–1 selama section ter-pin, untuk
 *                 menggerakkan anak (`useTransform(progress, ...)`).
 */
export function PinnedSection({
  slides = 2,
  children,
  className,
  panelClassName,
  "aria-label": ariaLabel,
  id,
}: {
  slides?: number;
  children: (progress: PinProgress) => ReactNode;
  className?: string;
  panelClassName?: string;
  "aria-label"?: string;
  id?: string;
}) {
  const reduced = useReducedMotionPreference();
  const ref = useRef<HTMLElement>(null);
  const total = Math.max(1, Math.round(slides));

  // Hook dipanggil tanpa syarat (aturan hook). Nilai `progress` diabaikan
  // saat `reduced` karena kita tidak merender panel sticky.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: PIN_OFFSET,
  });
  // Clamp 0–1 agar transformasi anak tidak "melampaui" di luar rentang pin.
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1], {
    clamp: true,
  });

  if (reduced) {
    return (
      <section
        id={id}
        ref={ref}
        aria-label={ariaLabel}
        className={cn("relative", className)}
      >
        <div className={cn("mx-auto w-full", panelClassName)}>
          {children(progress)}
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      ref={ref}
      aria-label={ariaLabel}
      className={cn("relative", className)}
      style={{ height: `${total * 100}vh` }}
    >
      <div
        className={cn(
          "sticky top-0 flex h-screen w-full items-center justify-center",
          panelClassName,
        )}
      >
        {children(progress)}
      </div>
    </section>
  );
}
