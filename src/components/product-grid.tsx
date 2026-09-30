"use client";

import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import type { Product, ProductCategory } from "@/lib/product-types";
import { PRODUCT_CATEGORY_LABEL } from "@/lib/product-types";
import { ProductCard } from "@/components/product-card";
import { cn } from "@/lib/utils";

/** Daftar produk dengan filter kategori (client-side). */
export function ProductGrid({ products }: { products: Product[] }) {
  const [active, setActive] = useState<ProductCategory | "semua">("semua");

  const categories = useMemo<ProductCategory[]>(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products],
  );

  const filtered = useMemo(
    () =>
      active === "semua"
        ? products
        : products.filter((p) => p.category === active),
    [products, active],
  );

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 py-20 text-center">
        <Package className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-sm font-medium text-secondary">
          Belum ada produk tersedia.
        </p>
        <p className="mt-1 text-xs text-muted">
          Silakan cek kembali nanti atau hubungi kami langsung.
        </p>
      </div>
    );
  }

  return (
    <div>
      {categories.length > 1 && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <FilterChip
            label="Semua"
            active={active === "semua"}
            onClick={() => setActive("semua")}
          />
          {categories.map((c) => (
            <FilterChip
              key={c}
              label={PRODUCT_CATEGORY_LABEL[c]}
              active={active === c}
              onClick={() => setActive(c)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          Tidak ada produk pada kategori ini.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-white shadow-sm shadow-primary/25"
          : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary",
      )}
    >
      {label}
    </button>
  );
}
