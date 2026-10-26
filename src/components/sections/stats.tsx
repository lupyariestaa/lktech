"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useContent } from "@/components/content-provider";
import { isDefaultStats } from "@/lib/content-types";
import { formatStatNumber, publishableStats } from "@/lib/stats-pure";
import { useReducedMotionPreference } from "@/lib/intro";
import { SectionSeam } from "@/components/section-seam";

function Counter({
  value,
  suffix,
  instant,
}: {
  value: number;
  suffix: string;
  instant?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  // Bila reduced-motion: nilai awal = nilai penuh (tanpa animasi). Selain itu
  // mulai dari 0 lalu dihitung saat masuk viewport.
  const [display, setDisplay] = useState(instant ? value : 0);

  useEffect(() => {
    // A11y (FASE H4): tanpa animasi bila `prefers-reduced-motion`.
    if (instant || !inView) return;
    const duration = 1600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, instant]);

  return (
    <span ref={ref} className="tabular-nums">
      {formatStatNumber(display)}
      {suffix}
    </span>
  );
}

/** Format tanggal periode (ISO) ke gaya Indonesia; fallback ke teks asli. */
function formatAsOf(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function Stats() {
  const { stats, statsAsOf } = useContent();
  const reduced = useReducedMotionPreference();

  // Kejujuran data (FASE H2): hanya tampilkan angka yang BOLEH tayang.
  // - Mode verifikasi: hanya item bertanda `verified`.
  // - Mode lama: sembunyikan bila masih berisi angka CONTOH bawaan.
  const items = publishableStats(stats, isDefaultStats(stats));
  if (items.length === 0) return null;

  const asOf = statsAsOf?.trim();

  // Grid menyesuaikan jumlah item agar tidak ada baris "menggantung".
  const gridClass =
    items.length === 1
      ? "grid-cols-1"
      : items.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : items.length === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-2 lg:grid-cols-4";

  return (
    <section
      id="statistik"
      aria-labelledby="statistik-heading"
      className="relative scroll-mt-24 overflow-hidden bg-secondary py-20"
    >
      {/* Jahitan (F2): leburkan batas terang→gelap & gelap→terang agar tidak
          "memotong keras". Diletakkan sebelum konten (urutan DOM) agar konten
          tetap di atas. Tetangga atas & bawah sama-sama `bg-surface`. */}
      <SectionSeam edge="top" from="surface" />
      <SectionSeam edge="bottom" from="surface" />

      <div className="grid-lines absolute inset-0 opacity-[0.06]" />
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 animate-aurora rounded-full bg-primary/40 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 animate-aurora rounded-full bg-primary-light/30 blur-[110px] [animation-delay:-5s]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Judul untuk pembaca layar (tidak tampil) — memberi konteks section. */}
        <h2 id="statistik-heading" className="sr-only">
          Statistik LKTech
        </h2>

        <div className={`grid gap-6 sm:gap-8 ${gridClass}`}>
          {items.map((stat, i) => (
            <motion.div
              key={`${stat.label}-${i}`}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="text-center"
            >
              {/* Angka beranimasi disembunyikan dari AT; versi final dibacakan
                  lewat teks sr-only di bawah agar tidak terbaca nilai antara. */}
              <p
                aria-hidden="true"
                className="text-3xl font-bold text-white sm:text-5xl"
              >
                <Counter value={stat.value} suffix={stat.suffix} instant={reduced} />
              </p>
              <p className="mt-2 text-xs font-medium text-white/60 sm:text-sm">
                {stat.label}
              </p>
              {stat.note && (
                <p className="mt-1 text-[11px] text-white/45">{stat.note}</p>
              )}
              <span className="sr-only">
                {stat.label}: {formatStatNumber(stat.value)}
                {stat.suffix}.
              </span>
            </motion.div>
          ))}
        </div>

        {/* Konteks kejujuran (FASE H2): angka bersifat kumulatif, bukan klaim
            waktu tertentu. Caption halus agar tidak menyesatkan. Kontras dijaga
            ≥ AA (white/60 di atas latar gelap). */}
        <p className="mt-8 text-center text-xs text-white/60">
          {asOf
            ? `Angka kumulatif per ${formatAsOf(asOf)} — diperbarui berkala.`
            : "Angka kumulatif sejak berdiri, diperbarui berkala."}
        </p>
      </div>
    </section>
  );
}