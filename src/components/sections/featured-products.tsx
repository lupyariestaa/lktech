import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getProducts } from "@/lib/products";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { ProductCard } from "@/components/product-card";

/**
 * Seksi "Produk digital unggulan" pada beranda (FASE H5).
 *
 * Server component: mengambil katalog publik via `getProducts()` (hanya produk
 * aktif, urut unggulan → nama). Menampilkan maksimum 6 produk dan **tersembunyi
 * total** bila tidak ada produk (jangan render seksi kosong).
 *
 * `ProductCard` sudah menangani badge stok nyata, bintang rating, dan aksi beli
 * (keranjang/unduh) sehingga konsisten dengan katalog `/produk`.
 */
export async function FeaturedProducts({
  limit = 6,
}: {
  limit?: number;
}) {
  const products = await getProducts();
  if (products.length === 0) return null;

  const items = products.slice(0, Math.max(1, limit));

  return (
    <section
      id="produk"
      aria-labelledby="produk-heading"
      className="relative scroll-mt-24 bg-surface py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Produk Digital"
          title={
            <span id="produk-heading">
              Produk siap pakai,{" "}
              <span className="text-gradient">langsung bisa dibeli</span>
            </span>
          }
          description="Template, software, dan aset digital yang sudah jadi — harga transparan, checkout cepat, tanpa menunggu pengerjaan custom."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product, i) => (
            <Reveal key={product.slug} delay={i * 0.08}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <Link
            href="/produk"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-secondary backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-lg hover:shadow-primary/10"
          >
            Lihat semua produk
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
