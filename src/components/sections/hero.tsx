"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import dynamic from "next/dynamic";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  Code2,
  MessageCircle,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { ButtonAnchor } from "@/components/ui/button";
import { TrackedWaButton } from "@/components/tracked-wa-button";
import { trackCtaClick } from "@/lib/analytics";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { COMPANY } from "@/lib/content";
import { isDefaultStats } from "@/lib/content-types";
import { useSettings } from "@/components/settings-provider";
import { useContent } from "@/components/content-provider";
import { introDelay, useReducedMotionPreference } from "@/lib/intro";
import { MEDIA_QUERIES, useMediaQuery } from "@/lib/use-media-query";

/**
 * Scene 3D hero (F5) — lazy + client-only (`ssr: false`) agar `three` hanya
 * diunduh di layar besar & bukan pada bundel/SSR awal. Hanya di-mount saat
 * `≥768px` dan bukan reduced-motion (lihat `sceneEnabled` di `Hero`).
 */
const Hero3D = dynamic(() => import("@/components/sections/hero-3d"), {
  ssr: false,
});

/**
 * Cahaya halus yang mengikuti kursor (desktop saja).
 *
 * Mendengarkan `mousemove` pada container hero (via `containerRef`) dan
 * memakai motion value + pegas agar gerakannya lembut. Menggerakkan elemen
 * dengan `transform` (motion `x`/`y`) — GPU-friendly, tanpa re-render React.
 * Mulai tak terlihat lalu memudar masuk saat mouse pertama bergerak (menghindari
 * "disc" yang menggantung di posisi awal). Hanya di-mount pada layar besar &
 * bukan reduced-motion (lihat `cursorEnabled` di `Hero`).
 */
function CursorGlow({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  // Ukuran elemen 36rem = 576px → offset separuh (288px) agar pusat tepat di kursor.
  const HALF = 288;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 90, damping: 25, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 90, damping: 25, mass: 0.4 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      x.set(e.clientX - rect.left - HALF);
      y.set(e.clientY - rect.top - HALF);
      if (opacity.get() === 0) opacity.set(1);
    };
    el.addEventListener("mousemove", onMove, { passive: true });
    return () => el.removeEventListener("mousemove", onMove);
  }, [containerRef, x, y, opacity]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-0 h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-[120px]"
      style={{ x: sx, y: sy, opacity }}
    />
  );
}

/**
 * Blok teks "naik + fokus" untuk animasi masuk (entrance). Dipakai lewat
 * `variants` supaya bisa di-stagger oleh induknya (tanpa delay manual).
 */
const rise: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Baris judul: muncul dari balik "topeng" (`overflow-hidden`) — animasi
 * `transform` saja (ramah kompositor) & teks tetap utuh untuk SEO/screen reader.
 */
const lineUp: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Judul hero: dua baris yang **muncul dari balik topeng** (`overflow-hidden`)
 * saat masuk — kesan editorial/premium, `transform` saja (tanpa layout shift).
 *
 * Tetap **satu `<h1>`** dengan teks utuh (SEO & screen reader); baris 2 gradient
 * utuh sebagai satu unit agar gradiennya menyambung rapi. Saat reduced-motion
 * dirender statis tanpa animasi.
 */
function AnimatedHeadline({ reduced }: { reduced: boolean }) {
  if (reduced) {
    return (
      <>
        <span className="block">Teknologi Modern,</span>
        <span className="text-gradient block">Hasil Nyata</span>
      </>
    );
  }

  return (
    <>
      {/* `pb` + `-mb` sama besar → descender (g/y) tidak terpotong topeng. */}
      <span className="block overflow-hidden pb-[0.16em] -mb-[0.16em]">
        <motion.span variants={lineUp} className="block">
          Teknologi Modern,
        </motion.span>
      </span>
      <span className="block overflow-hidden pb-[0.16em] -mb-[0.16em]">
        <motion.span variants={lineUp} className="block">
          <span className="text-gradient">Hasil Nyata</span>
        </motion.span>
      </span>
    </>
  );
}

/** Satu butir pada trust bar hero (ikon + teks). */
function TrustItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="group inline-flex items-center gap-2 text-sm text-muted">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-50 text-primary transition-transform duration-300 group-hover:scale-110">
        {icon}
      </span>
      {children}
    </span>
  );
}

/**
 * Blok konten dengan **dua lapis gerak**: `variants` untuk animasi masuk
 * (di-stagger oleh induk) + `y` (motion value) untuk parallax saat scroll.
 * Dipisah dua `<div>` supaya animasi `y` dari variant dan dari scroll tidak
 * saling menimpa.
 */
function Block({
  variants,
  y,
  className,
  children,
}: {
  variants: Variants;
  y?: MotionValue<number>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div className={className} style={y ? { y } : undefined}>
      <motion.div variants={variants}>{children}</motion.div>
    </motion.div>
  );
}

