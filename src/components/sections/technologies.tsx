"use client";

import type { ManagedTechnology } from "@/lib/content-types";
import { Reveal } from "@/components/motion";
import { TechnologyLogo } from "@/components/technology-logo";
import { useContent } from "@/components/content-provider";
import { cn } from "@/lib/utils";

/**
 * Satu baris marquee logo.
 *
 * - `reverse` → baris berjalan ke **kanan**: animasi `marquee` diputar balik
 *   (`animation-direction: reverse`, dari −50 % ke 0 %), jadi loop-nya tetap
 *   mulus karena konten digandakan.
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
}: {
  items: ManagedTechnology[];
  reverse?: boolean;
  decorative?: boolean;
}) {
  const loop = [...items, ...items];
  return (
    <div aria-hidden={decorative || undefined} className="overflow-hidden">
      <div
        className={cn(
          "flex w-max gap-4 [will-change:transform] hover:[animation-play-state:paused]",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
      >
        {loop.map((item, i) => (
          <div
            key={`${item.name}-${i}`}
            aria-hidden={i >= items.length ? true : undefined}
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

  // Tidak ada teknologi → jangan tampilkan section sama sekali.
  if (technologies.length === 0) return null;

  // Baris kedua: urutan dibalik + arah kanan → dua pita yang saling "menenun",
  // bukan salinan yang bergerak serempak ke arah yang sama.
  const reversed = [...technologies].reverse();

  return (
    <section
      id="teknologi"
      className="relative scroll-mt-24 border-y border-slate-100 bg-white py-12"
      aria-label="Teknologi yang kami gunakan"
    >
      <Reveal className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-medium tracking-widest text-muted uppercase">
          Teknologi yang kami gunakan
        </p>
      </Reveal>

      {/* Dua baris marquee: atas ke kiri, bawah ke kanan. Satu mask kiri/kanan
          membungkus keduanya supaya tepinya memudar konsisten. */}
      <div className="relative mt-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />
        <div className="flex flex-col gap-3">
          <MarqueeRow items={technologies} />
          <MarqueeRow items={reversed} reverse decorative />
        </div>
      </div>
    </section>
  );
}
