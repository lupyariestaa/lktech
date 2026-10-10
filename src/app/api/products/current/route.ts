import { NextResponse } from "next/server";
import { getProductsBySlugs } from "@/lib/products";
import { effectiveFulfillment } from "@/lib/order-fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/products/current?slugs=a,b,c&variants=slug:var,...
 *
 * OR-B3 — Ambil HARGA & KELAYAKAN terkini untuk item yang akan dimasukkan ulang
 * ke keranjang (mis. aksi "Pesan lagi" dari riwayat pesanan). Klien memakai ini
 * agar keranjang menampilkan harga/status yang AKTUAL (bukan harga lama di order),
 * lalu checkout tetap memverifikasi ulang server (safety net).
 *
 * Aman & publik (hanya data produk publik). Mengembalikan per-slug:
 * `{ slug, exists, active, soldOut, price, variant?: {slug, name, price, soldOut, stock}, name }`.
 * Untuk produk multi-varian, `price` = harga varian yang diminta (bila ada) atau
 * varian termurah yang tersedia.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawSlugs = url.searchParams.get("slugs") ?? "";
  const rawVariants = url.searchParams.get("variants") ?? "";

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

  // Peta varian yang diminta: `slug` → `variantSlug`.
  const wantedVariants = new Map<string, string>();
  for (const pair of rawVariants.split(",")) {
    const [s, v] = pair.split(":").map((x) => x?.trim());
    if (s && v) wantedVariants.set(s, v);
  }

  try {
    const products = await getProductsBySlugs(slugs);
    const out = slugs.map((slug) => {
      const product = products.get(slug);
      if (!product) {
        return { slug, exists: false, active: false, soldOut: true, price: 0 };
      }

      const variantSlug = wantedVariants.get(slug);
      if (product.variants.length > 0) {
        const variant =
          product.variants.find((v) => v.slug === variantSlug) ??
          product.variants.find((v) => !v.soldOut) ??
          product.variants[0];
        return {
          slug: product.slug,
          exists: true,
          name: product.name,
          active: product.active,
          soldOut: product.soldOut || Boolean(variant?.soldOut),
          fulfillment: effectiveFulfillment(
            product.category === "jasa" ? "jasa" : "instan",
          ),
          price: variant?.price ?? 0,
          variant: variant
            ? {
                slug: variant.slug,
                name: variant.name,
                price: variant.price,
                soldOut: variant.soldOut,
                stock: variant.stock ?? null,
              }
            : null,
        };
      }

      return {
        slug: product.slug,
        exists: true,
        name: product.name,
        active: product.active,
        soldOut: product.soldOut,
        fulfillment: effectiveFulfillment(
          product.category === "jasa" ? "jasa" : "instan",
        ),
        price: product.price,
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
