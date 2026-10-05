"use client";

import {
  AlertTriangle,
  Check,
  ShoppingCart,
  Sparkles,
  Zap,
} from "lucide-react";
import type { ProductVariant } from "@/lib/product-types";
import { formatPrice, stockBadge, isStockOut } from "@/lib/product-format";
import { useProductPurchase } from "@/components/product-purchase-context";
import { cn } from "@/lib/utils";

/**
 * Kartu satu paket — dipakai di kanvas (desktop/tablet) maupun daftar mobile.
 *
 * `layout`: "canvas" (lebar tetap, untuk kanvas pan) | "stack" (full width mobile).
 */
export function VariantCard({
  variant,
  layout = "canvas",
  busy,
  added,
  onBuy,
  onAddCart,
}: {
  variant: ProductVariant;
  layout?: "canvas" | "stack";
  busy?: boolean;
  added?: boolean;
  onBuy: (v: ProductVariant) => void;
  onAddCart: (v: ProductVariant) => void;
}) {
  const { selectedVariantSlug, selectVariant } = useProductPurchase();
  const hasDiscount =
    variant.originalPrice != null && variant.originalPrice > variant.price;
  const disabled = isStockOut(variant);
  const isSelected = selectedVariantSlug === variant.slug;
  // Badge stok nyata (FASE P4) — "Sisa N" / "Stok habis" (data nyata).
  const stock = stockBadge(variant);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl border bg-white p-5 transition-all duration-300 sm:p-6",
        layout === "canvas" ? "w-[280px] shrink-0 sm:w-[320px]" : "w-full",
        isSelected
          ? "border-primary shadow-xl shadow-primary/10 ring-2 ring-primary/30"
          : variant.highlight
            ? "border-primary/40 shadow-xl shadow-primary/10 ring-1 ring-primary/20"
            : "border-slate-200 hover:border-primary/25 hover:shadow-lg hover:shadow-slate-900/5",
      )}
    >
      {variant.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-[11px] font-semibold text-white shadow">
          Paling Populer
        </span>
      )}
      {isSelected && !variant.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3.5 py-1 text-[11px] font-semibold text-white shadow">
          Dipilih
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-secondary">{variant.name}</h3>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {variant.badge && !variant.highlight && (
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {variant.badge}
            </span>
          )}
          {stock && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                stock.kind === "out"
                  ? "bg-slate-100 text-slate-500"
                  : "bg-rose-50 text-rose-600",
              )}
            >
              {stock.label}
            </span>
          )}
        </div>
      </div>
      {variant.tagline && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {variant.tagline}
        </p>
      )}

      {/* Harga */}
      <div className="mt-4">
        {hasDiscount && (
          <span className="block text-xs text-muted line-through">
            {formatPrice(variant.originalPrice!)}
          </span>
        )}
        <span className="text-2xl font-bold text-secondary">
          {formatPrice(variant.price)}
        </span>
        {variant.delivery && (
          <span className="mt-1 block text-xs text-muted">
            Estimasi: {variant.delivery}
          </span>
        )}
      </div>

      {/* Fitur */}
      {(variant.features.length > 0 || variant.includes.length > 0) && (
        <ul className="mt-5 flex flex-1 flex-col gap-2.5">
          {variant.features.map((f) => (
            <li key={f.title} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Check className="h-2.5 w-2.5" />
              </span>
              <span className="text-sm text-slate-700">
                {f.title}
                {f.description ? (
                  <span className="text-muted"> — {f.description}</span>
                ) : null}
              </span>
            </li>
          ))}
          {variant.includes.map((inc) => (
            <li key={inc} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-2.5 w-2.5" />
              </span>
              <span className="text-sm text-slate-700">{inc}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Spek & batasan */}
      {(variant.specs.length > 0 || variant.limits.length > 0) && (
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5">
          {variant.specs.length > 0 && (
            <dl className="flex flex-col gap-1.5">
              {variant.specs.map((s) => (
                <div
                  key={`${s.label}-${s.value}`}
                  className="flex items-baseline justify-between gap-3 text-xs"
                >
                  <dt className="text-muted">{s.label}</dt>
                  <dd className="text-right font-semibold text-secondary">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {variant.limits.length > 0 && (
            <div className="rounded-2xl bg-amber-50 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Batasan paket
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {variant.limits.map((l) => (
                  <li key={l} className="text-xs leading-relaxed text-amber-800">
                    • {l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Aksi */}
      <div className="mt-6 flex flex-col gap-2.5">
        <button
          onClick={() => onBuy(variant)}
          disabled={disabled || busy}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all",
            variant.highlight
              ? "bg-primary shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary-dark"
              : "bg-secondary shadow-secondary/20 hover:-translate-y-0.5 hover:bg-secondary/90",
            (disabled || busy) && "cursor-not-allowed opacity-60",
          )}
        >
          {disabled ? "Tidak tersedia" : "Beli Sekarang"}
          {!disabled && <Zap className="h-4 w-4" />}
        </button>

        <div className="flex gap-2.5">
          <button
            onClick={() => selectVariant(isSelected ? null : variant.slug)}
            disabled={disabled}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors",
              isSelected
                ? "border-primary bg-primary-50 text-primary"
                : "border-slate-200 bg-white text-secondary hover:border-primary/40 hover:text-primary",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {isSelected ? (
              <>
                <Check className="h-4 w-4" /> Dipilih
              </>
            ) : (
              "Pilih paket ini"
            )}
          </button>

          <button
            onClick={() => onAddCart(variant)}
            disabled={disabled || busy}
            aria-label="Tambah ke keranjang"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary",
              (disabled || busy) && "cursor-not-allowed opacity-60",
            )}
          >
            {added ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
