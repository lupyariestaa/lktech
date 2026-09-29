import { TECH_STACK } from "@/lib/content";
import { Reveal } from "@/components/motion";
import { TechnologyLogo } from "@/components/technology-logo";

export function Technologies() {
  // Konten digandakan agar animasi marquee mulus; set kedua disembunyikan
  // dari screen reader supaya tidak dibaca dua kali.
  const items = [...TECH_STACK, ...TECH_STACK];
  return (
    <section
      className="relative border-y border-slate-100 bg-white py-12"
      aria-label="Teknologi yang kami gunakan"
    >
      <Reveal className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-medium tracking-widest text-muted uppercase">
          Teknologi yang kami gunakan
        </p>
      </Reveal>

      <div className="relative mt-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />
        <div className="group flex w-max animate-marquee gap-4 [will-change:transform] hover:[animation-play-state:paused]">
          {items.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              aria-hidden={i >= TECH_STACK.length ? true : undefined}
            >
              <TechnologyLogo item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
