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
import { useIntroDone, useIntroSkip } from "@/components/intro-gate";
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
 * Soft-fade tepi panggung — **sama persis** dengan `EDGE_MASK` di `hero-3d.tsx`.
 * Sengaja disalin, bukan diimpor: file itu di-`dynamic import` (client-only), dan
 * mengimpor konstanta darinya akan ikut menarik `three` ke bundel awal.
 */
const EDGE_MASK =
  "radial-gradient(closest-side, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)";

/**
 * F7.8: batas tunggu sebelum panggung 3D dianggap gagal (WebGL tak pernah
 * melapor siap) → fallback CSS muncul sebagai jaring pengaman. Di perangkat
 * normal frame pertama jauh lebih cepat dari ini (≤ ~1 s).
 */
const SAFETY_FALLBACK_MS = 4000;

/**
 * Fallback CSS statis "inti digital" (tablet ke atas) — **jaring pengaman**,
 * bukan lagi tampilan default.
 *
 * F7.8: selama menunggu, panggung sengaja dibiarkan **kosong**; bola 3D-nya
 * masuk dengan animasi begitu ia siap (fade + sedikit membesar — lihat
 * `Hero3D`). Bola CSS yang sudah nongol sejak awal justru membuat kemunculan
 * 3D terbaca sebagai "pergantian elemen", bukan animasi masuk.
 *
 * Fallback ini hanya tampil bila scene tak akan/tak boleh hidup:
 * - `prefers-reduced-motion`, layar < tablet, atau WebGL tak tersedia → ia
 *   satu-satunya visual (statis, tanpa animasi);
 * - canvas tak melapor siap dalam 4 s (WebGL gagal dibuat di tengah jalan) →
 *   panggung tidak boleh kosong selamanya (jaring pengaman `fallbackOn`).
 *
 * Ia selalu **fade in** (lewat prop `hidden`), tidak pernah "pop"; dan bila
 * ternyata 3D menyusul siap, ia memudar lewat `painted` seperti dulu.
 *
 * F7.6b: fallback ini adalah **salinan eksak kondisi frame-0 scene 3D**, jadi
 * cross-fade ke canvas tidak lagi terbaca sebagai "dua elemen 3D berbeda"
 * (keluhan: bentuk awal vs sesudah loading terlihat seperti dua objek). Semua
 * angka di bawah disalin dari `hero-3d.tsx` saat `uIntro = 0`:
 * - Bola inti: radius 1,3 unit; skala grup `COMPOSITION_HALF` (2,6) → siluet
 *   selalu **50 % sisi terpendek panggung** (`50cqmin`; panggung diberi
 *   `container-type: size` → `cqmin` = sisi terpendeknya, persis seperti
 *   `Math.min(viewport.width, viewport.height)` di shader). Di sini digambar
 *   `54cqmin` karena tepi *terlihat* bola 3D melebar oleh bloom (lihat
 *   `CORE_GRADIENT`).
 * - Warna & halo: nilai **render** 3D (tepi + bloom) diukur per radius dengan
 *   skrip QA screencast ad-hoc (buang setelah dipakai) lalu disalin apa adanya
 *   ke `CORE_GRADIENT` (0→138 px) dan `CORE_GLOW` (putih ±0,6 → 0 sampai 264 px).
 *   Profilnya diambil dari **frame beku** (`uIntro = 0`): di kondisi itu rim
 *   fresnel di-boost (`(1 − uIntro)`) sehingga tepi bola lebih putih daripada
 *   kondisi stabil — kalau diukur saat stabil, tepi fallback tampak 40–55 level
 *   lebih gelap dari canvas saat cross-fade (terukur F7.7).
 * - Cincin: torus r 1,9 & 2,15 pada skala entrance 0,8× — diproyeksikan eksak
 *   (perspektif kamera z=6, fov 45) → ring1
 *   60,7 × 10,0cqmin @ −3°, ring2 69,0 × 4,0cqmin @ −29,9°; warna + opasitas
 *   sama seperti materialnya. Perkiraan "pipih dari normal torus" (F7.6b) tidak
 *   akurat: perspektif membuat sumbu mayor +3 % dan sumbu minor lebih pipih.
 *
 * Tanpa animasi → aman untuk reduced-motion; semuanya ikut ukuran panggung.
 */
