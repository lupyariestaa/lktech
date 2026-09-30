import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check, Package, ShieldCheck, Sparkles, Truck, Wrench } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ProductBuyActions } from "@/components/product-buy-actions";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/motion";
import {
  getProductBySlug,
  getProducts,
  getProductSlugs,
} from "@/lib/products";
import { formatPrice } from "@/lib/product-format";
import { PRODUCT_CATEGORY_LABEL } from "@/lib/product-types";
import { SITE } from "@/lib/site";

type Params = { slug: string };

export const revalidate = 120;

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produk tidak ditemukan" };

  return {
    title: product.name,
    description: product.tagline || product.description.slice(0, 150),
    alternates: { canonical: `/produk/${slug}` },
    openGraph: {
      title: product.name,
      description: product.tagline || product.description.slice(0, 150),
      type: "website",
      url: `/produk/${slug}`,
      images: product.cover !== "default" ? [product.cover] : undefined,
    },
  };
}

export default async function ProdukDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const all = await getProducts();
  const others = all.filter((p) => p.slug !== slug).slice(0, 3);

  const hasDiscount =
    product.originalPrice != null && product.originalPrice > product.price;
  const gallery = [product.cover, ...product.gallery].filter(
    (url) => url && url !== "default",
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: gallery.length
      ? gallery.map((g) => g)
      : [`${SITE.url}${SITE.ogImage}`],
    category: PRODUCT_CATEGORY_LABEL[product.category],
    brand: { "@type": "Brand", name: "LKTech" },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "IDR",
      availability: product.soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: `${SITE.url}/produk/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        align="left"
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Produk", href: "/produk" },
          { label: product.name },
        ]}
        eyebrow={PRODUCT_CATEGORY_LABEL[product.category]}
        title={product.name}
        description={product.tagline || product.description}
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-2xl font-bold text-secondary">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted line-through">
              {formatPrice(product.originalPrice!)}
            </span>
          )}
          {product.soldOut && (
            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold text-white">
              Stok habis
            </span>
          )}
        </div>
      </PageHero>

      <div className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1fr_340px]">
          {/* ===== Konten utama ===== */}
          <div className="flex flex-col gap-14">
            {/* Galeri / cover */}
            <section>
              <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-primary/10 to-primary-light/10">
                {gallery.length ? (
                  <Image
                    src={gallery[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 720px"
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-primary/40">
                    <Package className="h-16 w-16" />
                  </div>
                )}
              </div>

              {gallery.length > 1 && (
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {gallery.slice(1).map((url, i) => (
                    <div
                      key={`${url}-${i}`}
                      className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200"
                    >
                      <Image
                        src={url}
                        alt={`${product.name} ${i + 2}`}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Deskripsi */}
            <section>
              <SectionTitle eyebrow="Deskripsi" title="Tentang produk ini" />
              <p className="mt-6 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                {product.description}
              </p>
            </section>

            {/* Fitur */}
            {product.features.length > 0 && (
              <section>
                <SectionTitle eyebrow="Keunggulan" title="Fitur utama" />
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {product.features.map((f, i) => (
                    <Reveal key={f.title} delay={i * 0.05}>
                      <div className="flex h-full gap-4 rounded-2xl border border-slate-100 bg-surface p-5">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-secondary">
                            {f.title}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            {f.description}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            {/* Spesifikasi */}
            {product.specs.length > 0 && (
              <section>
                <SectionTitle eyebrow="Spesifikasi" title="Detail teknis" />
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <tbody>
                      {product.specs.map((s, i) => (
                        <tr
                          key={`${s.label}-${i}`}
                          className={i % 2 === 0 ? "bg-surface" : "bg-white"}
                        >
                          <th
                            scope="row"
                            className="w-1/3 px-5 py-3.5 text-left font-medium text-muted"
                          >
                            {s.label}
                          </th>
                          <td className="px-5 py-3.5 font-semibold text-secondary">
                            {s.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Yang didapat */}
            {product.includes.length > 0 && (
              <section>
                <SectionTitle eyebrow="Paket" title="Yang Anda dapatkan" />
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {product.includes.map((inc) => (
                    <li
                      key={inc}
                      className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-surface px-5 py-4"
                    >
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm text-slate-700">{inc}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ===== Sidebar pembelian ===== */}
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <div className="flex flex-col gap-5">
              <div className="rounded-3xl border border-slate-200 bg-surface p-6">
                <p className="text-xs font-medium text-muted">Harga</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-2xl font-bold text-secondary">
                    {formatPrice(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-muted line-through">
                      {formatPrice(product.originalPrice!)}
                    </span>
                  )}
                </div>

                <ProductBuyActions
                  product={product}
                  compact
                  className="mt-5"
                />

                <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Pembelian memerlukan login akun Google. Checkout & konfirmasi
                  dilakukan via WhatsApp.
                </p>
              </div>

              {product.delivery && (
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted">Pengiriman</p>
                    <p className="text-sm font-semibold text-secondary">
                      {product.delivery}
                    </p>
                  </div>
                </div>
              )}

              {product.tools.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-secondary">
                    <Wrench className="h-4 w-4 text-primary" />
                    Tools &amp; Teknologi
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.tools.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Produk lain */}
      {others.length > 0 && (
        <section className="relative bg-surface py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-bold text-secondary sm:text-3xl">
              Produk <span className="text-gradient">lainnya</span>
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
            <div className="mt-10">
              <Link
                href="/produk"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Lihat semua produk →
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <span className="text-xs font-semibold tracking-widest text-primary uppercase">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-2xl font-bold text-secondary sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
