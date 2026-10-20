"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useTransform } from "framer-motion";
import { SectionHeading } from "@/components/section-heading";
import { PinnedSection, type PinProgress } from "@/components/pinned-section";
import { useContent } from "@/components/content-provider";
import { cn } from "@/lib/utils";
import type { ManagedProcess } from "@/lib/content-types";

/**
 * F3 — Pinned storytelling: alur kerja beranda.
 *
 * Efek "halaman diam, elemen bergerak": section di-pin (CSS `position:
 * sticky` native, tanpa scroll-hijack) selama beberapa layar. Selama itu
 * garis rel terisi mengikuti scroll dan tiap langkah menyala bergantian,
 * lalu kartu detail langkah aktif bertukar dengan halus.
 *
 * Catatan penting:
 * - Konten TIDAK dipangkas: seluruh langkah tetap dirender di DOM (baik
 *   `step`, `title`, maupun `description`). Di mobile/reduced-motion semua
 *   kartu tampil tersusun normal; di desktop hanya kartu aktif yang tampak
 *   sementara sisanya di-cross-fade (tetap ada di DOM untuk SEO & a11y).
 * - Pinning sepenuhnya digerakkan CSS (`motion-safe:md:*`), jadi tidak ada
 *   hydration mismatch / CLS dan tetap aman saat JS nonaktif.
 * - Komponen ini khusus beranda. `/tentang` tetap memakai `Process` (grid)
 *   agar halaman itu tidak berubah — lihat `process.tsx`.
 */
export function ProcessTimeline() {
  const { process } = useContent();

  if (process.length === 0) return null;

  return (
    <PinnedSection
      id="proses"
      slides={Math.max(2, process.length)}
      aria-label="Alur kerja"
      className="scroll-mt-24 bg-white"
      panelClassName="px-6 py-24 motion-safe:md:py-0"
    >
      {(progress) => <ProcessPanel progress={progress} steps={process} />}
    </PinnedSection>
  );
}

/**
 * Isi panel yang di-pin. Dipisah menjadi komponen tersendiri karena harus
 * memanggil hook (`useMotionValueEvent`) — hook tidak boleh dipanggil di
 * dalam render-prop `PinnedSection`.
 */
function ProcessPanel({
  progress,
  steps,
}: {
  progress: PinProgress;
  steps: ManagedProcess[];
}) {
  const [active, setActive] = useState(0);
  const lastRef = useRef(0);
  const total = steps.length;

  // Turunkan indeks langkah aktif dari progres scroll. `setActive` hanya
  // dipanggil saat indeks benar-benar berubah → re-render minimal (sebanyak
  // jumlah langkah, bukan tiap frame).
  useMotionValueEvent(progress, "change", (v) => {
    const idx = Math.min(total - 1, Math.max(0, Math.floor(v * total)));
    if (idx !== lastRef.current) {
      lastRef.current = idx;
      setActive(idx);
    }
  });

  // Rel terisi 0→1 sepanjang pin (hanya transform → murah, di GPU).
  const fillScale = useTransform(progress, [0, 1], [0, 1]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <SectionHeading
        eyebrow="Alur Kerja"
        title={
          <>
            Proses yang{" "}
            <span className="text-gradient">jelas &amp; transparan</span>
          </>
        }
        description="Langkah sederhana dari ide hingga produk digital Anda siap digunakan."
      />

      {/* Rel langkah (desktop) — garis terisi + simpul menyala bergantian. */}
      <div className="mt-14 hidden motion-safe:md:block">
        <div className="relative mx-auto max-w-3xl">
          <div className="absolute top-5 right-5 left-5 h-px bg-slate-200" />
          <motion.div
            aria-hidden
            className="absolute top-5 right-5 left-5 h-px origin-left bg-primary"
            style={{ scaleX: fillScale }}
          />

          <ol className="relative flex items-start justify-between">
            {steps.map((item, i) => (
              <li
                key={item.step}
                className="flex flex-col items-center gap-3"
              >
                <div
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-full border text-sm font-bold transition-all duration-300",
                    i === active
                      ? "scale-110 border-primary bg-primary text-white shadow-lg shadow-primary/30"
                      : "border-slate-200 bg-white text-slate-500",
                  )}
                >
                  {item.step}
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold transition-colors",
                    i === active ? "text-primary" : "text-muted",
                  )}
                >
                  {item.title}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Kartu detail. Desktop: ditumpuk di satu sel grid lalu di-cross-fade
          sesuai langkah aktif. Mobile / reduced-motion: alur normal, semua
          kartu tampil (konten utuh). */}
      <div className="mt-12 flex flex-col gap-6 motion-safe:md:mt-16 motion-safe:md:grid motion-safe:md:gap-0">
        {steps.map((item, i) => (
          <div
            key={item.step}
            className={cn(
              "opacity-100 transition-all duration-500 motion-safe:md:col-start-1 motion-safe:md:row-start-1",
              i === active
                ? "motion-safe:md:scale-100 motion-safe:md:opacity-100"
                : "motion-safe:md:scale-[0.98] motion-safe:md:opacity-0",
            )}
          >
            <div className="rounded-3xl border border-slate-100 bg-surface p-8 text-center">
              <span className="text-gradient text-4xl font-bold">
                {item.step}
              </span>
              <h3 className="mt-4 text-2xl font-bold text-secondary">
                {item.title}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
