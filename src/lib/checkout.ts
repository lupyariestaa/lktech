import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { createOrder, deleteOrder, updateOrderPayment } from "@/lib/orders";
import { getProductsBySlugs } from "@/lib/products";
import { evaluatePurchase } from "@/lib/product-format";
import { getSiteSettings } from "@/lib/settings";
import { incrementUserOrderCount, getUserProfile } from "@/lib/user-profile";
import { buildOrderMessage } from "@/lib/cart";
import { sendOrderNotification } from "@/lib/email";
import { sendOrderConfirmationToBuyer } from "@/lib/email-order";
import {
  getCouponByCode,
  getUserCouponUsage,
  getCouponUsageSnapshot,
  redeemCoupon,
  restoreCouponUsage,
  validateCoupon,
} from "@/lib/coupons";
import { recordOrderEmailStatus, logOrderEmail } from "@/lib/email-status";
import { fulfillmentTypeForCategories } from "@/lib/order-fulfillment";
import { notifyOrderAwaitingConfirmation } from "@/lib/order-payment";
import { createInvoice, isMayarConfigured, getMayarMode } from "@/lib/mayar";
import { obs } from "@/lib/observability";
import type { CheckoutInput } from "@/lib/order-schema";
import type { OrderCoupon, OrderItem, OrderPayment } from "@/lib/order-types";
import type { FulfillmentType } from "@/lib/payment-types";

/**
 * OR-E1 — Orkestrasi CHECKOUT (diekstrak dari route agar handler tipis & teruji).
 *
 * Prinsip keamanan & kebenaran data (tidak berubah):
 * - Harga/nama/total DIHITUNG ULANG server dari Firestore (klien hanya slug/qty).
 * - Kupon divalidasi & diskon dihitung server; kuota direservasi ATOMIK sebelum
 *   order dibuat (rollback bila createOrder gagal).
 * - INSTAN → invoice Mayar (best-effort); JASA → menunggu konfirmasi.
 * - Semua efek samping email best-effort (tidak menggagalkan order).
 *
 * Fungsi ini TIDAK menangani auth/rate-limit (dilakukan route) — hanya alur
 * bisnis dari input tervalidasi → order.
 */

/** Aktor terverifikasi (dari token). */
export type CheckoutActor = { uid: string; email: string };

/** Hasil sukses checkout (payload siap dikirim ke klien). */
export type CheckoutSuccess = {
  order: {
    id: string;
    items: OrderItem[];
    subtotal: number;
    coupon?: OrderCoupon;
    total: number;
    status: string;
    fulfillment?: string;
    payment?: OrderPayment;
    message: string;
    whatsapp: string;
    createdAt: string;
  };
  payUrl: string | null;
  warning: string | null;
  mayarMode: string;
};

/** Hasil gagal checkout (sudah lengkap untuk respons HTTP). */
export type CheckoutFailure = {
  ok: false;
  status: number;
  body: Record<string, unknown>;
};

export type CheckoutOutcome =
  | ({ ok: true } & CheckoutSuccess)
  | CheckoutFailure;

function fail(
  status: number,
  body: Record<string, unknown>,
): CheckoutFailure {
  return { ok: false, status, body };
}

/** Pesan ramah untuk kegagalan reservasi kupon (C2). */
function couponRedeemMessage(reason: string): string {
  switch (reason) {
    case "usage_limit_reached":
      return "Kuota kode promo sudah habis.";
    case "per_user_limit_reached":
      return "Anda sudah pernah memakai kode promo ini.";
    case "single_use_reached":
      return "Kode ini hanya dapat dipakai satu kali.";
    case "daily_limit_reached":
      return "Kuota harian kode promo ini sudah habis. Coba lagi besok.";
    default:
      return "Kode promo tidak lagi tersedia.";
  }
}

