"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { RATING_MAX } from "@/lib/review-types";

/**
 * Bintang rating.
 * - Display (default): `role="img"` + aria-label.
 * - Interaktif: set `onChange` → radio group a11y (bintang bisa dipilih
 *   via keyboard/klik).
 */
export function RatingStars({
  value,
  size = "md",
  onChange,
  className,
  label,
}: {
  /** Nilai rating (0 untuk belum dinilai). */
  value: number;
  size?: "sm" | "md" | "lg";
  /** Bila diberikan → mode input interaktif. */
  onChange?: (rating: number) => void;
  className?: string;
  /** Label aksesibilitas untuk mode display. */
  label?: string;
}) {
  const [hover, setHover] = useState(0);
  const px = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4 w-4";
  const interactive = typeof onChange === "function";
  const shown = interactive && hover > 0 ? hover : value;

  if (!interactive) {
    return (
      <span
        role="img"
        aria-label={label ?? `${value} dari ${RATING_MAX} bintang`}
        className={cn("inline-flex items-center gap-0.5", className)}
      >
        {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => (
          <Star
            key={n}
            aria-hidden="true"
            className={cn(
              px,
              n <= Math.round(value)
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-200 text-slate-200",
            )}
          />
        ))}
      </span>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Pilih rating"
      className={cn("inline-flex items-center gap-1", className)}
      onMouseLeave={() => setHover(0)}
    >
      {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} bintang`}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onClick={() => onChange?.(n)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Star
            aria-hidden="true"
            className={cn(
              size === "sm" ? "h-4 w-4" : "h-7 w-7",
              n <= shown
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-200 text-slate-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}
