import type { Metadata } from "next";
import { Package } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ProductGrid } from "@/components/product-grid";
import { getProducts } from "@/lib/products";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Produk",
  description:
    "Produk digital LKTech: template, software, aplikasi, dan e-book siap pakai dengan harga transparan. Beli langsung dan checkout via WhatsApp.",
  alternates: { canonical: "/produk" },
  openGraph: {
    title: "Produk",
    description:
      "Produk digital siap pakai dengan harga transparan — template, software, aplikasi, dan e-book.",
    url: "/produk",
  },
};

export default async function ProdukPage() {
  const products = await getProducts();

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

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <ProductGrid products={products} />
        </div>
      </section>
    </>
  );
}
