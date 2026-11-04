"use client";

import { useEffect, useRef, useState } from "react";
import type { ManagedTechnology } from "@/lib/content-types";
import { Reveal } from "@/components/motion";
import { TechnologyLogo } from "@/components/technology-logo";
import { MotionToggle } from "@/components/motion-toggle";
import { useContent } from "@/components/content-provider";
import { useReducedMotionPreference } from "@/lib/intro";
import { cn } from "@/lib/utils";

/**
 * Satu baris marquee logo.
 *
 * - `reverse` → baris berjalan ke **kanan**: animasi `marquee` diputar balik
 *   (`animation-direction: reverse`, dari −50 % ke 0 %), jadi loop-nya tetap
 *   mulus karena konten digandakan dan padding akhir menyamakan jarak seam.
 * - `decorative` → baris kedua hanyalah gema visual; seluruh baris
 *   `aria-hidden` supaya daftar teknologi tidak dibacakan dua kali.
 *
 * Konten selalu digandakan (`2×`) untuk loop mulus; salinan kedua juga
 * `aria-hidden` agar screen reader tidak membacanya dua kali.
 */
function MarqueeRow({
  items,
  reverse = false,
  decorative = false,
  paused = false,
}: {
  items: ManagedTechnology[];
  reverse?: boolean;
  decorative?: boolean;
  paused?: boolean;
}) {
  const loop = [...items, ...items];
  return (
    <div aria-hidden={decorative || undefined} className="overflow-hidden">
      <div
        className={cn(
          "flex w-max gap-4 pr-4",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
        role={decorative ? undefined : "list"}
        style={{
          animationPlayState: paused ? "paused" : undefined,
          willChange: paused ? "auto" : "transform",
        }}
      >
        {loop.map((item, i) => (
          <div
            key={`${item.name}-${i}`}
            aria-hidden={i >= items.length ? true : undefined}
            role={decorative ? undefined : "listitem"}
          >
            <TechnologyLogo item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Technologies() {
  const { technologies } = useContent();
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotionPreference();
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin: "0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Tidak ada teknologi → jangan tampilkan section sama sekali.
  if (technologies.length === 0) return null;

  // Baris kedua: urutan dibalik + arah kanan → dua pita yang saling "menenun",
  // bukan salinan yang bergerak serempak ke arah yang sama.
  const reversed = [...technologies].reverse();

  return (
    <section
      ref={sectionRef}
      id="teknologi"
      className="relative scroll-mt-24 border-y border-slate-100 bg-white py-12"
    >
      <Reveal className="mx-auto max-w-6xl px-6">
        <div className="relative flex flex-col items-center gap-3 sm:block">
          <h2 className="text-center text-xs font-medium tracking-widest text-muted uppercase">
            Teknologi yang kami gunakan
          </h2>
          {/* WCAG 2.2.2: kontrol jeda yang bisa dipakai keyboard & sentuh. */}
          {!reduced && (
            <MotionToggle
              paused={paused}
              onToggle={() => setPaused((v) => !v)}
              label="animasi logo teknologi"
              className="sm:absolute sm:top-1/2 sm:right-0 sm:-translate-y-1/2"
            />
          )}
        </div>
      </Reveal>

      {/* Reduced motion: tampilkan seluruh logo dalam grid statis; tanpa mask
          atau overflow tersembunyi agar tidak ada item yang terpotong. */}
      {/* Dua baris marquee: atas ke kiri, bawah ke kanan. Satu mask kiri/kanan
          membungkus keduanya supaya tepinya memudar konsisten. */}
      {reduced ? (
        <ul className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-3 px-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {technologies.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex justify-center">
              <TechnologyLogo item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="relative mt-8 overflow-hidden"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />
          <div className="flex flex-col gap-3">
            <MarqueeRow items={technologies} paused={paused || hovered || !inView} />
            <MarqueeRow
              items={reversed}
              reverse
              decorative
              paused={paused || hovered || !inView}
            />
          </div>
        </div>
      )}
    </section>
  );
}
