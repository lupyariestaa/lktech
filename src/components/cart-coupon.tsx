"use client";

import { useEffect, useRef, useState } from "react";
import { BadgePercent, Check, Loader2, Sparkles, Tag, X } from "lucide-react";
import { validateCouponRequest, CouponSessionError } from "@/lib/coupon-api";
import { formatRupiah } from "@/lib/format";
import {
  trackCouponApplyFail,
  trackCouponApplySuccess,
  trackCouponAutopick,
  trackCouponView,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type AppliedCoupon = {
  code: string;
  discount: number;
  description?: string | null;
};

/** Saran "kode terbaik" (C3) untuk ditampilkan sebagai tombol cepat. */
export type BestCouponHint = {
  code: string;
  discount: number;
  description?: string | null;
};

/**
 * Input & tampilan kode promo di halaman keranjang (klien).
 *
 * Kontrol state ada di induk (`cart-view`): `applied` (kupon aktif) + callback
 * `onApplied`/`onCleared`. Diskon final tetap dihitung server saat checkout.
 *
 * `notice` = pesan dari induk (mis. kupon dicabut karena syarat berubah) yang
 * ditampilkan DI WIDGET kupon ini — bukan di area error checkout (F-K2).
 *
 * `bestHint` = saran kode terbaik (C3/K2). Bila ada & belum ada kupon aktif,
 * tampil tombol "Terapkan kode terbaik" (opt-in, 1 klik).
 */
export function CartCoupon({
  subtotal,
  applied,
  onApplied,
  onCleared,
  disabled = false,
  promoCode,
  slugs,
  itemCount,
  notice,
  bestHint,
}: {
  subtotal: number;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon) => void;
  onCleared: () => void;
  disabled?: boolean;
  /** Kode dari URL (`?promo=`) untuk di-prefill (`KP-P1`). */
  promoCode?: string;
  /** Slug produk di keranjang (validasi kupon bundel, FASE P3). */
  slugs?: string[];
  /** Total jumlah item (qty) di keranjang (validasi `minItems`). */
  itemCount?: number;
  /** Pesan info/peringatan dari induk (mis. kupon dicabut otomatis). */
  notice?: string | null;
  /** Saran kode terbaik (C3). */
  bestHint?: BestCouponHint | null;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefilledRef = useRef(false);
  const viewedRef = useRef(false);

  // Event `coupon_view` (sekali) — widget kupon tampil.
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackCouponView({ placement: "cart" });
  }, []);

  // `KP-P1`: prefill kode dari URL (`/keranjang?promo=LAUNCH`).
  useEffect(() => {
    if (prefilledRef.current || !promoCode) return;
    prefilledRef.current = true;
    setCode(promoCode.trim().toUpperCase());
  }, [promoCode]);

  const onApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value || busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const result = await validateCouponRequest(value, subtotal, {
        slugs,
        itemCount,
      });
      if (!result.valid) {
        setError(result.reason);
        trackCouponApplyFail({ code: value, reason: result.reason });
        return;
      }
      onApplied({
        code: result.code,
        discount: result.discount,
        description: result.description,
      });
      trackCouponApplySuccess({ code: result.code, discount: result.discount });
      setCode("");
    } catch (err) {
      if (err instanceof CouponSessionError) {
        setError("Masuk dengan Google untuk memakai kode promo.");
      } else {
        setError(err instanceof Error ? err.message : "Gagal memvalidasi kode.");
      }
      trackCouponApplyFail({ code: value });
    } finally {
      setBusy(false);
    }
  };

  const onApplyBest = () => {
    if (!bestHint || disabled) return;
    onApplied({
      code: bestHint.code,
      discount: bestHint.discount,
      description: bestHint.description,
    });
    trackCouponAutopick({ code: bestHint.code, discount: bestHint.discount });
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
        {notice && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-700">
            <span aria-hidden="true">⚠</span>
            {notice}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="cart-coupon-code" className="sr-only">
        Kode promo
      </label>
      <form onSubmit={onApply} className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <BadgePercent className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="cart-coupon-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Kode promo"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "cart-coupon-error" : undefined}
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

      {/* Saran kode terbaik (C3/K2) — opt-in, 1 klik. */}
      {bestHint && !disabled && (
        <button
          type="button"
          onClick={onApplyBest}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-100"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Pakai kode terbaik: {bestHint.code} (hemat {formatRupiah(bestHint.discount)})
        </button>
      )}

      {error && (
        <p id="cart-coupon-error" role="alert" className="mt-2 text-xs text-rose-500">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-amber-700">
          {notice}
        </p>
      )}
    </div>
  );
}
