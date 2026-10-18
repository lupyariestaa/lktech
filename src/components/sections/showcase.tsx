"use client";

import { useContent } from "@/components/content-provider";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { HeroShowcaseCarousel } from "@/components/hero-showcase-carousel";
import { ShowcaseBand } from "@/components/sections/showcase-band";

/**
 * Section "Pratinjau" (F7) — hasil desain yang sebelumnya menjadi mockup di
 * kolom kanan hero. Hero kini menampilkan inti digital 3D; mockup dipindah ke
 * sini agar tetap tampil sebagai bukti visual.
 *
 * F7.5: gambar tidak lagi berupa carousel satu kartu, melainkan **band
 * melengkung** (`ShowcaseBand`) yang mengalir terus — gambar yang sama, cara
 * tampil yang jauh lebih megah. Bila belum ada gambar / fitur dimatikan, kartu
 * mockup browser lama dipertahankan sebagai keadaan kosong yang rapi.
 * `aspectRatio` 1.6 = rasio asli tangkapan layar (1902×1198), jadi `object-cover`
 * praktis tidak memotong isinya.
 *
 * Hanya memakai gambar `browser` (desktop) — mockup ponsel (`mobile`) sengaja
 * belum dipakai. Konten diambil dari `hero` (pengaturan yang sama, dikelola di
 * dashboard) sehingga tidak ada data baru/duplikat.
 */
export function Showcase() {
  const { hero } = useContent();
  const hasImages = hero.enabled && hero.browser.length > 0;

  return (
    <section
      id="pratinjau"
      aria-label="Pratinjau hasil desain"
      className="relative scroll-mt-24 overflow-hidden bg-white py-24"
    >
      {/* Latar lembut agar gambar terasa "berpanggung" (bukan menempel datar). */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface via-white to-white" />
      <div className="pointer-events-none absolute -right-24 -top-16 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="Pratinjau"
            title={
              <>
                Tampilan yang{" "}
                <span className="text-gradient">meyakinkan</span>
              </>
            }
            description="Antarmuka modern, cepat, dan responsif — dirancang agar bisnis Anda tampil profesional di mata pelanggan, di perangkat apa pun."
          />
        </Reveal>
      </div>

      {hasImages ? (
        /* Full-bleed: ujung band melengkung & memudar ke tepi layar. */
        <Reveal delay={0.1} className="mt-14">
          <ShowcaseBand
            images={hero.browser}
            speed={3}
            tileHeight={52}
            aspectRatio={1.6}
            className="h-[280px] sm:h-[340px] lg:h-[400px]"
          />
        </Reveal>
      ) : (
        <div className="relative mx-auto mt-14 max-w-6xl px-6">
          <div className="relative mx-auto max-w-5xl">
            {/* Glow dasar agar kartu "mengambang". */}
            <div className="pointer-events-none absolute inset-x-8 -bottom-6 h-24 rounded-[50%] bg-primary/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
              {/* Bilah browser. */}
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div className="ml-3 hidden h-5 flex-1 items-center rounded-full bg-white px-3 text-[10px] text-muted sm:flex">
                  lktech.vercel.app
                </div>
              </div>

              <div className="relative aspect-[16/10] w-full">
                <HeroShowcaseCarousel
                  images={hero.browser}
                  enabled={hero.enabled}
                  interval={hero.interval}
                  effect={hero.effect}
                  sizes="(max-width: 1024px) 92vw, 1024px"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}