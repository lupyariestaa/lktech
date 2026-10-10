"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Braces, Code2, MessageCircle, Star } from "lucide-react";
import { ButtonAnchor } from "@/components/ui/button";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { trackCtaClick } from "@/lib/analytics";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { COMPANY } from "@/lib/content";
import type { HeroShowcase } from "@/lib/content-types";
import { isDefaultStats } from "@/lib/content-types";
import { useSettings } from "@/components/settings-provider";
import { useContent } from "@/components/content-provider";
import { HeroShowcaseCarousel } from "@/components/hero-showcase-carousel";
import { introDelay, useReducedMotionPreference } from "@/lib/intro";

function DeviceMockups({
  showcase,
  socialProof,
}: {
  showcase: HeroShowcase;
  socialProof?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), {
    stiffness: 120,
    damping: 18,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), {
    stiffness: 120,
    damping: 18,
  });

  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative mx-auto w-full max-w-lg [perspective:1400px]"
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative"
      >
        {/* Browser card */}
        <div className="glass-strong overflow-hidden rounded-3xl shadow-2xl shadow-slate-900/10">
          <div className="flex items-center gap-1.5 border-b border-slate-100 bg-white/60 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="ml-3 h-5 flex-1 rounded-full bg-slate-100" />
          </div>
          <div className="relative aspect-[16/10] w-full">
            <HeroShowcaseCarousel
              images={showcase.browser}
              enabled={showcase.enabled}
              interval={showcase.interval}
              effect={showcase.effect}
              sizes="(max-width: 1024px) 90vw, 512px"
              priority
            />
          </div>
        </div>

        {/* Phone card */}
        <motion.div
          className="absolute -right-1 -bottom-10 w-28 sm:-right-10 sm:-bottom-12 sm:w-44"
          style={{ transform: "translateZ(80px)" }}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="glass-strong overflow-hidden rounded-[2rem] p-2 shadow-2xl shadow-primary/20">
            <div className="overflow-hidden rounded-[1.6rem] bg-white p-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
              <div className="relative aspect-[9/16] overflow-hidden rounded-xl">
                <HeroShowcaseCarousel
                  images={showcase.mobile}
                  enabled={showcase.enabled}
                  interval={showcase.interval}
                  effect={showcase.effect}
                  sizes="180px"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating chips */}
        <motion.div
          className="glass-strong absolute -top-4 -left-2 flex items-center gap-2 rounded-2xl px-3 py-2 shadow-lg sm:-top-5 sm:-left-8"
          style={{ transform: "translateZ(60px)" }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        >
          {socialProof ?? (
            <>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                <Star className="h-4 w-4 fill-current" />
              </span>
              <div>
                <p className="text-xs font-bold text-secondary">Garansi</p>
                <p className="text-[10px] text-muted">Kualitas</p>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          className="glass-strong absolute top-1/3 -right-6 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-lg sm:flex"
          style={{ transform: "translateZ(100px)" }}
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary">
            <Braces className="h-4 w-4" />
          </span>
          <p className="text-xs font-semibold text-secondary">Clean Code</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function Hero({ socialProof }: { socialProof?: ReactNode } = {}) {
  const reduced = useReducedMotionPreference();
  const settings = useSettings();
  const { hero, stats } = useContent();
  const base = introDelay(reduced);

  // Kejujuran data (FASE H2): klaim sosial di bawah CTA hanya ditampilkan bila
  // berasal dari data NYATA — bukan stat placeholder bawaan.
  const honestStats = isDefaultStats(stats) ? [] : stats;
  const clientStat = honestStats.find((s) => /klien/i.test(s.label));

  return (
    <section
      id="beranda"
      className="relative flex min-h-screen items-center overflow-hidden pt-32 pb-20"
    >
      {/* Background layers */}
      <div className="grid-lines absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[32rem] w-[32rem] animate-aurora rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-[28rem] w-[28rem] animate-aurora rounded-full bg-primary-light/25 blur-[120px] [animation-delay:-6s]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: base, duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
          >
            <Code2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Solusi Digital untuk Bisnis Anda
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: base + 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-4xl leading-[1.05] font-bold text-secondary sm:text-5xl lg:text-6xl"
          >
            Teknologi Modern,
            <br />
            <span className="text-gradient">Hasil Nyata</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: base + 0.3, duration: 0.7 }}
            className="mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
          >
            {COMPANY.name} membantu bisnis naik kelas lewat pembuatan website,
            aplikasi mobile, dan konsultasi teknologi yang mudah diakses,
            terjangkau, dan berkualitas.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: base + 0.45, duration: 0.7 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <TrackedWaButton
              location="hero"
              href={waLink(WA_MESSAGES.general, settings.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              className="group"
            >
              <MessageCircle className="h-5 w-5" />
              Mulai Konsultasi
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </TrackedWaButton>
            <ButtonAnchor
              href="#layanan"
              size="lg"
              variant="outline"
              onClick={() => trackCtaClick("hero", "#layanan")}
            >
              Lihat Layanan
            </ButtonAnchor>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: base + 0.6, duration: 0.7 }}
            className="mt-10 flex items-center gap-6"
          >
            {clientStat && (
              <p className="text-sm text-muted">
                <span className="font-semibold text-secondary">
                  {clientStat.value}
                  {clientStat.suffix}
                </span>{" "}
                klien telah mempercayai kami
              </p>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: base + 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <DeviceMockups showcase={hero} socialProof={socialProof} />
        </motion.div>
      </div>
    </section>
  );
}