/**
 * Pembungkus "magnet": isinya bergeser halus mengikuti kursor (spring), lalu
 * kembali ke posisi awal. Hanya desktop (pointer presisi) & bukan reduced-motion
 * — kalau tidak, anak dirender polos tanpa pembungkus.
 */
function Magnetic({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 20, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 20, mass: 0.4 });

  if (!enabled) return <>{children}</>;

  return (
    <motion.div
      className="inline-flex"
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (!r.width || !r.height) return;
        x.set(((e.clientX - r.left) / r.width - 0.5) * 10);
        y.set(((e.clientY - r.top) / r.height - 0.5) * 8);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Angka yang "berhitung naik" sekali saat masuk viewport. Menulis langsung ke
 * DOM (`textContent`) lewat `animate()` → **tanpa re-render** tiap frame.
 * Nilai non-numerik atau reduced-motion dirender apa adanya.
 */
function CountUp({
  to,
  suffix,
  reduced,
  className,
}: {
  to: string | number;
  suffix?: ReactNode;
  reduced: boolean;
  className?: string;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const inView = useInView(box, { once: true, margin: "-10% 0px" });
  const text = String(to);
  const numeric = /^\s*\d[\d.\s]*\s*$/.test(text);
  const target = numeric ? Number.parseInt(text.replace(/[^\d]/g, ""), 10) : NaN;

  useEffect(() => {
    if (reduced || !inView || !Number.isFinite(target)) return;
    const el = num.current;
    if (!el) return;
    const controls = animate(0, target, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, reduced, target]);

  return (
    <span ref={box} className={className}>
      <span ref={num}>{text}</span>
      {suffix}
    </span>
  );
}

/**
 * Fallback CSS statis untuk visual hero (tablet ke atas) saat scene 3D tidak
 * aktif — mis. `prefers-reduced-motion` — atau belum selesai diunduh. Bentuk
 * "inti digital" murni CSS, TANPA animasi, jadi aman untuk reduced-motion.
 */
function CoreFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative h-[74%] w-[74%]">
        <div className="absolute inset-0 rounded-full bg-primary/25 blur-[90px]" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_26%,#c9dcff_0%,#2a6bff_34%,#0a1a4d_82%)] shadow-[0_0_140px_-20px_rgba(42,107,255,0.85)]" />
        <div className="absolute top-1/2 left-1/2 h-[125%] w-[125%] -translate-x-1/2 -translate-y-1/2 rotate-[18deg] rounded-[50%] border border-primary-light/40" />
        <div className="absolute top-1/2 left-1/2 h-[148%] w-[148%] -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] rounded-[50%] border border-primary-light/25" />
      </div>
    </div>
  );
}

export function Hero() {
  const reduced = useReducedMotionPreference();
  const settings = useSettings();
  const { stats } = useContent();
  const base = introDelay(reduced);
  // Entrance: satu induk yang men-stagger tiap blok teks (bukan delay manual).
  const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: base } },
  };
  // Efek kursor hanya untuk layar besar (tablet ke atas) & bukan reduced-motion.
  const isDesktop = useMediaQuery(MEDIA_QUERIES.desktopUp);
  const cursorEnabled = isDesktop && !reduced;
  // Scene 3D (F5): hanya tablet ke atas & bukan reduced-motion.
  const isTabletUp = useMediaQuery(MEDIA_QUERIES.tabletUp);
  const sceneEnabled = isTabletUp && !reduced;

  const sectionRef = useRef<HTMLElement>(null);

  // Parallax ringan: konten naik & memudar halus saat halaman di-scroll turun.
  // Rentang: dari saat hero menyentuh atas viewport hingga hero keluar.
  // Fade dimulai belakangan (0.35) agar konten tidak "hilang" terlalu cepat.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // Parallax berlapis: tiap blok teks turun dengan laju berbeda → terasa
  // "mengurai" saat hero ditinggalkan (bukan satu blok yang kaku).
  const yKicker = useTransform(scrollYProgress, [0, 1], [0, -18]);
  const yHead = useTransform(scrollYProgress, [0, 1], [0, -38]);
  const yPara = useTransform(scrollYProgress, [0, 1], [0, -26]);
  const yCta = useTransform(scrollYProgress, [0, 1], [0, -14]);
  const yTrust = useTransform(scrollYProgress, [0, 1], [0, -6]);
  const opacityText = useTransform(scrollYProgress, [0.35, 1], [1, 0]);
  const yMock = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const opacityStage = useTransform(scrollYProgress, [0, 1], [1, 0.65]);

  // Posisi kursor ternormalisasi (−1…1) untuk interaksi scene 3D: miring inti,
  // parallax kamera, & "lampu" partikel. Di-update via motion value → tanpa
  // re-render React. Hanya didengar saat scene aktif (tablet+, bukan reduced).
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  useEffect(() => {
    if (!sceneEnabled) return;
    const onMove = (e: PointerEvent) => {
      pointerX.set((e.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [sceneEnabled, pointerX, pointerY]);

  // Kejujuran data (FASE H2): klaim sosial di bawah CTA hanya ditampilkan bila
  // berasal dari data NYATA — bukan stat placeholder bawaan.
  const honestStats = isDefaultStats(stats) ? [] : stats;
  const clientStat = honestStats.find((s) => /klien/i.test(s.label));

  return (
    <section
      ref={sectionRef}
      id="beranda"
      className="relative flex min-h-screen items-center overflow-hidden pt-32 pb-20"
    >
      {/* Background layers */}
      <div className="grid-lines absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[32rem] w-[32rem] animate-aurora rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-[28rem] w-[28rem] animate-aurora rounded-full bg-primary-light/25 blur-[120px] [animation-delay:-6s]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
      {cursorEnabled && <CursorGlow containerRef={sectionRef} />}

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
        <motion.div
          className="relative"
          variants={stagger}
          initial="hidden"
          animate="show"
          style={reduced ? undefined : { opacity: opacityText }}
        >
          <Block variants={rise} y={reduced ? undefined : yKicker}>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/80 py-1 pr-4 pl-1.5 text-[0.7rem] font-medium tracking-[0.14em] text-slate-600 uppercase shadow-sm backdrop-blur">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white">
                <Code2 className="h-3 w-3" aria-hidden="true" />
              </span>
              Solusi Digital untuk Bisnis Anda
            </span>
          </Block>

          <motion.div className="mt-6" style={reduced ? undefined : { y: yHead }}>
            <h1 className="text-4xl leading-[1.04] font-bold tracking-[-0.025em] text-secondary sm:text-5xl lg:text-6xl">
              <AnimatedHeadline reduced={reduced} />
            </h1>
          </motion.div>

          <Block variants={rise} y={reduced ? undefined : yPara} className="mt-6 max-w-xl">
            <p className="text-base leading-relaxed text-muted sm:text-lg">
              <span className="font-medium text-secondary">{COMPANY.name}</span>{" "}
              membantu bisnis naik kelas lewat{" "}
              <span className="font-medium text-secondary underline decoration-primary/35 decoration-[1.5px] underline-offset-4">
                website, aplikasi mobile, dan konsultasi teknologi
              </span>{" "}
              yang mudah diakses, terjangkau, dan berkualitas.
            </p>
          </Block>

          <Block variants={rise} y={reduced ? undefined : yCta} className="mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <Magnetic enabled={cursorEnabled}>
                <TrackedWaButton
                  location="hero"
                  href={waLink(WA_MESSAGES.general, settings.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="lg"
                  className="group overflow-hidden"
                >
                  {/* Sapuan kilau saat hover (murni dekoratif). */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[150%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]"
                  />
                  <MessageCircle className="h-5 w-5" />
                  Mulai Konsultasi
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </TrackedWaButton>
              </Magnetic>
              <ButtonAnchor
                href="#layanan"
                size="lg"
                variant="outline"
                onClick={() => trackCtaClick("hero", "#layanan")}
                className="hover:shadow-[0_10px_30px_-14px_rgba(42,107,255,0.45)]"
              >
                Lihat Layanan
              </ButtonAnchor>
            </div>
          </Block>

          {/* Trust bar — hanya sinyal JUJUR (tanpa angka palsu). */}
          <Block variants={rise} y={reduced ? undefined : yTrust} className="mt-9">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {clientStat && (
                <TrustItem icon={<Users className="h-3.5 w-3.5" />}>
                  <span>
                    <CountUp
                      to={clientStat.value}
                      suffix={clientStat.suffix}
                      reduced={reduced}
                      className="font-semibold text-secondary"
                    />{" "}
                    klien mempercayai kami
                  </span>
                </TrustItem>
              )}
              <TrustItem icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                Konsultasi gratis
              </TrustItem>
              <TrustItem icon={<Zap className="h-3.5 w-3.5" />}>
                Respon cepat
              </TrustItem>
            </div>
          </Block>
        </motion.div>

        {/* Kolom kanan (tablet+): panggung visual untuk inti digital 3D. Canvas
            `Hero3D` di-scope ke panggung ini; bila scene tidak aktif (reduced-
            motion / WebGL gagal) tampil `CoreFallback` CSS statis. Di mobile
            kolom disembunyikan → hero murni teks. */}
        <motion.div
          aria-hidden="true"
          className={
            "relative hidden h-[24rem] md:block lg:h-[32rem] " +
            (sceneEnabled
              ? "cursor-grab active:cursor-grabbing"
              : "pointer-events-none")
          }
          style={reduced ? undefined : { y: yMock, opacity: opacityStage }}
        >
          {!sceneEnabled && <CoreFallback />}
          {sceneEnabled && (
            <Hero3D
              interaction={{
                scroll: scrollYProgress,
                pointer: { x: pointerX, y: pointerY },
              }}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
