"use client";

import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tombol jeda untuk konten yang bergerak otomatis (marquee logo & band
 * "Pratinjau").
 *
 * WCAG 2.2.2 (Pause, Stop, Hide): animasi yang mulai sendiri dan berjalan
 * lebih dari 5 detik wajib punya mekanisme jeda. `hover` saja tidak cukup —
 * pengguna keyboard & sentuh juga harus bisa menghentikannya. Tombol ini
 * menjadi mekanisme tersebut (dan `prefers-reduced-motion` tetap dihormati
 * secara terpisah).
 */
export function MotionToggle({
  paused,
  onToggle,
  label,
  className,
}: {
  paused: boolean;
  onToggle: () => void;
  /** Nama animasi untuk nama aksesibel, mis. "animasi logo teknologi". */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={paused ? `Mainkan ${label}` : `Jeda ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 backdrop-blur transition-colors hover:border-primary/40 hover:text-primary",
        className,
      )}
    >
      {paused ? (
        <Play className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Pause className="h-3 w-3" aria-hidden="true" />
      )}
      <span>{paused ? "Mainkan" : "Jeda"}</span>
    </button>
  );
}
