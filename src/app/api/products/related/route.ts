import { NextResponse } from "next/server";
import { getProductsBySlugs, getRelatedProducts } from "@/lib/products";
import { getCoPurchaseMap } from "@/lib/co-purchase-server";
import { rankCoPurchases } from "@/lib/co-purchase";
import { PRODUCT_CATEGORY_LABEL, type Product } from "@/lib/product-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/products/related?slugs=a,b,c — saran CROSS-SELL (FASE P3).
 *
 * Mengembalikan produk AKTIF yang "sering dibeli bersama" item di keranjang:
 * gabung `relatedSlugs` (manual) seluruh item + fallback kategori. Item yang
 * sudah ada di keranjang dikecualikan. Dipakai komponen keranjang (klien).
 *
 * Aman & publik (hanya data produk publik: slug, nama, harga, cover).
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("slugs") ?? "";
  const slugs = Array.from(
    new Set(
      raw
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
    const cartProducts = await getProductsBySlugs(slugs);
    const cartSet = new Set(slugs);

    const picked: Product[] = [];
    const pushUnique = (p: Product | undefined) => {
      if (!p || cartSet.has(p.slug) || picked.some((x) => x.slug === p.slug)) return;
      if (picked.length < 6) picked.push(p);
    };

    // BR-4: ranking riwayat pesanan (sekali per request, best-effort).
    const coMap = await getCoPurchaseMap();

    // Gabungkan saran dari setiap item keranjang (urut sesuai item).
    for (const slug of slugs) {
      const product = cartProducts.get(slug);
      if (!product) continue;
      const rel = await getRelatedProducts(product, {
        limit: 6,
        exclude: cartSet,
        coPurchase: rankCoPurchases(product.slug, coMap),
      });
      for (const r of rel) {
        pushUnique(r);
        if (picked.length >= 6) break;
      }
      if (picked.length >= 6) break;
    }

    return NextResponse.json(
      {
        products: picked.map((p) => ({
          slug: p.slug,
          name: p.name,
          tagline: p.tagline,
          price: p.price,
          cover: p.cover,
          category: p.category,
          categoryLabel: PRODUCT_CATEGORY_LABEL[p.category],
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/products/related] gagal:", err);
    return NextResponse.json({ products: [] });
  }
}