/** Jalankan alur checkout lengkap dari input yang SUDAH divalidasi skema. */
export async function performCheckout(
  input: CheckoutInput,
  actor: CheckoutActor,
): Promise<CheckoutOutcome> {
  const db = getAdminDb();
  if (!db) {
    return fail(503, { error: "Layanan pesanan belum dikonfigurasi." });
  }

  const requested = input.items;
  const slugs = requested.map((it) => it.slug);
  const products = await getProductsBySlugs(slugs);

  // ===== Susun item dengan harga terverifikasi server =====
  const items: OrderItem[] = [];
  const categories: string[] = [];
  for (const reqItem of requested) {
    const product = products.get(reqItem.slug);
    if (!product) {
      return fail(409, {
        error: `Produk "${reqItem.slug}" tidak ditemukan. Muat ulang halaman keranjang.`,
        code: "product_not_found",
        slug: reqItem.slug,
      });
    }
    categories.push(product.category);

    const evaluation = evaluatePurchase(product, {
      variantSlug: reqItem.variantSlug,
      qty: reqItem.qty,
      printOptions: reqItem.printOptions,
    });
    if (!evaluation.ok) {
      return fail(409, {
        error: evaluation.message,
        code: evaluation.code,
        slug: product.slug,
        ...(reqItem.variantSlug ? { variantSlug: reqItem.variantSlug } : {}),
      });
    }

    const qty = reqItem.qty;
    if (evaluation.variantSlug) {
      items.push({
        slug: product.slug,
        name: `${product.name} — ${evaluation.variantName}`,
        price: evaluation.price,
        qty,
        subtotal: evaluation.price * qty,
        variantSlug: evaluation.variantSlug,
        variantName: evaluation.variantName,
        ...(evaluation.printOptions ? { printOptions: evaluation.printOptions } : {}),
        ...(evaluation.printPricing ? { printPricing: evaluation.printPricing } : {}),
      });
    } else {
      items.push({
        slug: product.slug,
        name: product.name,
        price: evaluation.price,
        qty,
        subtotal: evaluation.price * qty,
      });
    }
  }

  const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const settings = await getSiteSettings();

  // Ambil profil SEKALI (foto pembeli, nomor WA, & cek pembeli pertama).
  const buyerProfile = await getUserProfile(actor.uid).catch(() => null);
  const buyerPhotoUrl = (buyerProfile?.photoURL ?? "").trim();
  // `isFirstPurchase` = belum pernah membuat pesanan sukses (orderCount 0).
  const isFirstPurchase = (buyerProfile?.orderCount ?? 0) === 0;

  // ===== Kupon (opsional) — divalidasi & dihitung SERVER =====
  let discount = 0;
  let orderCoupon: OrderCoupon | undefined;
  let couponId: string | null = null;
  const couponCode = input.couponCode?.trim();
  if (couponCode) {
    const coupon = await getCouponByCode(couponCode);
    const userUsageCount = coupon
      ? await getUserCouponUsage(coupon.id, actor.uid)
      : 0;
    // Snapshot kuota harian & single-use (C2) dalam satu panggilan.
    const usageSnapshot = coupon
      ? await getCouponUsageSnapshot(coupon)
      : { dayUsageCount: 0, singleUseConsumed: false };
    const result = validateCoupon(coupon, {
      subtotal,
      uid: actor.uid,
      buyerEmail: actor.email,
      isFirstPurchase,
      userUsageCount,
      dayUsageCount: usageSnapshot.dayUsageCount,
      singleUseConsumed: usageSnapshot.singleUseConsumed,
      slugs: items.map((it) => it.slug),
      itemCount: items.reduce((n, it) => n + it.qty, 0),
    });
    if (!result.ok) {
      return fail(409, { error: result.reason, code: "coupon_invalid" });
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

  // `KP-C1`/C2: reservasi kuota kupon ATOMIK sebelum membuat order
  // (single-use, kuota total, per-user, & kuota harian dicek di dalam transaksi).
  if (couponId) {
    const reserved = await redeemCoupon(couponId, actor.uid, actor.email);
    if (!reserved.ok) {
      return fail(409, {
        error: couponRedeemMessage(reserved.reason),
        code: "coupon_unavailable",
      });
    }
  }

  const buyerName = (input.buyerName ?? "").slice(0, 80).trim();
  const message = buildOrderMessage(
    items,
    { name: buyerName, email: actor.email },
    { subtotal, discount, couponCode: orderCoupon?.code },
  );

  const fulfillment: FulfillmentType = fulfillmentTypeForCategories(categories);
  if (fulfillment === "cetak" && (!isMayarConfigured() || total <= 0)) {
    if (couponId) await restoreCouponUsage(couponId, actor.uid);
    return fail(503, {
      error: total <= 0
        ? "Total pesanan cetak harus lebih dari Rp0 agar bisa dibayar melalui Mayar."
        : "Pembayaran Mayar belum tersedia. Pesanan cetak belum dibuat; coba lagi nanti.",
    });
  }
  const initialStatus = fulfillment === "jasa" ? "menunggu_konfirmasi" : "menunggu_bayar";

  let order;
  try {
    order = await createOrder({
      uid: actor.uid,
      buyerName,
      buyerEmail: actor.email,
      buyerPhotoUrl: buyerPhotoUrl || undefined,
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
    if (couponId) await restoreCouponUsage(couponId, actor.uid);
    throw orderErr;
  }

  // ===== Produk digital/cetak: buat invoice Mayar =====
  let payUrl: string | null = null;
  let paymentWarning: string | null = null;
  if (fulfillment === "instan" || fulfillment === "cetak") {
    const payment: OrderPayment = { provider: "mayar", status: "belum_bayar" };
    if (isMayarConfigured() && total > 0) {
      try {
        const mobile =
          (buyerProfile?.whatsapp ?? "").trim() || settings.whatsapp || "";

        const invoice = await createInvoice({
          name: buyerName || "Pembeli LKTech",
          email: actor.email,
          mobile,
          description: `Pesanan LKTech ${order.id}`,
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
        console.error("[checkout] gagal membuat invoice Mayar:", payErr);
        if (fulfillment === "cetak") {
          const deleted = await deleteOrder(order.id, ["menunggu_bayar"]);
          if (!deleted.ok) {
            console.error("[checkout] gagal membersihkan order cetak tanpa invoice:", order.id, deleted);
            return fail(503, { error: `Invoice Mayar gagal dibuat. Hubungi admin dengan kode pesanan ${order.id} sebelum mencoba lagi.` });
          }
          return fail(503, { error: "Invoice Mayar gagal dibuat. Pesanan belum dilanjutkan; coba lagi nanti." });
        }
        paymentWarning =
          "Link pembayaran otomatis sedang tidak tersedia. Kami arahkan ke WhatsApp untuk menyelesaikan pembayaran.";
      }
    } else if (!isMayarConfigured()) {
      paymentWarning =
        "Pembayaran online belum aktif. Kami arahkan ke WhatsApp untuk menyelesaikan pembayaran.";
    }
    if (!order.payment) order = { ...order, payment };
  }

  // Naikkan penghitung pesanan user (best-effort).
  incrementUserOrderCount(actor.uid).catch((err) =>
    console.error("[checkout] gagal menaikkan orderCount:", err),
  );

  // Observability terstruktur (OR-E5) — jalur uang.
  obs.checkoutCompleted({
    orderId: order.id,
    total: order.total,
    fulfillment,
    items: items.reduce((n, it) => n + it.qty, 0),
  });

  // ===== Email (GAP-2: hindari email ganda untuk JASA) =====
  if (fulfillment === "jasa") {
    await notifyOrderAwaitingConfirmation(order);
  } else {
    sendOrderNotification(order).catch((err) =>
      console.error("[checkout] gagal kirim notifikasi pesanan:", err),
    );
    if (settings.notifyBuyerOnOrder) {
      const result = await sendOrderConfirmationToBuyer(order);
      await recordOrderEmailStatus(order.id, "confirmation", result);
      await logOrderEmail(order.id, {
        kind: "confirmation",
        to: order.buyerEmail,
        result,
      });
    }
  }

  return {
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
      message: order.message,
      whatsapp: order.whatsapp,
      createdAt: order.createdAt,
    },
    payUrl,
    warning: paymentWarning,
    mayarMode: getMayarMode(),
  };
}
