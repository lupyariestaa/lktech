"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useReducedMotionPreference } from "@/lib/intro";

/**
 * Bar tipis di paling atas yang menunjukkan progres scroll halaman.
 *
 * - Dekoratif (`aria-hidden`) & tidak menangkap klik (`pointer-events-none`).
 * - Mengikuti scroll dengan pegas halus. Saat `prefers-reduced-motion` aktif,
 *   bar mengikuti scroll tanpa pegas (tanpa gerakan tambahan).
 * - `z-[110]` berada di atas navbar (`z-[100]`) namun tetap di bawah intro
 *   loader (`z-[10000]`) sehingga tidak terlihat saat loader tampil.
 * - Dipasang di beranda saja (lihat `app/page.tsx`).
 */
export function ScrollProgress() {
  const reduced = useReducedMotionPreference();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-0.5 origin-left bg-gradient-to-r from-primary via-primary to-primary-light"
      style={{ scaleX: reduced ? scrollYProgress : smooth }}
    />
  );
}
