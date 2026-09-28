"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { TESTIMONIALS } from "@/lib/content";
import { SectionHeading } from "@/components/section-heading";
import { staggerContainer, staggerItem } from "@/components/motion";

export function Testimonials() {
  return (
    <section className="relative bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Testimoni"
          title={
            <>
              Kata <span className="text-gradient">klien kami</span>
            </>
          }
          description="Kepercayaan klien adalah prioritas utama kami. Inilah yang mereka rasakan."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.figure
              key={t.name}
              variants={staggerItem}
              className="glass-strong relative flex flex-col rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10"
            >
              <Quote className="h-8 w-8 text-primary/20" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">
                “{t.quote}”
              </blockquote>

              <div className="mt-5 flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-secondary">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
