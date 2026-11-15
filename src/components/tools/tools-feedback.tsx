"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { trackToolsFeedback } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Feedback ringan di landing. Satu klik, tanpa teks bebas, tanpa PII; hanya
 * mengirim `helpful: true|false` ke analytics.
 */
export function ToolsFeedback() {
  const [voted, setVoted] = useState<boolean | null>(null);

  const vote = (helpful: boolean) => {
    if (voted !== null) return;
    setVoted(helpful);
    trackToolsFeedback({ helpful });
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-surface px-4 py-3">
      <p className="text-xs font-medium text-muted">
        Apakah halaman ini membantu?
      </p>
      {voted === null ? (
        <div
          role="group"
          aria-label="Penilaian halaman"
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => vote(true)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
            Membantu
          </button>
          <button
            type="button"
            onClick={() => vote(false)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
            Belum
          </button>
        </div>
      ) : (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-xs font-semibold",
            voted ? "text-emerald-700" : "text-muted",
          )}
        >
          Terima kasih atas masukannya.
        </p>
      )}
    </div>
  );
}
