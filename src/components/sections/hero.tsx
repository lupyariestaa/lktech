"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
import { useIntroDone } from "@/components/intro-gate";
import { introDelay, useReducedMotionPreference } from "@/lib/intro";
import { MEDIA_QUERIES, useMediaQuery } from "@/lib/use-media-query";

/**
 * Scene 3D hero (F5) — lazy + client-only (`ssr: false`) agar `three` hanya
 * diunduh di layar besar & bukan pada bundel/SSR awal. Di-mount hanya saat
 * `≥768px`, bukan reduced-motion, **dan intro loader sudah selesai** (F7.6,
 * lihat `mountScene`).
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
 * Naskah berputar di hero (F7.4): **3 pasang** judul (baris 1 + baris 2 gradient)
 * beserta sub-judulnya.
 *
 * Varian `#1` sengaja = naskah lama dan dipakai sebagai isi render pertama →
 * SSR, no-JS, LCP, dan SEO tetap aman. Ketiga varian ditulis panjang serupa
 * supaya tinggi blok stabil saat naskah berganti.
 */
const ROTATION = [
  {
    line1: "Teknologi Modern,",
    line2: "Hasil Nyata",
    sub: `${COMPANY.name} membantu bisnis naik kelas lewat website, aplikasi mobile, dan konsultasi teknologi yang mudah diakses, terjangkau, dan berkualitas.`,
  },
  {
    line1: "Proses Cepat,",
    line2: "Hasil Rapi",
    sub: "Dari perencanaan sampai rilis, kami kerjakan website dan aplikasi mobile yang cepat, rapi, dan siap dipakai untuk mengembangkan bisnis Anda.",
  },
  {
    line1: "Harga Jujur,",
    line2: "Kualitas Terjaga",
    sub: "Konsultasi teknologi tanpa istilah rumit: kami bantu memilih solusi yang paling masuk akal untuk kebutuhan dan anggaran bisnis Anda.",
  },
] as const;

/** Panjang judul (baris 1 + baris 2) per varian — dipakai mesin tik. */
const HEAD_LEN = ROTATION.map((r) => r.line1.length + r.line2.length);

/* Tempo mesin tik (ms). */
const TYPE_TICK = 55;
const ERASE_TICK = 24;
const ERASE_STEP = 3;
const HOLD_MS = 3000;
const GAP_MS = 260;

type Typed = {
  /** Indeks varian naskah yang aktif. */
  i: number;
  /** Jumlah karakter judul yang sudah diketik (gabungan baris 1 + 2). */
  head: number;
  /** Sub-judul sudah tampil (fade-in) atau belum. */
  sub: boolean;
  phase: "type" | "hold" | "erase";
};

/**
 * Mesin tik judul: **ketik → sub fade-in → jeda → hapus → varian berikutnya**
 * (berulang tanpa henti).
 *
 * Keadaan awal = varian `#1` yang **sudah utuh** dan sub tampil, jadi HTML
 * hasil SSR/no-JS langsung berisi naskah lengkap. `enabled=false`
 * (reduced-motion) membiarkannya statis. Satu `setTimeout` aktif per langkah.
 *
 * `startMs` menahan langkah pertama sampai intro loader selesai — kalau tidak,
 * varian `#1` sudah terhapus sebelum hero sempat terlihat.
 */
function useTypewriter(enabled: boolean, startMs: number): Typed {
  const [t, setT] = useState<Typed>({
    i: 0,
    head: HEAD_LEN[0],
    sub: true,
    phase: "hold",
  });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => setStarted(true), startMs);
    return () => window.clearTimeout(id);
  }, [enabled, startMs]);

  useEffect(() => {
    if (!enabled || !started) return;
    const { i, head, phase } = t;
    const len = HEAD_LEN[i];
    let next: Typed;
    let delay: number;

    if (phase === "type") {
      if (head < len) {
        next = { ...t, head: head + 1 };
        delay = TYPE_TICK;
      } else {
        // Judul selesai → sub muncul (fade CSS) saat itu juga, lalu ditahan.
        next = { ...t, head: len, sub: true, phase: "hold" };
        delay = 0;
      }
    } else if (phase === "hold") {
      // Sub tampil selama `HOLD_MS` (cukup untuk dibaca), baru mulai dihapus.
      next = { ...t, sub: false, phase: "erase" };
      delay = HOLD_MS;
    } else {
      const h = Math.max(0, head - ERASE_STEP);
      next =
        h === 0
          ? { i: (i + 1) % ROTATION.length, head: 0, sub: false, phase: "type" }
          : { ...t, head: h };
      delay = h === 0 ? GAP_MS : ERASE_TICK;
    }

    const id = window.setTimeout(() => setT(next), delay);
    return () => window.clearTimeout(id);
  }, [t, enabled, started]);

  return t;
}

