"use client";

import { Flame } from "lucide-react";
import { scoreTier, SCORE_TIER_LABEL } from "@/lib/lead-scoring-pure";
import { cn } from "@/lib/utils";

/**
 * Badge skor lead (Tema 3.2). Warna mengikuti tier (hot/warm/cold).
 * `showValue` menampilkan angka skor.
 */
export function LeadScoreBadge({
  score,
  showValue = true,
  className,
}: {
  score?: number;
  showValue?: boolean;
  className?: string;
}) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500",
          className,
        )}
      >
        Belum diskor
      </span>
    );
  }

  const tier = scoreTier(score);
  const styles: Record<"hot" | "warm" | "cold", string> = {
    hot: "bg-rose-50 text-rose-600 border-rose-100",
    warm: "bg-amber-50 text-amber-600 border-amber-100",
    cold: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <span
      title={SCORE_TIER_LABEL[tier]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        styles[tier],
        className,
      )}
    >
      <Flame className="h-3 w-3" />
      {showValue ? `Skor ${score}` : SCORE_TIER_LABEL[tier]}
    </span>
  );
}
