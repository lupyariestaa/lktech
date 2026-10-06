"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useContent } from "@/components/content-provider";
import { isDefaultStats } from "@/lib/content-types";

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
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
  }, [inView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

export function Stats() {
  const { stats } = useContent();

  // Kejujuran data (FASE H2): sembunyikan bila kosong ATAU masih berisi
  // angka CONTOH bawaan (mis. "20+ Proyek") — hindari klaim tanpa dasar.
  // Admin mengisi angka nyata via /admin/content.
  if (stats.length === 0 || isDefaultStats(stats)) return null;

  return (
    <section id="statistik" className="relative scroll-mt-24 overflow-hidden bg-secondary py-20">
      <div className="grid-lines absolute inset-0 opacity-[0.06]" />
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 animate-aurora rounded-full bg-primary/40 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 animate-aurora rounded-full bg-primary-light/30 blur-[110px] [animation-delay:-5s]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-white sm:text-5xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-xs font-medium text-white/60 sm:text-sm">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Konteks kejujuran (FASE H2): angka bersifat kumulatif, bukan klaim
            waktu tertentu. Caption halus agar tidak menyesatkan. */}
        <p className="mt-8 text-center text-xs text-white/40">
          Angka kumulatif sejak berdiri, diperbarui berkala.
        </p>
      </div>
    </section>
  );
}
