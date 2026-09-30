"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { useContent } from "@/components/content-provider";

export function Process() {
  const { process } = useContent();

  if (process.length === 0) return null;

  return (
    <section className="relative bg-surface py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Alur Kerja"
          title={
            <>
              Proses yang <span className="text-gradient">jelas &amp; transparan</span>
            </>
          }
          description="Empat langkah sederhana dari ide hingga produk digital Anda siap digunakan."
        />

        <div className="relative mt-16">
          {/* connecting line */}
          <div className="absolute top-8 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-4">
            {process.map((item, i) => (
              <Reveal key={item.step} delay={i * 0.1} className="relative">
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <div className="relative z-10 grid h-16 w-16 place-items-center rounded-2xl border border-primary/15 bg-white text-lg font-bold text-primary shadow-lg shadow-primary/5">
                    {item.step}
                    <motion.span
                      className="absolute inset-0 rounded-2xl border border-primary/30"
                      animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                    />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-secondary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
