"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/product-format";
import { cn } from "@/lib/utils";

/** Produk ringkas untuk cross-sell (dari /api/products/related). */
type RelatedProduct = {
  slug: string;
  name: string;
  tagline: string;
  price: number;
  cover: string;
  category: string;
  categoryLabel: string;
};

/**
 * Cross-sell di keranjang (FASE P3): menampilkan produk yang "sering dibeli
 * bersama" item di keranjang. Arahkan ke halaman produk (aman untuk produk
 * multi-varian — pembeli memilih paket di sana).
 *
 * Best-effort: bila tak ada saran / API gagal → tidak menampilkan apa pun.
 */
export function CartCrossSell() {
  const { items, has } = useCart();
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Slug unik produk di keranjang (kunci untuk saran). Bergantung pada isi
  // keranjang (bukan qty) agar tidak refetch saat jumlah berubah.
  const slugsKey = Array.from(new Set(items.map((it) => it.slug)))
    .sort()
    .join(",");

  useEffect(() => {
    if (!slugsKey) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products/related?slugs=${encodeURIComponent(slugsKey)}`,
          { cache: "no-store" },
        );
        const data = res.ok ? await res.json() : { products: [] };
        if (active) setProducts(Array.isArray(data?.products) ? data.products : []);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slugsKey]);

  // Sembunyikan produk yang sudah ada di keranjang. Bila keranjang kosong,
  // tidak ada saran yang ditampilkan (tanpa menyentuh state di efek).
  if (!slugsKey) return null;
  const visible = products.filter((p) => !has(p.slug));
  if (loading && visible.length === 0) return null;
  if (visible.length === 0) return null;

  return (
    <section className="mt-10" aria-label="Sering dibeli bersama">
      <h2 className="flex items-center gap-2 text-sm font-bold text-secondary">
        <Sparkles className="h-4 w-4 text-primary" />
        Sering dibeli bersama
      </h2>
      <p className="mt-1 text-xs text-muted">
        Lengkapi pesanan Anda dengan produk yang biasa dipesan bersama.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((p) => (
          <li
            key={p.slug}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface">
              {p.cover && p.cover !== "default" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.cover}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-[10px] font-semibold text-muted">
                  {p.categoryLabel}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/produk/${p.slug}`}
                className="line-clamp-2 text-sm font-semibold text-secondary hover:text-primary"
              >
                {p.name}
              </Link>
              <p className="mt-0.5 text-xs font-bold text-secondary">
                {formatPrice(p.price)}
              </p>
            </div>
            <Link
              href={`/produk/${p.slug}`}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-secondary",
                "transition-colors hover:border-primary/40 hover:text-primary",
              )}
              aria-label={`Lihat ${p.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
              Lihat
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
