"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/icon";
import { SectionHeading } from "@/components/section-heading";
import { staggerContainer, staggerItem } from "@/components/motion";
import { useContent } from "@/components/content-provider";
import { useReducedMotionPreference } from "@/lib/intro";

export function WhyUs() {
  const { whyUs } = useContent();
  const reduced = useReducedMotionPreference();

  if (whyUs.length === 0) return null;

  return (
    <section id="keunggulan" className="relative scroll-mt-24 overflow-hidden bg-surface py-24">
      <div className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-primary/5 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Keunggulan"
          title={
            <>
              Kenapa memilih{" "}
              <span className="text-gradient">LKTech?</span>
            </>
          }
          description="Kami bukan sekadar vendor. Kami partner yang peduli pada hasil dan pertumbuhan bisnis Anda."
        />

        <motion.div
          variants={staggerContainer}
          initial={reduced ? false : "hidden"}
          whileInView={reduced ? undefined : "show"}
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {whyUs.map((item) => (
            <motion.div
              key={item.title}
              variants={staggerItem}
              className="group relative rounded-3xl border border-slate-100 bg-surface p-6 transition-all duration-300 hover:border-primary/20 hover:bg-white hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                <Icon name={item.icon} className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-base font-bold text-secondary">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
