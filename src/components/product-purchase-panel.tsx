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
import { useProductPurchase } from "@/components/product-purchase-context";
import { cn } from "@/lib/utils";

/**
 * Panel pembelian di sidebar halaman produk (multi-varian).
 *
 * User WAJIB memilih paket dulu (di sini atau di kartu paket — tersinkron via
 * context). Tombol "Tambah ke Keranjang" & "Beli Sekarang" baru AKTIF setelah
 * paket dipilih. Login tetap wajib saat checkout.
 */
export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { user } = useAuth();
  const { add } = useCart();
  const { selectedVariantSlug, selectVariant } = useProductPurchase();
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [added, setAdded] = useState(false);

  const variants = product.variants;
  const selected = variants.find((v) => v.slug === selectedVariantSlug) ?? null;

  const requireLogin = (): boolean => {
    if (!user) {
      router.push(`/masuk?next=${encodeURIComponent(`/produk/${product.slug}`)}`);
      return false;
    }
    return true;
  };

  const onAdd = (buyNow: boolean) => {
    if (!selected || selected.soldOut) return;
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

  return (
    <div className="rounded-3xl border border-slate-200 bg-surface p-6">
      <p className="text-xs font-medium text-muted">Mulai dari</p>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-bold text-secondary">
          {productPriceLabel(product)}
        </span>
      </div>

      {/* Pilihan paket */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-secondary">
          Pilih paket{" "}
          <span className="font-normal text-muted">
            ({variants.length} paket)
          </span>
        </p>
        <div className="mt-2 flex flex-col gap-2">
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
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-secondary">
                      {v.name}
                      {v.highlight && (
                        <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Rekomendasi
                        </span>
                      )}
                    </span>
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
      </div>

      {/* Ringkasan terpilih */}
      {selected && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-50/60 px-4 py-3">
          <p className="text-xs text-muted">Terpilih</p>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-secondary">
              {selected.name}
            </span>
            <span className="text-sm font-bold text-primary">
              {formatPrice(selected.price)}
            </span>
          </div>
          {selected.delivery && (
            <p className="mt-0.5 text-xs text-muted">
              Estimasi: {selected.delivery}
            </p>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => onAdd(true)}
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
          onClick={() => onAdd(false)}
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
