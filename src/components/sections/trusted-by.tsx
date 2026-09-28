import { CLIENTS } from "@/lib/content";
import { Reveal } from "@/components/motion";

export function TrustedBy() {
  // Konten digandakan agar animasi marquee mulus; set kedua disembunyikan
  // dari screen reader supaya tidak dibaca dua kali.
  const items = [...CLIENTS, ...CLIENTS];
  return (
    <section
      className="relative border-y border-slate-100 bg-white py-12"
      aria-label="Klien yang mempercayai kami"
    >
      <Reveal className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-medium tracking-widest text-muted uppercase">
          Dipercaya oleh bisnis &amp; institusi
        </p>
      </Reveal>

      <div className="relative mt-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />
        <div className="group flex w-max animate-marquee gap-4 [will-change:transform] hover:[animation-play-state:paused]">
          {items.map((name, i) => (
            <div
              key={`${name}-${i}`}
              aria-hidden={i >= CLIENTS.length ? true : undefined}
              className="flex h-14 items-center gap-2 rounded-2xl border border-slate-100 bg-surface px-6 text-sm font-semibold whitespace-nowrap text-slate-400 transition-colors hover:text-primary"
            >
              <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                {name.charAt(0)}
              </span>
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
