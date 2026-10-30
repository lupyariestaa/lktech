"use client";

import { AlertTriangle } from "lucide-react";
import type { AttentionSummary } from "@/lib/orders";
import { ATTENTION_COUNTER_KEYS, ATTENTION_LABEL } from "@/lib/orders-filter-pure";
import { cn } from "@/lib/utils";

/**
 * Urutan chip diambil dari sumber yang SAMA dengan perhitungan server
 * (`AttentionCounts`) agar tidak ada alasan yang terlewat saat daftar berubah.
 */
const KEYS = ATTENTION_COUNTER_KEYS;

/**
 * Panel "butuh perhatian" (FASE O5) — work queue ringkas. Klik chip → set
 * filter "butuh perhatian" untuk menelusuri.
 */
export function OrdersAttentionPanel({
  attention,
  onFocus,
  onFocusReason,
}: {
  attention: AttentionSummary | null;
  /** Buka daftar ber-filter "butuh perhatian" (semua alasan). */
  onFocus: () => void;
  /** Buka daftar ber-filter satu alasan tertentu (F-G11). */
  onFocusReason?: (reason: string) => void;
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
              onClick={() => (onFocusReason ? onFocusReason(k) : onFocus())}
              title={`Tampilkan hanya: ${ATTENTION_LABEL[k]}`}
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
          Batas pemindaian 5.000 pesanan tercapai — hitungan mungkin belum lengkap.
        </p>
      )}
    </div>
  );
}
