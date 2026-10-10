"use client";

import { AlertTriangle } from "lucide-react";
import type { AttentionSummary } from "@/lib/orders";
import { ATTENTION_LABEL } from "@/lib/orders-filter-pure";
import { cn } from "@/lib/utils";

const KEYS: Array<keyof Omit<AttentionSummary, "total" | "truncated">> = [
  "jasa_menunggu",
  "bayar_segera",
  "kurang_bayar",
  "belum_dipenuhi",
  "email_gagal",
];

/**
 * Panel "butuh perhatian" (FASE O5) — work queue ringkas. Klik chip → set
 * filter "butuh perhatian" untuk menelusuri.
 */
export function OrdersAttentionPanel({
  attention,
  onFocus,
}: {
  attention: AttentionSummary | null;
  onFocus: () => void;
}) {
  if (!attention || attention.total === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Butuh perhatian
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
            {attention.total}
          </span>
        </p>
        <button
          type="button"
          onClick={onFocus}
          className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
        >
          Lihat semua
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {KEYS.map((k) =>
          attention[k] > 0 ? (
            <button
              key={k}
              type="button"
              onClick={onFocus}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700",
                "border border-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-100",
              )}
            >
              {ATTENTION_LABEL[k]}
              <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">
                {attention[k]}
              </span>
            </button>
          ) : null,
        )}
      </div>
      {attention.truncated && (
        <p className="mt-2 text-[11px] text-amber-700">
          Dihitung dari pesanan terbaru (batas pemindaian) — bisa belum lengkap.
        </p>
      )}
    </div>
  );
}