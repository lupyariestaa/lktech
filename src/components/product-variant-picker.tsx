"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  MessageCircle,
  ShoppingCart,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Product, ProductVariant } from "@/lib/product-types";
import { cardItemForVariant } from "@/lib/cart";
import { formatPrice } from "@/lib/product-format";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { useProductPurchase } from "@/components/product-purchase-context";
import { VariantCanvas } from "@/components/variant-canvas";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/**
 * Pemilih paket/varian (produk multi-harga) dalam KANVAS pan+zoom.
 *
 * Alur: user memilih paket terlebih dahulu ("Pilih paket ini") — pilihan
 * dibagikan ke panel sidebar (`ProductPurchasePanel`) lewat context. Tombol
 * "Beli Sekarang"/"Keranjang" di kartu tetap tersedia sebagai jalur cepat.
 */
export function ProductVariantPicker({
  product,
  variants,
}: {
  product: Product;
  variants: ProductVariant[];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { add } = useCart();
  const { selectedVariantSlug, selectVariant } = useProductPurchase();
  const [addedId, setAddedId] = useState<string | null>(null);

  const requireLogin = (): boolean => {
    if (!user) {
      router.push(`/masuk?next=${encodeURIComponent(`/produk/${product.slug}`)}`);
      return false;
    }
    return true;
  };

  const pick = (variant: ProductVariant, buyNow: boolean) => {
    if (variant.soldOut) return;
    if (!requireLogin()) return;
    add(cardItemForVariant(product, variant, 1));
    if (buyNow) {
      router.push("/keranjang");
      return;
    }
    setAddedId(variant.slug);
    setTimeout(() => setAddedId(null), 1800);
  };

  return (
    <div>
      <VariantCanvas>
        <div className="flex gap-6">
          {variants.map((v) => {
            const hasDiscount = v.originalPrice != null && v.originalPrice > v.price;
            const disabled = v.soldOut;
            const isAdded = addedId === v.slug;
            const isSelected = selectedVariantSlug === v.slug;
            return (
              <div
                key={v.slug}
                className={cn(
                  "relative flex w-[300px] shrink-0 flex-col rounded-3xl border bg-white p-6 transition-all duration-300 sm:w-[320px]",
                  isSelected
                    ? "border-primary shadow-xl shadow-primary/10 ring-2 ring-primary/30"
                    : v.highlight
                      ? "border-primary/40 shadow-xl shadow-primary/10 ring-1 ring-primary/20"
                      : "border-slate-200 hover:border-primary/25 hover:shadow-lg hover:shadow-slate-900/5",
                )}
              >
                {v.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-[11px] font-semibold text-white shadow">
                    Paling Populer
                  </span>
                )}
                {isSelected && !v.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3.5 py-1 text-[11px] font-semibold text-white shadow">
                    Dipilih
                  </span>
                )}

                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-secondary">{v.name}</h3>
                  {v.badge && !v.highlight && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      {v.badge}
                    </span>
                  )}
                </div>
                {v.tagline && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {v.tagline}
                  </p>
                )}

                {/* Harga */}
                <div className="mt-4">
                  {hasDiscount && (
                    <span className="block text-xs text-muted line-through">
                      {formatPrice(v.originalPrice!)}
                    </span>
                  )}
                  <span className="text-2xl font-bold text-secondary">
                    {formatPrice(v.price)}
                  </span>
                  {v.delivery && (
                    <span className="mt-1 block text-xs text-muted">
                      Estimasi: {v.delivery}
                    </span>
                  )}
                </div>

                {/* Fitur */}
                {(v.features.length > 0 || v.includes.length > 0) && (
                  <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                    {v.features.map((f) => (
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
                    {v.includes.map((inc) => (
                      <li key={inc} className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                        </span>
                        <span className="text-sm text-slate-700">{inc}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Spek & batasan ringkas */}
                {(v.specs.length > 0 || v.limits.length > 0) && (
                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5">
                    {v.specs.length > 0 && (
                      <dl className="flex flex-col gap-1.5">
                        {v.specs.map((s) => (
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
                    {v.limits.length > 0 && (
                      <div className="rounded-2xl bg-amber-50 px-3.5 py-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Batasan paket
                        </p>
                        <ul className="mt-1.5 flex flex-col gap-1">
                          {v.limits.map((l) => (
                            <li
                              key={l}
                              className="text-xs leading-relaxed text-amber-800"
                            >
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
                    onClick={() => pick(v, true)}
                    disabled={disabled}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all",
                      v.highlight
                        ? "bg-primary shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary-dark"
                        : "bg-secondary shadow-secondary/20 hover:-translate-y-0.5 hover:bg-secondary/90",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {disabled ? "Tidak tersedia" : "Beli Sekarang"}
                    {!disabled && <Zap className="h-4 w-4" />}
                  </button>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => selectVariant(isSelected ? null : v.slug)}
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
                      onClick={() => pick(v, false)}
                      disabled={disabled}
                      aria-label="Tambah ke keranjang"
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary",
                        disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      {isAdded ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </VariantCanvas>

      {/* Ajakan konsultasi */}
      <div className="mt-10">
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-secondary">
                Butuh paket lain atau kombinasi khusus?
              </p>
              <p className="text-xs text-muted">
                Hubungi kami untuk konsultasi kebutuhan Anda.
              </p>
            </div>
          </div>
          <a
            href={waLink(
              product.waMessage?.trim() ||
                `Halo LKTech! Saya ingin bertanya tentang produk "${product.name}".`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" />
            Tanya via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
