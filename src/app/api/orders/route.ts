import { NextResponse } from "next/server";
import { requireActiveUser, requireUser } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkoutSchema } from "@/lib/order-schema";
import { createOrder, getOrdersByUser } from "@/lib/orders";
import { getProductsBySlugs } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";
import { incrementUserOrderCount } from "@/lib/user-profile";
import { buildOrderMessage } from "@/lib/cart";
import { sendOrderNotification } from "@/lib/email";
import { sendOrderConfirmationToBuyer } from "@/lib/email-order";
import { getCouponByCode, redeemCoupon, validateCoupon } from "@/lib/coupons";
import type { OrderCoupon, OrderItem } from "@/lib/order-types";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas pembuatan order per user dalam satu jendela waktu. */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 menit

/**
 * POST /api/orders — membuat pesanan (checkout).
 *
 * Keamanan & kebenaran data:
 * - Wajib login (token diverifikasi; uid/email dari token, bukan body).
 * - Harga, nama produk, dan total DIHITUNG ULANG server dari Firestore
 *   (klien hanya mengirim slug + qty, sehingga harga tidak bisa dimanipulasi).
 * - Produk yang tidak ada / nonaktif / stok habis ditolak dengan pesan jelas.
 * - Pesan WhatsApp kanonik disusun server & disimpan bersama order.
 */
