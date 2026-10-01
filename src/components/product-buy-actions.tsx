"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, ShoppingBag, ShoppingCart, Zap } from "lucide-react";
import type { Product } from "@/lib/product-types";
import { cartItemKey, toCartItem } from "@/lib/cart";
import { hasVariants, productIsPurchasable } from "@/lib/product-format";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/**
 * Aksi pembelian untuk produk TUNGGAL (tanpa varian): "Tambah ke Keranjang" &
 * "Beli Sekarang". Untuk produk multi-varian, gunakan `ProductVariantPicker`.
 *
 * Keduanya mengharuskan user login (akun Google). Bila belum login, user
 * diarahkan ke `/masuk` dengan `next` kembali ke halaman produk.
 *
 * Produk tanpa harga ("Hubungi kami") atau stok habis tidak bisa dibeli langsung
 * → ditampilkan sebagai tombol konsultasi WhatsApp.
 */
export function ProductBuyActions({
  product,
  className,
  compact = false,
}: {
  product: Product;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { add, has } = useCart();
  const [added, setAdded] = useState(false);

  const soldOut = product.soldOut;
  const needsConsultation = !hasVariants(product) && !productIsPurchasable(product);

  // Produk tanpa harga → arahkan ke WhatsApp untuk konsultasi.
  if (needsConsultation) {
    const message =
      product.waMessage?.trim() ||
      `Halo LKTech! Saya tertarik dengan produk "${product.name}". Boleh dibantu info harga & cara pesan?`;
    return (
      <div className={cn("flex gap-3", className)}>
        <a
          href={waLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full bg-primary font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark",
            compact ? "w-full px-4 py-2.5 text-sm" : "px-6 py-3 text-sm",
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Hubungi kami
        </a>
      </div>
    );
  }

  const requireLogin = (): boolean => {
    if (!user) {
      router.push(
        `/masuk?next=${encodeURIComponent(`/produk/${product.slug}`)}`,
      );
      return false;
    }
    return true;
  };

  const onAdd = () => {
    if (soldOut) return;
    if (!requireLogin()) return;
    add(toCartItem(product, null, 1));
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const onBuyNow = () => {
    if (soldOut) return;
    if (!requireLogin()) return;
    // Siapkan keranjang berisi 1 produk ini lalu lanjut checkout.
    add(toCartItem(product, null, 1));
    router.push("/keranjang");
  };

  const inCart = has(cartItemKey({ slug: product.slug }));

  return (
    <div className={cn("flex gap-3", compact ? "flex-col" : "flex-wrap", className)}>
      <button
        onClick={onAdd}
        disabled={soldOut}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition-all",
          compact ? "px-4 py-2.5 text-sm" : "px-6 py-3 text-sm",
          soldOut
            ? "cursor-not-allowed border-slate-200 text-slate-400"
            : added
              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
              : "border-slate-200 bg-white text-secondary hover:border-primary/40 hover:text-primary",
        )}
        aria-label="Tambah ke keranjang"
      >
        {added ? (
          <>
            <Check className="h-4 w-4" /> Ditambahkan
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            {compact ? "Keranjang" : inCart ? "Tambah lagi" : "Tambah ke Keranjang"}
          </>
        )}
      </button>

      <button
        onClick={onBuyNow}
        disabled={soldOut}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-primary font-semibold text-white shadow-lg shadow-primary/30 transition-all",
          compact ? "px-4 py-2.5 text-sm" : "px-6 py-3 text-sm",
          soldOut
            ? "cursor-not-allowed opacity-60"
            : "hover:-translate-y-0.5 hover:bg-primary-dark",
        )}
        aria-label="Beli sekarang"
      >
        {soldOut ? (
          <>
            <ShoppingBag className="h-4 w-4" /> Stok habis
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Beli Sekarang
          </>
        )}
      </button>
    </div>
  );
}

