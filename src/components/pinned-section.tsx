"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useScroll, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

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
 * <section style={{ "--pin-h": "N00vh" }}>            // ruang scroll
 *   <div class="motion-safe:md:sticky ... h-screen">  // panel yang diam
 *     ...konten yang bertransformasi via render-prop `progress`...
 *   </div>
 * </section>
 * ```
 *
 * PENTING (a11y, performa, & anti-CLS):
 * - **Tanpa scroll-hijack**: pinning memakai CSS `position: sticky` native.
 *   Scroll pengguna tidak pernah dicegat.
 * - **Digerakkan CSS, bukan JS**: pinning hanya aktif pada `md:` **dan**
 *   `motion-safe:` (yakni `@media (prefers-reduced-motion: no-preference)`).
 *   Konsekuensinya: (a) server & klien merender markup yang sama → tanpa
 *   hydration mismatch; (b) tidak ada lompatan layout setelah mount (anti-CLS);
 *   (c) pengguna `prefers-reduced-motion` otomatis mendapat alur normal (statis);
 *   (d) tetap berfungsi tanpa JavaScript untuk tata letak.
 * - **JANGAN** membungkus komponen ini dengan elemen ber-`overflow: hidden`
 *   (atau `overflow-x: hidden`) — itu membuat wrapper menjadi scroll
 *   container dan **mematikan `position: sticky`**. Bila perlu memotong
 *   luapan horizontal, pakai `overflow-x: clip` (bukan `hidden`).
 *
 * @param slides Jumlah "layar" ruang scroll. 1 = tanpa pin (setara blok biasa),
 *               2 = diam selama 1 layar penuh, dst. Minimal 1.
 * @param children Render-prop: progres 0–1 selama section ter-pin, untuk
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
  const ref = useRef<HTMLElement>(null);
  const total = Math.max(1, Math.round(slides));

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: PIN_OFFSET,
  });
  // Clamp 0–1 agar transformasi anak tidak "melampaui" di luar rentang pin.
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1], {
    clamp: true,
  });

  return (
    <section
      id={id}
      ref={ref}
      aria-label={ariaLabel}
      className={cn("relative motion-safe:md:h-[var(--pin-h)]", className)}
      style={{ "--pin-h": `${total * 100}vh` } as CSSProperties}
    >
      <div
        className={cn(
          "motion-safe:md:sticky motion-safe:md:top-0 motion-safe:md:flex motion-safe:md:h-screen motion-safe:md:items-center motion-safe:md:justify-center",
          panelClassName,
        )}
      >
        {children(progress)}
      </div>
    </section>
  );
}