export async function POST(req: Request) {
  const check = await requireActiveUser(req);
  if (!check.ok) return check.response;

  const rl = rateLimit(`order:${check.uid}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan checkout. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Layanan pesanan belum dikonfigurasi." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data keranjang tidak valid." },
      { status: 400 },
    );
  }

  const requested = parsed.data.items;
  const slugs = requested.map((it) => it.slug);

  try {
    const products = await getProductsBySlugs(slugs);

    // Susun item dengan harga terverifikasi server.
    const items: OrderItem[] = [];
    for (const reqItem of requested) {
      const product = products.get(reqItem.slug);
      if (!product) {
        return NextResponse.json(
          {
            error: `Produk "${reqItem.slug}" tidak ditemukan. Muat ulang halaman keranjang.`,
            code: "product_not_found",
            slug: reqItem.slug,
          },
          { status: 409 },
        );
      }
      if (!product.active) {
        return NextResponse.json(
          {
            error: `Produk "${product.name}" sudah tidak dijual.`,
            code: "product_inactive",
            slug: product.slug,
          },
          { status: 409 },
        );
      }

      // ===== Produk MULTI-VARIAN =====
      if (product.variants.length > 0) {
        const variantSlug = reqItem.variantSlug?.trim();
        if (!variantSlug) {
          return NextResponse.json(
            {
              error: `Pilih paket untuk "${product.name}" sebelum checkout.`,
              code: "variant_required",
              slug: product.slug,
            },
            { status: 409 },
          );
        }
        const variant = product.variants.find((v) => v.slug === variantSlug);
        if (!variant) {
          return NextResponse.json(
            {
              error: `Paket yang dipilih tidak ditemukan. Muat ulang halaman.`,
              code: "variant_not_found",
              slug: product.slug,
              variantSlug,
            },
            { status: 409 },
          );
        }
        if (variant.soldOut || product.soldOut) {
          return NextResponse.json(
            {
              error: `Paket "${variant.name}" sedang tidak tersedia.`,
              code: "variant_soldout",
              slug: product.slug,
              variantSlug,
            },
            { status: 409 },
          );
        }
        if (variant.price <= 0) {
          return NextResponse.json(
            {
              error: `Paket "${variant.name}" belum bisa dipesan online.`,
              code: "variant_no_price",
              slug: product.slug,
              variantSlug,
            },
            { status: 409 },
          );
        }

        const qty = reqItem.qty;
        items.push({
          slug: product.slug,
          name: `${product.name} — ${variant.name}`,
          price: variant.price,
          qty,
          subtotal: variant.price * qty,
          variantSlug: variant.slug,
          variantName: variant.name,
        });
        continue;
      }

      // ===== Produk TUNGGAL (tanpa varian) =====
      if (product.soldOut) {
        return NextResponse.json(
          {
            error: `Produk "${product.name}" sedang stok habis.`,
            code: "product_soldout",
            slug: product.slug,
          },
          { status: 409 },
        );
      }
      if (product.price <= 0) {
        return NextResponse.json(
          {
            error: `Produk "${product.name}" belum bisa dipesan online (harga belum tersedia).`,
            code: "product_no_price",
            slug: product.slug,
          },
          { status: 409 },
        );
      }

      const qty = reqItem.qty;
      items.push({
        slug: product.slug,
        name: product.name,
        price: product.price,
        qty,
        subtotal: product.price * qty,
      });
    }

    const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
    const settings = await getSiteSettings();

    // ===== Kupon (opsional) — divalidasi & dihitung SERVER =====
    let discount = 0;
    let orderCoupon: OrderCoupon | undefined;
    let couponId: string | null = null;
    const couponCode = parsed.data.couponCode?.trim();
    if (couponCode) {
      const coupon = await getCouponByCode(couponCode);
      const result = validateCoupon(coupon, { subtotal, uid: check.uid });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.reason, code: "coupon_invalid" },
          { status: 409 },
        );
      }
      discount = result.discount;
      couponId = result.coupon.id;
      orderCoupon = {
        code: result.coupon.code,
        type: result.coupon.type,
        discount: result.discount,
      };
    }

    const total = Math.max(0, subtotal - discount);

    // Nama pembeli: dari klien (untuk tampilan), dibersihkan & dibatasi panjang.
    // Email pembeli: dari token terverifikasi (tidak bisa dipalsukan).
    const buyerName = (parsed.data.buyerName ?? "").slice(0, 80).trim();
    const message = buildOrderMessage(
      items,
      { name: buyerName, email: check.email },
      { subtotal, discount, couponCode: orderCoupon?.code },
    );

    const order = await createOrder({
      uid: check.uid,
      buyerName,
      buyerEmail: check.email,
      items,
      subtotal,
      coupon: orderCoupon,
      total,
      whatsapp: settings.whatsapp,
      message,
    });

    // Catat pemakaian kupon (best-effort — tidak menggagalkan order).
    if (couponId) {
      redeemCoupon(couponId, check.uid).catch((err) =>
        console.error("[api/orders] gagal mencatat pemakaian kupon:", err),
      );
    }

    // Naikkan penghitung pesanan user (best-effort, tidak menggagalkan order).
    incrementUserOrderCount(check.uid).catch((err) =>
      console.error("[api/orders] gagal menaikkan orderCount:", err),
    );

    // Notifikasi email ke admin (best-effort — tidak menggagalkan order).
    sendOrderNotification(order).catch((err) =>
      console.error("[api/orders] gagal kirim notifikasi pesanan:", err),
    );

    // Email konfirmasi ke PEMBELI (best-effort — tidak menggagalkan order).
    if (settings.notifyBuyerOnOrder) {
      sendOrderConfirmationToBuyer(order).catch((err) =>
        console.error("[api/orders] gagal kirim konfirmasi ke pembeli:", err),
      );
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        items: order.items,
        subtotal: order.subtotal,
        coupon: order.coupon,
        total: order.total,
        message: order.message,
        whatsapp: order.whatsapp,
        createdAt: order.createdAt,
      },
    });
  } catch (err) {
    console.error("[api/orders] gagal membuat order:", err);
    return NextResponse.json(
      { error: "Gagal membuat pesanan. Silakan coba lagi." },
      { status: 500 },
    );
  }
}

/** GET /api/orders — daftar pesanan milik user yang sedang login. */
export async function GET(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  try {
    const orders = await getOrdersByUser(check.uid);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[api/orders] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat pesanan." },
      { status: 500 },
    );
  }
}
