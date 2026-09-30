"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Package, Tag } from "lucide-react";
import type { Product } from "@/lib/product-types";
import { PRODUCT_CATEGORY_LABEL } from "@/lib/product-types";
import { formatPrice } from "@/lib/product-format";
import { ProductBuyActions } from "@/components/product-buy-actions";
import { cn } from "@/lib/utils";

/** Kartu produk untuk daftar `/produk`. */
export function ProductCard({ product }: { product: Product }) {
  const hasDiscount =
    product.originalPrice != null && product.originalPrice > product.price;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
      {/* Cover */}
      <Link
        href={`/produk/${product.slug}`}
        className="relative block aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 to-primary-light/10"
      >
        {product.cover && product.cover !== "default" ? (
          <Image
            src={product.cover}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/40">
            <Package className="h-12 w-12" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.badge && (
            <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white shadow">
              {product.badge}
            </span>
          )}
          {product.soldOut && (
            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-semibold text-white">
              Stok habis
            </span>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <Tag className="h-3 w-3" />
            {PRODUCT_CATEGORY_LABEL[product.category]}
          </span>
        </div>

        <h3 className="mt-3 text-base font-bold text-secondary">
          <Link href={`/produk/${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
          {product.tagline || product.description}
        </p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            {hasDiscount && (
              <span className="block text-xs text-muted line-through">
                {formatPrice(product.originalPrice!)}
              </span>
            )}
            <span
              className={cn(
                "text-lg font-bold",
                product.price ? "text-secondary" : "text-primary",
              )}
            >
              {formatPrice(product.price)}
            </span>
          </div>
          <Link
            href={`/produk/${product.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Detail
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <ProductBuyActions product={product} className="mt-4" />
      </div>
    </div>
  );
}
