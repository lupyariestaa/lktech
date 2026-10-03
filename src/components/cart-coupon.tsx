"use client";

import { useState } from "react";
import { BadgePercent, Check, Loader2, Tag, X } from "lucide-react";
import { validateCouponRequest } from "@/lib/coupon-api";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AppliedCoupon = {
  code: string;
  discount: number;
  description?: string | null;
};

/**
 * Input & tampilan kode promo di halaman keranjang (klien).
 *
 * Kontrol state ada di induk (`cart-view`): `applied` (kupon aktif) + callback
 * `onApplied`/`onCleared`. Diskon final tetap dihitung server saat checkout.
 */
export function CartCoupon({
  subtotal,
  applied,
  onApplied,
  onCleared,
  disabled = false,
}: {
  subtotal: number;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon) => void;
  onCleared: () => void;
  disabled?: boolean;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value || busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const result = await validateCouponRequest(value, subtotal);
      if (!result.valid) {
        setError(result.reason);
        return;
      }
      onApplied({
        code: result.code,
        discount: result.discount,
        description: result.description,
      });
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memvalidasi kode.");
    } finally {
      setBusy(false);
    }
  };

  if (applied) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <Tag className="h-3.5 w-3.5" />
                {applied.code}
              </p>
              <p className="text-xs text-emerald-600">
                Hemat {formatRupiah(applied.discount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCleared}
            aria-label="Hapus kode promo"
            className="grid h-8 w-8 place-items-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={onApply} className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <BadgePercent className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Kode promo"
            disabled={disabled}
            className={cn(
              "w-full rounded-full border bg-white py-2.5 pr-4 pl-10 font-mono text-sm tracking-wide text-secondary placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60",
              error ? "border-rose-300" : "border-slate-200",
            )}
          />
        </div>
        <button
          type="submit"
          disabled={busy || disabled || !code.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Terapkan"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
