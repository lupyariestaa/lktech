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
    <section id="keunggulan" className="relative scroll-mt-24 overflow-hidden bg-surface py-20 sm:py-24">
      <div className="pointer-events-none absolute -top-20 right-0 h-80 w-80 rounded-full bg-primary/7 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-36 -left-24 h-72 w-72 rounded-full bg-blue-200/20 blur-[100px]" />

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
          className="mt-12 grid auto-rows-fr gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
        >
          {whyUs.map((item, index) => {
            const featured = index === 0;

            return (
              <motion.div
                key={item.title}
                variants={staggerItem}
                className={
                  featured
                    ? "group relative isolate flex min-h-52 flex-col overflow-hidden rounded-3xl border border-primary bg-gradient-to-br from-primary via-blue-600 to-blue-700 p-6 text-white shadow-xl shadow-primary/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 motion-reduce:transform-none motion-reduce:transition-none sm:p-7"
                    : "group relative flex min-h-52 flex-col rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/8 motion-reduce:transform-none motion-reduce:transition-none sm:p-7"
                }
              >
                {featured && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-3 -bottom-12 z-0 select-none text-[11rem] leading-none font-black tracking-tighter text-white/[0.07]"
                  >
                    01
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className={`absolute top-6 right-6 text-xs font-bold tracking-[0.18em] ${featured ? "text-white/55" : "text-slate-300"}`}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div
                  className={`relative z-10 grid h-12 w-12 place-items-center rounded-2xl transition-all duration-300 group-hover:scale-105 motion-reduce:transition-none ${
                    featured
                      ? "bg-white/15 text-white ring-1 ring-white/20 group-hover:bg-white/25"
                      : "bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white"
                  }`}
                >
                  <Icon name={item.icon} className="h-6 w-6" />
                </div>
                <h3 className={`relative z-10 mt-5 pr-10 text-base font-bold ${featured ? "text-white" : "text-secondary"}`}>
                  {item.title}
                </h3>
                <p className={`relative z-10 mt-2 max-w-sm text-sm leading-relaxed ${featured ? "text-blue-50/90" : "text-muted"}`}>
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
