"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Layers,
  Loader2,
  ShieldCheck,
  ShoppingCart,
  Zap,
} from "lucide-react";
import type { Product } from "@/lib/product-types";
import { cardItemForVariant } from "@/lib/cart";
import { formatPrice, productPriceLabel } from "@/lib/product-format";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { useAccountStatus } from "@/components/account-status-provider";
import { useProductPurchase } from "@/components/product-purchase-context";
import { cn } from "@/lib/utils";

/**
 * Daftar pilihan paket (radio). Dipakai bersama oleh panel sidebar (desktop)
 * dan bottom sheet (mobile), agar perilaku konsisten.
 */
export function VariantPickerList({ product }: { product: Product }) {
  const { selectedVariantSlug, selectVariant } = useProductPurchase();
  const variants = product.variants;

  return (
    <div className="flex flex-col gap-2">
      {variants.map((v) => {
        const isSel = v.slug === selectedVariantSlug;
        return (
          <button
            key={v.slug}
            type="button"
            onClick={() => selectVariant(isSel ? null : v.slug)}
            disabled={v.soldOut}
            aria-pressed={isSel}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
              isSel
                ? "border-primary bg-primary-50"
                : "border-slate-200 bg-white hover:border-primary/40",
              v.soldOut && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  isSel
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white",
                )}
              >
                {isSel && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-secondary">
                  <span className="break-words">{v.name}</span>
                  {v.highlight && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      Rekomendasi
                    </span>
                  )}
                </span>
                {v.tagline && (
                  <span className="mt-0.5 block text-xs text-muted">
                    {v.tagline}
                  </span>
                )}
                {v.soldOut && (
                  <span className="text-xs text-muted">Stok habis</span>
                )}
              </span>
            </span>
            <span className="shrink-0 text-sm font-bold text-secondary">
              {formatPrice(v.price)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Hook bersama: menyiapkan aksi tambah-ke-keranjang / beli-now untuk paket
 * terpilih, dengan guard login. Dipakai panel desktop & bar mobile.
 */
export function useBuySelectedVariant(product: Product) {
  const router = useRouter();
  const { user } = useAuth();
  const { blocked } = useAccountStatus();
  const { add } = useCart();
  const { selectedVariantSlug } = useProductPurchase();
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [added, setAdded] = useState(false);

  const selected =
    product.variants.find((v) => v.slug === selectedVariantSlug) ?? null;

  const requireLogin = (): boolean => {
    if (!user) {
      router.push(`/masuk?next=${encodeURIComponent(`/produk/${product.slug}`)}`);
      return false;
    }
    return true;
  };

  const run = (buyNow: boolean) => {
    if (!selected || selected.soldOut || blocked) return;
    if (!requireLogin()) return;
    setBusy(buyNow ? "buy" : "cart");
    add(cardItemForVariant(product, selected, 1));
    if (buyNow) {
      router.push("/keranjang");
      return;
    }
    setAdded(true);
    setBusy(null);
    setTimeout(() => setAdded(false), 1800);
  };

  return { selected, busy, added, addToCart: () => run(false), buyNow: () => run(true) };
}

/** Tombol CTA (Beli Sekarang + Tambah Keranjang) — dirender oleh panel/bar. */
export function SelectedVariantActions({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { selected, busy, added, addToCart, buyNow } = useBuySelectedVariant(product);

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <button
        type="button"
        onClick={buyNow}
        disabled={!selected || busy !== null}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all",
          !selected
            ? "cursor-not-allowed bg-slate-300 shadow-none"
            : "bg-primary shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary-dark",
        )}
      >
        {busy === "buy" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        Beli Sekarang
      </button>
      <button
        type="button"
        onClick={addToCart}
        disabled={!selected || busy !== null}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors",
          !selected
            ? "cursor-not-allowed border-slate-200 text-slate-400"
            : "border-slate-200 bg-white text-secondary hover:border-primary/40 hover:text-primary",
        )}
      >
        {added ? (
          <>
            <Check className="h-4 w-4 text-emerald-600" /> Ditambahkan
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" /> Tambah ke Keranjang
          </>
        )}
      </button>

      {!selected && (
        <p className="text-center text-xs font-medium text-amber-600">
          Pilih paket terlebih dahulu untuk melanjutkan.
        </p>
      )}
    </div>
  );
}

/**
 * Panel pembelian di sidebar halaman produk (DESKTOP/tablet ≥ lg).
 *
 * User WAJIB memilih paket dulu. Tombol "Tambah ke Keranjang" & "Beli Sekarang"
 * baru AKTIF setelah paket dipilih.
 */
export function ProductPurchasePanel({ product }: { product: Product }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-surface p-6">
      <p className="text-xs font-medium text-muted">Mulai dari</p>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-bold text-secondary">
          {productPriceLabel(product)}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold text-secondary">
          Pilih paket{" "}
          <span className="font-normal text-muted">
            ({product.variants.length} paket)
          </span>
        </p>
        <div className="mt-2">
          <VariantPickerList product={product} />
        </div>
      </div>

      <SelectedVariantActions product={product} className="mt-4" />

      <a
        href="#paket"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Layers className="h-4 w-4" />
        Lihat detail semua paket
      </a>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Pembelian memerlukan login akun Google. Checkout &amp; konfirmasi via
        WhatsApp.
      </p>
    </div>
  );
}