/**
 * Gradasi bola fallback = **hasil ukur profil radial** render 3D kondisi
 * frame beku (`uIntro = 0`, F7.7).
 *
 * Radius 0→138 px pada panggung 512 px dipetakan ke 0→100 % radius bola di sini
 * (`54cqmin` = diameter 276 px — yaitu tepi bola 3D yang *terlihat*: siluet
 * asli 256 px + sebaran bloom). Tiap stop = warna rata-rata piksel 3D di radius
 * itu, jadi efek bloom + rim boost yang "mencuci" bola 3D ikut tersalin apa
 * adanya (bukan tebakan): tengah ~#2454c3, zona gelap pertengahan lebih lebar,
 * lalu tepi naik tajam ke putih di 90→96 %, dan memudar (`rgba(...,0)`) di ujung
 * supaya tepinya lembut seperti bloom.
 */
const CORE_GRADIENT =
  "radial-gradient(circle closest-side," +
  "#2454c3 0%,#2956c5 32%,#315bc7 49%,#4066cd 61%,#4b6fd2 67%," +
  "#597bdb 72%,#698ae7 78%,#85a9fa 84%,#b4dffe 90%,#f7fffe 96%," +
  "rgba(250,254,254,0.6) 98%,rgba(250,254,254,0) 100%)";

/**
 * Halo bloom di luar bola — dari profil radial yang sama: putih ±0,6 → 0 pada
 * radius 264 px (= `103cqmin`), puncaknya tepat di tepi bola (r 156–180 px).
 * Ini yang membuat siluet bola 3D tampak "menyala" di atas latar terang.
 *
 * Alphanya sengaja ~0,5 (bukan ~0,9 walau itu lebih dekat ke angka profil):
 * bloom 3D bersifat *additive*, jadi garis grid di belakang panggung tetap
 * terlihat menembus glow — dengan alpha tinggi, garis itu "tercuci" putih di
 * fallback (terukur di QA: fallback kehilangan grid, 3D tidak).
 */
const CORE_GLOW =
  "radial-gradient(circle closest-side," +
  "rgba(255,255,255,0.6) 0%,rgba(255,255,255,0.6) 50%," +
  "rgba(255,255,255,0.52) 59%,rgba(255,255,255,0.45) 68%," +
  "rgba(255,255,255,0.3) 77%,rgba(255,255,255,0.18) 86%," +
  "rgba(255,255,255,0.09) 91%,rgba(255,255,255,0) 100%)";

function CoreFallback({
  painted = false,
  hidden = false,
}: {
  /** Ada canvas 3D siap → fallback memudar keluar (cross-fade). */
  painted?: boolean;
  /** Belum diizinkan tampil → tetap transparan (dipakai untuk fade-in). */
  hidden?: boolean;
}) {
  return (
    <div
      className={
        "absolute inset-0 transition-opacity duration-700 " +
        (painted || hidden ? "opacity-0" : "opacity-100")
      }
      style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
    >
      {/* Halo bloom di belakang inti (pengganti Bloom 3D). */}
      <div
        className="absolute top-1/2 left-1/2 size-[103cqmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: CORE_GLOW }}
      />
      {/* Inti: warna & gradasi tersalin dari profil render 3D. */}
      <div
        className="absolute top-1/2 left-1/2 size-[54cqmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: CORE_GRADIENT }}
      />
      {/* Cincin orbit, geometri dari proyeksi eksak torusnya (kamera z=6, fov 45),
          pada skala entrance 0,8×:
          ring1 — semi-mayor 154,3 px & semi-minor 24,6 px, sumbu mayor −3,0° →
          kotak 60,7 × 10,0cqmin (border-box: garis tengah = 154,4 / 24,6 px).
          ring2 — semi-mayor 176,1 px & semi-minor 9,6 px, sumbu mayor −29,9° →
          kotak 69,0 × 4,0cqmin (garis tengah = 176,0 / 9,6 px). */}
      <div className="absolute top-1/2 left-1/2 h-[10cqmin] w-[60.7cqmin] -translate-x-1/2 -translate-y-1/2 -rotate-[3deg] rounded-[50%] border-2 border-[#4d82ec]/55" />
      <div className="absolute top-1/2 left-1/2 h-[4cqmin] w-[69cqmin] -translate-x-1/2 -translate-y-1/2 -rotate-[29.9deg] rounded-[50%] border-[1.25px] border-[#7aa2ff]/30" />
    </div>
  );
}

