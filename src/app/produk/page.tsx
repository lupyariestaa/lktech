import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Package, Ticket } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ProductGrid } from "@/components/product-grid";
import { getProducts } from "@/lib/products";
import { listPublicPromos } from "@/lib/promos";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Produk",
  description:
    "Produk digital LKTech: template, software, aplikasi, dan e-book siap pakai dengan harga transparan. Beli langsung — bayar online & unduh otomatis.",
  alternates: { canonical: "/produk" },
  openGraph: {
    title: "Produk",
    description:
      "Produk digital siap pakai dengan harga transparan — template, software, aplikasi, dan e-book.",
    url: "/produk",
  },
};

export default async function ProdukPage() {
  const [products, promos] = await Promise.all([
    getProducts(),
    listPublicPromos(),
  ]);

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Produk" }]}
        eyebrow="Produk"
        title={
          <>
            Produk digital{" "}
            <span className="text-gradient">siap pakai</span>
          </>
        }
        description="Berbeda dari layanan custom, produk kami sudah jadi dan langsung bisa dibeli — harga jelas, spesifikasi transparan, tanpa menunggu lama."
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-muted shadow-sm">
          <Package className="h-4 w-4 text-primary" />
          {products.length} produk tersedia
        </div>
      </PageHero>

      {promos.length > 0 && (
        <div className="border-b border-emerald-100 bg-emerald-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-6 py-3 text-center text-sm text-emerald-700">
            <Ticket className="h-4 w-4" />
            <span className="font-semibold">
              Ada {promos.length} kode promo aktif!
            </span>
            <Link
              href="/promo"
              className="inline-flex items-center gap-1 font-semibold underline decoration-emerald-400 underline-offset-2 hover:text-emerald-800"
            >
              Lihat promo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <ProductGrid products={products} />
        </div>
      </section>
    </>
  );
}
