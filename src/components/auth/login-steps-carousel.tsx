"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, PackageCheck, Sparkles } from "lucide-react";
import { useReducedMotionPreference } from "@/lib/intro";
import { cn } from "@/lib/utils";

/** Keunggulan yang ditampilkan bergantian (stack) di panel kiri login. */
const STEPS = [
  {
    icon: PackageCheck,
    title: "Kelola pesanan",
    desc: "Riwayat, status, & unduhan produk digital Anda.",
  },
  {
    icon: Heart,
    title: "Favorit & alert",
    desc: "Simpan produk, dapat notifikasi harga turun/restock.",
  },
  {
    icon: Sparkles,
    title: "Kupon & promo",
    desc: "Dapatkan kupon diskon untuk hemat tiap checkout.",
  },
];

const INTERVAL_MS = 3200;

/**
 * STACK kartu keunggulan yang bergantian otomatis (Tema UI login).
 *
 * - Hanya KARTU DEPAN tampil penuh; kartu di belakang terlihat sedikit
 *   (offset + skala kecil + transparan) → efek bertumpuk.
 * - Berganti otomatis tiap `INTERVAL_MS`; dot indicator bisa diklik.
 * - `prefers-reduced-motion` → tanpa auto-rotate & tanpa animasi posisi
 *   (menampilkan kartu aktif saja, tetap bisa ganti lewat dot).
 *
 * A11y: kontainer `role="group"` + `aria-live="polite"`; dot = tombol berlabel.
 */
export function LoginStepsCarousel({ className }: { className?: string }) {
  const reduced = useReducedMotionPreference();
  const [index, setIndex] = useState(0);
  const count = STEPS.length;

  useEffect(() => {
    if (reduced || count <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduced, count]);

  return (
    <div className={cn("relative", className)}>
      {/* Area bertumpuk — tinggi tetap agar layout tidak bergeser. */}
      <div
        className="relative h-[104px] sm:h-[96px]"
        role="group"
        aria-label="Keunggulan akun"
      >
        {STEPS.map((s, i) => {
          // Jarak relatif terhadap kartu aktif (0 = depan, 1 = belakang, ...).
          const offset = (i - index + count) % count;
          const isFront = offset === 0;
          const depth = Math.min(offset, 2);

          const Icon = s.icon;

          return (
            <motion.div
              key={s.title}
              className={cn(
                "absolute inset-x-0 flex w-full items-center gap-4 rounded-2xl border p-4 backdrop-blur",
                isFront
                  ? "border-white/25 bg-white/15"
                  : "border-white/10 bg-white/5",
              )}
              initial={false}
              animate={
                reduced
                  ? { opacity: isFront ? 1 : 0, zIndex: count - offset }
                  : {
                      y: depth * 10,
                      scale: 1 - depth * 0.05,
                      opacity: isFront ? 1 : 0.55,
                      zIndex: count - offset,
                    }
              }
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "center top" }}
              aria-hidden={!isFront}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <Icon className="h-3.5 w-3.5 text-emerald-300" />
                  {s.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/75">
                  {s.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dot indicator (bisa diklik) */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Tampilkan: ${s.title}`}
            aria-current={i === index}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}
