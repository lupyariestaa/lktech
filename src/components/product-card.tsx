"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Layers, Package, Tag } from "lucide-react";
import type { Product } from "@/lib/product-types";
import { PRODUCT_CATEGORY_LABEL } from "@/lib/product-types";
import { formatPrice, hasVariants, productPriceLabel, stockBadge, productTotalStock, LOW_STOCK_THRESHOLD } from "@/lib/product-format";
import { ProductBuyActions } from "@/components/product-buy-actions";
import { FavoriteButton } from "@/components/favorite-button";
import { RatingStars } from "@/components/rating-stars";
import { cn } from "@/lib/utils";

/**
 * Kartu produk untuk daftar `/produk`, beranda, dan "produk terkait".
 *
 * `imageSizes` mengikuti grid pemanggil (Next/Image `fill`): nilai bawaan
 * cocok untuk grid `/produk` (2 kolom di HP), sedangkan beranda memakai
 * 1 kolom di HP sehingga perlu `100vw` agar gambar tetap tajam di retina.
 */
export function ProductCard({
  product,
  imageSizes = "(max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw",
}: {
  product: Product;
  imageSizes?: string;
}) {
  // Bila cover gagal dimuat (jaringan lambat / aset hilang), jangan biarkan
  // kartu kosong: tampilkan placeholder ikon yang sama dengan cover bawaan.
  const [coverFailed, setCoverFailed] = useState(false);
  const cover =
    product.cover && product.cover !== "default" ? product.cover : null;
  const multi = hasVariants(product);
  const hasDiscount =
    !multi &&
    product.originalPrice != null &&
    product.originalPrice > product.price;
  // Badge stok nyata (FASE P4). Untuk multi-varian, tampilkan total "Sisa N"
  // bila stok menipis (agregat varian) / "Stok habis" bila semua varian habis.
  const stock = multi
    ? (() => {
        const out = product.soldOut || product.variants.every((v) => v.soldOut);
        if (out) return { label: "Stok habis", kind: "out" as const };
        const total = productTotalStock(product);
        if (total !== null && total <= LOW_STOCK_THRESHOLD) {
          return { label: `Sisa ${total}`, kind: "low" as const };
        }
        return null;
      })()
    : stockBadge(product);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 sm:rounded-3xl">
      {/* Cover — rasio 16:9 mengikuti asli gambar, jadi teks di dalam cover
          tidak terpotong (dulu 4:3 + object-cover memotong ±25% lebarnya). */}
      <Link
        href={`/produk/${product.slug}`}
        className="relative block aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 to-primary-light/10"
      >
        {cover && !coverFailed ? (
          <Image
            src={cover}
            alt={product.coverAlt || product.name}
            fill
            sizes={imageSizes}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/40">
            <Package className="h-8 w-8 sm:h-12 sm:w-12" />
          </div>
        )}

        {/* Badge: di HP hanya tampilkan 1 badge prioritas agar tidak sesak. */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 sm:top-3 sm:left-3 sm:gap-1.5">
          {product.badge ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white shadow sm:px-3 sm:py-1 sm:text-[11px]">
              {product.badge}
            </span>
          ) : stock ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow sm:px-3 sm:py-1 sm:text-[11px]",
                stock.kind === "out" ? "bg-slate-800/80" : "bg-rose-500/90",
              )}
            >
              {stock.label}
            </span>
          ) : multi ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-white shadow sm:px-3 sm:py-1 sm:text-[11px]">
              <Layers className="h-3 w-3" />
              {product.variants.length} paket
            </span>
          ) : null}
          {/* Badge tambahan (stok/multi) hanya di layar ≥sm. */}
          {product.badge && stock && (
            <span
              className={cn(
                "hidden rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow sm:inline-block",
                stock.kind === "out" ? "bg-slate-800/80" : "bg-rose-500/90",
              )}
            >
              {stock.label}
            </span>
          )}
          {product.badge && !stock && multi && (
            <span className="hidden items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-white shadow sm:inline-flex">
              <Layers className="h-3 w-3" />
              {product.variants.length} paket
            </span>
          )}
        </div>
      </Link>

      {/* Tombol favorit (di luar <Link> agar HTML valid) */}
      <FavoriteButton slug={product.slug} className="absolute top-2 right-2 z-10 sm:top-3 sm:right-3" />

      {/* Body */}
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary sm:px-2.5 sm:py-1 sm:text-[11px]">
            <Tag className="h-3 w-3" />
            {PRODUCT_CATEGORY_LABEL[product.category]}
          </span>
          {product.reviewsEnabled !== false &&
            product.ratingSummary &&
            product.ratingSummary.count > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-secondary sm:text-[11px]">
                <RatingStars value={product.ratingSummary.avg} size="sm" />
                <span className="text-muted">
                  {product.ratingSummary.avg.toFixed(1)} ({product.ratingSummary.count})
                </span>
              </span>
            )}
        </div>

        <h3 className="mt-2 line-clamp-2 text-sm font-bold text-secondary sm:mt-3 sm:text-base">
          <Link href={`/produk/${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        {/* Deskripsi hanya tampil di layar ≥sm (di HP cukup nama produk). */}
        <p className="mt-1.5 line-clamp-2 hidden flex-1 text-sm leading-relaxed text-muted sm:block">
          {product.tagline || product.description}
        </p>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-2 sm:mt-4">
          <div className="min-w-0">
            {hasDiscount && (
              <span className="block text-[11px] text-muted line-through sm:text-xs">
                {formatPrice(product.originalPrice!)}
              </span>
            )}
            <span
              className={cn(
                "block truncate text-sm font-bold sm:text-lg",
                multi || product.price ? "text-secondary" : "text-primary",
              )}
            >
              {productPriceLabel(product)}
            </span>
          </div>
          <Link
            href={`/produk/${product.slug}`}
            className="hidden items-center gap-1 text-xs font-semibold text-primary hover:underline sm:inline-flex"
          >
            {multi ? "Pilih paket" : "Detail"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {multi ? (
          <Link
            href={`/produk/${product.slug}`}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary sm:mt-4 sm:gap-2 sm:px-6 sm:py-3 sm:text-sm"
          >
            <Layers className="h-4 w-4" />
            {product.variants.length} Paket
          </Link>
        ) : (
          <ProductBuyActions product={product} compact className="mt-3 sm:mt-4" />
        )}
      </div>
    </div>
  );
}

