"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { useReducedMotionPreference } from "@/lib/intro";

/**
 * Intro / loading screen dengan animasi dua panel:
 * 1. Panel atas & bawah menutup layar.
 * 2. Konten (logo, progress, brand, persentase) muncul di tengah.
 * 3. Konten menghilang lebih dulu (smooth).
 * 4. Panel membuka kembali — atas naik, bawah turun.
 *
 * Ditampilkan hanya di beranda (lihat `app/page.tsx`).
 */

const EASE = [0.76, 0, 0.24, 1] as const;

// Timeline (ms)
const CLOSE_DURATION = 450;
const CONTENT_IN = 180; // setelah panel menutup
const HOLD = 720; // durasi konten progress terlihat
const CONTENT_OUT = 260;
const OPEN_DURATION = 520;

const panelTop: Variants = {
  hidden: { y: "-100%" },
  closed: { y: "0%", transition: { duration: CLOSE_DURATION / 1000, ease: EASE } },
  open: { y: "-100%", transition: { duration: OPEN_DURATION / 1000, ease: EASE } },
};

const panelBottom: Variants = {
  hidden: { y: "100%" },
  closed: { y: "0%", transition: { duration: CLOSE_DURATION / 1000, ease: EASE } },
  open: { y: "100%", transition: { duration: OPEN_DURATION / 1000, ease: EASE } },
};

export function IntroLoader() {
  const reduced = useReducedMotionPreference();
  // phase: "enter" → "hold" → "content-out" → "open" → selesai (unmount)
  const [phase, setPhase] = useState<"enter" | "hold" | "content-out" | "open" | "done">(
    reduced ? "done" : "enter",
  );
  const [progress, setProgress] = useState(0);

  // Kunci scroll saat loader tampil.
  useEffect(() => {
    if (phase === "done") {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  // Timeline fase. Saat `reduced`, `phase` sudah diinisialisasi ke "done"
  // (lihat useState), jadi tidak perlu setState di sini.
  useEffect(() => {
    if (reduced) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("hold"), CLOSE_DURATION));
    timers.push(
      setTimeout(
        () => setPhase("content-out"),
        CLOSE_DURATION + CONTENT_IN + HOLD,
      ),
    );
    timers.push(
      setTimeout(
        () => setPhase("open"),
        CLOSE_DURATION + CONTENT_IN + HOLD + CONTENT_OUT,
      ),
    );
    timers.push(
      setTimeout(
        () => setPhase("done"),
        CLOSE_DURATION + CONTENT_IN + HOLD + CONTENT_OUT + OPEN_DURATION,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  // Animasi progres 0 → 100% selama fase hold.
  useEffect(() => {
    if (phase !== "hold") return;
    let raf = 0;
    const start = performance.now();
    const total = CONTENT_IN + HOLD;
    const tick = (now: number) => {
      const pct = Math.min(100, Math.round(((now - start) / total) * 100));
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase === "done") return null;

  const panelsClosed = phase !== "enter";
  const contentVisible = phase === "hold";

  return (
    <div
      className="fixed inset-0 z-[10000] overflow-hidden"
      aria-hidden="true"
      role="presentation"
    >
      {/* Panel atas */}
      <motion.div
        variants={panelTop}
        initial="hidden"
        animate={panelsClosed ? (phase === "open" ? "open" : "closed") : "hidden"}
        className="absolute inset-x-0 top-0 h-1/2 bg-white shadow-[0_1px_0_rgba(15,23,42,0.08)]"
      />
      {/* Panel bawah */}
      <motion.div
        variants={panelBottom}
        initial="hidden"
        animate={panelsClosed ? (phase === "open" ? "open" : "closed") : "hidden"}
        className="absolute inset-x-0 bottom-0 h-1/2 bg-white shadow-[0_-1px_0_rgba(15,23,42,0.08)]"
      />

      {/* Konten di tengah (di atas panel) */}
      <motion.div
        initial={false}
        animate={{
          opacity: contentVisible ? 1 : 0,
          y: contentVisible ? 0 : 10,
          filter: contentVisible ? "blur(0px)" : "blur(6px)",
        }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="flex flex-col items-center px-6">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: contentVisible ? 1 : 0.85,
              opacity: contentVisible ? 1 : 0,
            }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-10 -z-10 rounded-full bg-primary/15 blur-3xl" />
            <Image
              src="/logo/lktech-logo.svg"
              alt="LKTech"
              width={88}
              height={88}
              priority
              className="h-20 w-20 object-contain sm:h-24 sm:w-24"
            />
          </motion.div>

          <div className="mt-8 h-[3px] w-56 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-5 flex w-56 items-center justify-between">
            <span className="text-xs font-semibold tracking-[0.25em] text-secondary uppercase">
              LKTech
            </span>
            <span className="text-xs font-semibold tabular-nums text-primary">
              {progress}%
            </span>
          </div>

          <span className="mt-3 text-[11px] tracking-wide text-muted">
            Menyiapkan pengalaman Anda…
          </span>
        </div>
      </motion.div>
    </div>
  );
}
