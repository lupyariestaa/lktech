import { NextResponse } from "next/server";
import { getProductsBySlugs } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/products/current?slugs=a,b,c
 *
 * OR-B3 — Ambil HARGA & KELAYAKAN terkini untuk item yang akan dimasukkan ulang
 * ke keranjang (mis. aksi "Pesan lagi" dari riwayat pesanan). Klien memakai ini
 * agar keranjang menampilkan harga/status yang AKTUAL (bukan harga lama di order),
 * lalu checkout tetap memverifikasi ulang server (safety net).
 *
 * Aman & publik (hanya data produk publik). Mengembalikan per-slug:
 * `{ slug, exists, active, soldOut, price, variants[], printConfig, category, name }`.
 * Seluruh varian dikembalikan agar pemanggil dapat memeriksa beberapa item dari
 * produk yang sama (mis. beberapa konfigurasi bahan banner).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawSlugs = url.searchParams.get("slugs") ?? "";

  const slugs = Array.from(
    new Set(
      rawSlugs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50),
    ),
  );
  if (slugs.length === 0) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await getProductsBySlugs(slugs);
    const out = slugs.map((slug) => {
      const product = products.get(slug);
      if (!product) {
        return { slug, exists: false, active: false, soldOut: true, price: 0 };
      }

      if (product.variants.length > 0) {
        const variant = product.variants.find((v) => !v.soldOut) ?? product.variants[0];
        return {
          slug: product.slug,
          exists: true,
          name: product.name,
          active: product.active,
          soldOut: product.soldOut || Boolean(variant?.soldOut),
          category: product.category,
          price: variant?.price ?? 0,
          variant: variant
            ? {
                slug: variant.slug,
                name: variant.name,
                price: variant.price,
              soldOut: variant.soldOut,
              stock: variant.stock ?? null,
              printPricing: variant.printPricing,
            }
          : null,
          variants: product.variants.map((item) => ({
            slug: item.slug,
            name: item.name,
            price: item.price,
            soldOut: item.soldOut,
            stock: item.stock ?? null,
            printPricing: item.printPricing,
          })),
          printConfig: product.printConfig,
        };
      }

      return {
        slug: product.slug,
        exists: true,
        name: product.name,
        active: product.active,
        soldOut: product.soldOut,
        category: product.category,
        price: product.price,
        stock: product.stock ?? null,
      };
    });

    return NextResponse.json(
      { products: out },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/products/current] gagal:", err);
    return NextResponse.json({ products: [] });
  }
}