export function Hero() {
  const reduced = useReducedMotionPreference();
  const settings = useSettings();
  const { stats } = useContent();
  const introDone = useIntroDone();
  // Sesi yang sudah melihat intro melewati loader → pengetikan headline
  // dimulai segera, bukan menunggu 2,1 detik yang sudah tidak ada.
  const introSkip = useIntroSkip();
  const base = introSkip ? 0 : introDelay(reduced);
  // Entrance: satu induk yang men-stagger tiap blok teks. Animasi baru
  // dijalankan saat `introDone` (loader selesai / dilewati), jadi tidak ada
  // delay yang bisa "basi" bila intro tidak dimainkan.
  const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09 } },
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
  const mountScene = sceneEnabled && introDone;
  // `sceneReady` = canvas 3D sudah menggambar frame pertamanya.
  const [sceneReady, setSceneReady] = useState(false);
  // F7.8: panggung **kosong** selama menunggu (bukan bola CSS diam). Elemen 3D
  // baru ditampilkan saat siap, dan tampilnya dianimasikan (fade + membesar di
  // `Hero3D`) — permintaan: "sebelum loading beres kayak none dulu, kalau sudah
  // beres muncul dengan animasi, nggak instan banget".
  const [fallbackOn, setFallbackOn] = useState(false);
  // Jaring pengaman: kalau canvas tak pernah melapor siap (WebGL gagal dibuat di
  // tengah jalan — `probeWebgl` lolos tapi konteks asli ditolak, GPU diblokir),
  // panggung tak boleh kosong selamanya → fallback CSS muncul, dengan fade.
  useEffect(() => {
    if (!mountScene || sceneReady) return;
    const t = setTimeout(() => setFallbackOn(true), SAFETY_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [mountScene, sceneReady]);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  // Fallback yang sempat tampil (jalur jaring pengaman) baru dilepas setelah
  // cross-fade ke canvas selesai — supaya pergantiannya tidak "memotong".
  useEffect(() => {
    if (!sceneReady || !fallbackOn) return;
    const t = setTimeout(() => setFallbackOn(false), 900);
    return () => clearTimeout(t);
  }, [sceneReady, fallbackOn]);
  // Semua kemunculan fallback lewat fade (bukan pop): satu frame jeda dulu
  // supaya kelas `opacity` barunya ikut ditransisikan.
  const showFallback = !sceneEnabled || fallbackOn;
  const [fallbackIn, setFallbackIn] = useState(false);
  useEffect(() => {
    if (!showFallback) return;
    const raf = requestAnimationFrame(() => setFallbackIn(true));
    return () => {
      cancelAnimationFrame(raf);
      setFallbackIn(false);
    };
  }, [showFallback]);

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
          animate={introDone ? "show" : "hidden"}
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
            `Hero3D` di-scope ke panggung ini. F7.8: selama menunggu panggung
            dibiarkan **kosong** — canvas masuk dengan animasi saat siap; fallback
            CSS hanya jaring pengaman (reduced-motion / WebGL tak tersedia / 3D
            tak pernah siap). Di mobile kolom disembunyikan → hero murni teks. */}
        <motion.div
          aria-hidden="true"
          className={
            // `[container-type:size]`: panggung jadi *size container* → fallback
            // CSS bisa memakai satuan `cqmin` (= sisi terpendek panggung), sama
            // seperti `Math.min(viewport.width, viewport.height)` di shader 3D.
            // Hasilnya ukuran bola fallback = bola 3D di viewport mana pun.
            "relative hidden h-[24rem] [container-type:size] md:block lg:h-[32rem] " +
            (sceneEnabled
              ? "cursor-grab active:cursor-grabbing"
              : "pointer-events-none")
          }
          style={reduced ? undefined : { y: yMock, opacity: opacityStage }}
        >
          {showFallback && (
            <CoreFallback painted={sceneReady} hidden={!fallbackIn} />
          )}
          {mountScene && (
            <Hero3D
              interaction={{
                scroll: scrollYProgress,
                pointer: { x: pointerX, y: pointerY },
              }}
              onReady={onSceneReady}
              // F7.8: begitu frame pertama tergambar, scene langsung "bangun"
              // (entrance dari nol) bersamaan dengan animasi masuknya kanvas
              // (fade + membesar, di `Hero3D`) — jadi kemunculannya terlihat
              // sebagai satu animasi, bukan pergantian elemen.
              play={sceneReady}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