/** Kursor ketik berkedip (murni dekoratif) di ujung teks yang sedang diketik. */
function Caret() {
  return (
    <span
      aria-hidden="true"
      className="ml-[0.05em] inline-block h-[0.84em] w-[0.07em] animate-caret bg-primary align-[-0.04em]"
    />
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
 * Judul + sub-judul hero yang **berputar** (F7.4).
 *
 * Dipisah jadi komponen sendiri supaya mesin tik — yang men-update state tiap
 * ±55 ms — hanya me-render ulang subtree kecil ini; `Hero` dan scene 3D tidak
 * ikut tersentuh.
 *
 * Anti-CLS: judul & sub dibungkus `grid` berisi salinan **tak terlihat** semua
 * varian (`invisible col-start-1 row-start-1`) → tinggi kotak dikunci oleh
 * varian tertinggi, jadi mengetik/menghapus tidak menggeser CTA & trust bar.
 */
function HeroTyped({
  reduced,
  startMs,
  yHead,
  yPara,
}: {
  reduced: boolean;
  startMs: number;
  yHead?: MotionValue<number>;
  yPara?: MotionValue<number>;
}) {
  const t = useTypewriter(!reduced, startMs);
  const { line1, line2, sub } = ROTATION[t.i];
  const typed1 = line1.slice(0, Math.min(t.head, line1.length));
  const typed2 = t.head > line1.length ? line2.slice(0, t.head - line1.length) : "";
  const typing = !reduced && t.phase === "type";
  const caretTop = typing && t.head < line1.length;

  return (
    <>
      <Block variants={rise} y={reduced ? undefined : yHead} className="mt-6">
        <h1 className="grid text-4xl leading-[1.04] font-bold tracking-[-0.025em] text-secondary sm:text-5xl lg:text-6xl">
          <span className="col-start-1 row-start-1 block">
            <span className="block">
              {typed1 || "\u00A0"}
              {caretTop && <Caret />}
            </span>
            <span className="text-gradient block">
              {typed2 || "\u00A0"}
              {typing && !caretTop && <Caret />}
            </span>
          </span>
          {/* Salinan tak terlihat: mengunci tinggi judul ke varian tertinggi. */}
          {ROTATION.map((r) => (
            <span
              key={r.line1}
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 block"
            >
              <span className="block">{r.line1}</span>
              <span className="text-gradient block">{r.line2}</span>
            </span>
          ))}
        </h1>
      </Block>

      <Block variants={rise} y={reduced ? undefined : yPara} className="mt-6 max-w-xl">
        <div className="grid">
          <p
            className="col-start-1 row-start-1 text-base leading-relaxed text-muted transition-all duration-500 sm:text-lg"
            style={{ opacity: t.sub ? 1 : 0, transform: t.sub ? "none" : "translateY(6px)" }}
          >
            {sub}
          </p>
          {ROTATION.map((r) => (
            <p
              key={r.sub}
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 text-base leading-relaxed text-muted sm:text-lg"
            >
              {r.sub}
            </p>
          ))}
        </div>
      </Block>
    </>
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
 * aktif — mis. `prefers-reduced-motion`, WebGL tidak tersedia, atau scene 3D
 * belum selesai dimuat/menyalakan frame pertamanya. Bentuk "inti digital" murni
 * CSS, TANPA animasi, jadi aman untuk reduced-motion.
 *
 * F7.6: fallback ini **selalu ada lebih dulu** dan baru memudar setelah scene
 * 3D melaporkan frame pertamanya (`painted`). Sebelumnya fallback di-unmount
 * begitu hidrasi selesai → panggung kosong beberapa detik sebelum canvas 3D
 * muncul (bug yang terukur di audit: stage kosong ~6 s).
 */
function CoreFallback({ painted = false }: { painted?: boolean }) {
  return (
    <div
      className={
        "absolute inset-0 grid place-items-center transition-opacity duration-700 " +
        (painted ? "opacity-0" : "opacity-100")
      }
    >
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
  // F7.6: scene 3D baru di-mount setelah intro loader selesai. Sebelumnya ia
  // ikut menyala di balik loader (chunk `three` + init WebGL + kompilasi shader
  // berebut main thread dengan animasi pembuka) dan fallback CSS-nya justru
  // hilang saat hidrasi → panggung kosong beberapa detik.
  const introDone = useIntroDone();
  const mountScene = sceneEnabled && introDone;
  // `sceneReady` = canvas 3D sudah menggambar frame pertamanya.
  const [sceneReady, setSceneReady] = useState(false);
  // Fallback CSS tetap tampil sampai cross-fade selesai (bukan sampai mount),
  // jadi tidak pernah ada momen panggung kosong.
  const [fallbackOn, setFallbackOn] = useState(true);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  useEffect(() => {
    if (!sceneReady) return;
    const t = setTimeout(() => setFallbackOn(false), 900);
    return () => clearTimeout(t);
  }, [sceneReady]);

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
  // re-render React. Hanya didengar saat scene benar-benar hidup (F7.6).
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  useEffect(() => {
    if (!mountScene) return;
    const onMove = (e: PointerEvent) => {
      pointerX.set((e.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mountScene, pointerX, pointerY]);

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

          <HeroTyped
            reduced={reduced}
            startMs={base * 1000}
            yHead={yHead}
            yPara={yPara}
          />

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
            motion / WebGL gagal) atau belum menggambar frame pertamanya,
            `CoreFallback` CSS statis yang tampil. Di mobile kolom disembunyikan
            → hero murni teks. */}
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
          {(!sceneEnabled || fallbackOn) && <CoreFallback painted={sceneReady} />}
          {mountScene && (
            <Hero3D
              interaction={{
                scroll: scrollYProgress,
                pointer: { x: pointerX, y: pointerY },
              }}
              onReady={onSceneReady}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
