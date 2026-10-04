import { NextResponse } from "next/server";
import { requireActiveUser, requireUser } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkoutSchema } from "@/lib/order-schema";
import { createOrder, getOrdersByUser, updateOrderPayment } from "@/lib/orders";
import { getProductsBySlugs } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";
import { incrementUserOrderCount } from "@/lib/user-profile";
import { buildOrderMessage } from "@/lib/cart";
import { sendOrderNotification } from "@/lib/email";
import { sendOrderConfirmationToBuyer } from "@/lib/email-order";
import {
  getCouponByCode,
  getUserCouponUsage,
  redeemCoupon,
  restoreCouponUsage,
  validateCoupon,
} from "@/lib/coupons";
import { recordOrderEmailStatus, logOrderEmail } from "@/lib/email-status";
import { fulfillmentTypeForCategories } from "@/lib/order-fulfillment";
import { notifyOrderAwaitingConfirmation } from "@/lib/order-payment";
import { createInvoice, isMayarConfigured, getMayarMode } from "@/lib/mayar";
import { makeToken, downloadUrl } from "@/lib/downloads";
import { SITE_URL } from "@/lib/site";
import type { OrderCoupon, OrderItem, OrderPayment } from "@/lib/order-types";
import type { FulfillmentType } from "@/lib/payment-types";
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
    /** Kategori produk per item — untuk memutuskan jalur fulfillment. */
    const categories: string[] = [];
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
      categories.push(product.category);
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
      // Jumlah pemakaian user ini dari subkoleksi (akurat > usedBy).
      const userUsageCount = coupon
        ? await getUserCouponUsage(coupon.id, check.uid)
        : 0;
      const result = validateCoupon(coupon, {
        subtotal,
        uid: check.uid,
        userUsageCount,
      });
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
        couponId: result.coupon.id,
      };
    }

    const total = Math.max(0, subtotal - discount);

    // `KP-C1`: RESERVASI kuota kupon secara ATOMIK SEBELUM membuat order.
    // Bila kuota/batas per-user terlampaui oleh checkout bersamaan, tolak di
    // sini (bukan setelah order terbuat). Di-rollback bila createOrder gagal.
    if (couponId) {
      const reserved = await redeemCoupon(couponId, check.uid);
      if (!reserved.ok) {
        return NextResponse.json(
          {
            error:
              reserved.reason === "usage_limit_reached"
                ? "Kuota kode promo sudah habis."
                : reserved.reason === "per_user_limit_reached"
                  ? "Anda sudah pernah memakai kode promo ini."
                  : "Kode promo tidak lagi tersedia.",
            code: "coupon_unavailable",
          },
          { status: 409 },
        );
      }
    }

    // Nama pembeli: dari klien (untuk tampilan), dibersihkan & dibatasi panjang.
    // Email pembeli: dari token terverifikasi (tidak bisa dipalsukan).
    const buyerName = (parsed.data.buyerName ?? "").slice(0, 80).trim();
    const message = buildOrderMessage(
      items,
      { name: buyerName, email: check.email },
      { subtotal, discount, couponCode: orderCoupon?.code },
    );

    // ===== Jalur fulfillment (INSTAN vs JASA) =====
    const fulfillment: FulfillmentType = fulfillmentTypeForCategories(categories);

    // JASA → menunggu konfirmasi (tanpa invoice otomatis).
    // INSTAN → menunggu bayar (invoice online bila gateway aktif).
    const initialStatus =
      fulfillment === "jasa" ? "menunggu_konfirmasi" : "menunggu_bayar";

    let order;
    try {
      order = await createOrder({
        uid: check.uid,
        buyerName,
        buyerEmail: check.email,
        items,
        subtotal,
        coupon: orderCoupon,
        total,
        status: initialStatus,
        fulfillment,
        whatsapp: settings.whatsapp,
        message,
      });
    } catch (orderErr) {
      // Order gagal → kembalikan kuota kupon yang sudah direservasi.
      if (couponId) await restoreCouponUsage(couponId, check.uid);
      throw orderErr;
    }

    // ===== INSTAN: buat invoice Mayar (bila gateway dikonfigurasi) =====
    // Best-effort: bila gagal, order tetap ada (menunggu_bayar) & pembeli
    // diarahkan ke alur WhatsApp sebagai fallback.
    let payUrl: string | null = null;
    let paymentWarning: string | null = null;
    if (fulfillment === "instan") {
      const payment: OrderPayment = {
        provider: "mayar",
        status: "belum_bayar",
      };
      if (isMayarConfigured() && total > 0) {
        try {
          const invoice = await createInvoice({
            name: buyerName || "Pembeli LKTech",
            email: check.email,
            description: `Pesanan LKTech ${order.id}`,
            // Satu baris ringkas (total sudah termasuk diskon). Bila ada diskon,
            // kirim subtotal + baris diskon negatif agar total = `total`.
            items:
              discount > 0 && orderCoupon
                ? [
                    { quantity: 1, rate: subtotal, description: "Subtotal pesanan" },
                    {
                      quantity: 1,
                      rate: -discount,
                      description: `Diskon ${orderCoupon.code}`,
                    },
                  ]
                : [{ quantity: 1, rate: total, description: "Total pesanan" }],
            extraData: { orderId: order.id },
          });

          payment.status = "menunggu";
          payment.invoiceId = invoice.invoiceId;
          payment.transactionId = invoice.transactionId;
          payment.payUrl = invoice.payUrl;
          payment.expiresAt = new Date(invoice.expiredAt).toISOString();
          payUrl = invoice.payUrl;

          await updateOrderPayment(order.id, payment);
          order = { ...order, payment };
        } catch (payErr) {
          console.error("[api/orders] gagal membuat invoice Mayar:", payErr);
          paymentWarning =
            "Link pembayaran otomatis sedang tidak tersedia. Kami arahkan ke WhatsApp untuk menyelesaikan pembayaran.";
        }
      } else if (!isMayarConfigured()) {
        paymentWarning =
          "Pembayaran online belum aktif. Kami arahkan ke WhatsApp untuk menyelesaikan pembayaran.";
      }
      if (!order.payment) order = { ...order, payment };
    }

    // Naikkan penghitung pesanan user (best-effort, tidak menggagalkan order).
    incrementUserOrderCount(check.uid).catch((err) =>
      console.error("[api/orders] gagal menaikkan orderCount:", err),
    );

    // Notifikasi email ke admin (best-effort — tidak menggagalkan order).
    sendOrderNotification(order).catch((err) =>
      console.error("[api/orders] gagal kirim notifikasi pesanan:", err),
    );

    // Email konfirmasi ke PEMBELI (`EM-C2`): status email disimpan ke order,
    // dengan retry sederhana. Tunggu (await) agar status tercatat sebelum
    // respons — aman di serverless (tidak bergantung background job).
    if (settings.notifyBuyerOnOrder) {
      const result = await sendOrderConfirmationToBuyer(order);
      await recordOrderEmailStatus(order.id, "confirmation", result);
      await logOrderEmail(order.id, {
        kind: "confirmation",
        to: order.buyerEmail,
        result,
      });
    }

    // JASA (FASE P1): beri tahu pembeli bahwa order menunggu konfirmasi.
    if (fulfillment === "jasa") {
      await notifyOrderAwaitingConfirmation(order);
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        items: order.items,
        subtotal: order.subtotal,
        coupon: order.coupon,
        total: order.total,
        status: order.status,
        fulfillment: order.fulfillment,
        payment: order.payment,
        // URL bayar (bila ada) untuk diarahkan di keranjang.
        payUrl,
        message: order.message,
        whatsapp: order.whatsapp,
        createdAt: order.createdAt,
      },
      // (Opsional) pesan bila invoice otomatis gagal dibuat.
      warning: paymentWarning,
      mayarMode: getMayarMode(),
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
    // Lampirkan link unduhan (bila ada token) — dihitung server, bukan dikirim klien.
    const enriched = orders.map((o) => ({
      ...o,
      downloadUrl: o.downloadTokenId
        ? downloadUrl(SITE_URL, makeToken(o.downloadTokenId))
        : undefined,
    }));
    return NextResponse.json({ orders: enriched });
  } catch (err) {
    console.error("[api/orders] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat pesanan." },
      { status: 500 },
    );
  }
}
