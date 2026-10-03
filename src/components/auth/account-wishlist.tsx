"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Package, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/product-types";
import { hasVariants, productPriceLabel } from "@/lib/product-format";

/** Tab "Favorit": grid produk wishlist + aksi. */
export function AccountWishlist({
  products,
  removing,
  onRemove,
  onAddToCart,
}: {
  products: Product[];
  /** Slug yang sedang diproses hapus (untuk disabled state). */
  removing: string | null;
  onRemove: (slug: string) => void;
  onAddToCart: (product: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-12 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface text-muted">
          <Heart className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-secondary">
          Belum ada produk favorit.
        </p>
        <p className="mt-1 text-xs text-muted">
          Tandai produk dengan ikon hati untuk menyimpannya di sini.
        </p>
        <Link
          href="/produk"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
        >
          <Package className="h-4 w-4" />
          Jelajahi Produk
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const multi = hasVariants(product);
        return (
          <div
            key={product.slug}
            className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white"
          >
            <Link
              href={`/produk/${product.slug}`}
              className="relative block aspect-video overflow-hidden bg-gradient-to-br from-primary/10 to-primary-light/10"
            >
              {product.cover && product.cover !== "default" ? (
                <Image
                  src={product.cover}
                  alt={product.coverAlt || product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary/40">
                  <Package className="h-10 w-10" />
                </div>
              )}
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <Link
                href={`/produk/${product.slug}`}
                className="text-sm font-bold text-secondary hover:text-primary"
              >
                {product.name}
              </Link>
              <p className="mt-1 text-sm font-semibold text-primary">
                {productPriceLabel(product)}
              </p>

              <div className="mt-3 flex flex-1 items-end gap-2">
                {multi ? (
                  <Link
                    href={`/produk/${product.slug}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-2.5 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    Pilih paket
                  </Link>
                ) : (
                  <button
                    onClick={() => onAddToCart(product)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-dark"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Keranjang
                  </button>
                )}
                <button
                  onClick={() => onRemove(product.slug)}
                  disabled={removing === product.slug}
                  aria-label="Hapus dari favorit"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
