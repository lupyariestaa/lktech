import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { createOrder, recordInvoiceRecovery, updateOrderPayment } from "@/lib/orders";
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
import { allocateDiscountByItem, fulfillmentTypeForCategory, summarizeFulfillment } from "@/lib/order-fulfillment";
import { notifyOrderAwaitingConfirmation } from "@/lib/order-payment";
import { createInvoice, getMayarApiHost, getMayarErrorStatus, getInvoiceTtlMinutes, isMayarConfigured, getMayarMode } from "@/lib/mayar";
import { coerceMayarExpiry } from "@/lib/mayar-webhook-pure";
import { releaseStock, reserveStock } from "@/lib/stock";
import { obs } from "@/lib/observability";
import type { CheckoutInput } from "@/lib/order-schema";
import type { InvoiceRecovery, OrderCoupon, OrderItem, OrderPayment } from "@/lib/order-types";
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
    const itemFulfillment = fulfillmentTypeForCategory(product.category);

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
        fulfillment: itemFulfillment,
        variantSlug: evaluation.variantSlug,
        variantName: evaluation.variantName,
        ...(evaluation.printOptions ? { printOptions: evaluation.printOptions } : {}),
        ...(evaluation.printOptions
          ? {
              printFinishing: evaluation.printOptions.finishingIds.flatMap((id) => {
                const option = product.printConfig?.finishingOptions.find((item) => item.id === id);
                return option ? [{ id: option.id, name: option.name }] : [];
              }),
            }
          : {}),
        ...(evaluation.printPricing ? { printPricing: evaluation.printPricing } : {}),
      });
    } else {
      items.push({
        slug: product.slug,
        name: product.name,
        price: evaluation.price,
        qty,
        subtotal: evaluation.price * qty,
        fulfillment: itemFulfillment,
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
      // `KP-P2`: sertakan subtotal per item agar diskon kupon bundel dihitung
      // atas item yang memenuhi syarat saja (`eligibleSubtotal`).
      items: items.map((it) => ({ slug: it.slug, subtotal: it.subtotal })),
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
  const discountShares = allocateDiscountByItem(items.map((item) => item.subtotal), discount);
  const pricedItems = items.map((item, index) => ({ ...item, discountShare: discountShares[index] }));
  const hasService = pricedItems.some((item) => item.fulfillment === "jasa");
  const hasGoods = pricedItems.some((item) => item.fulfillment !== "jasa");
  const goodsInvoiceAmount = pricedItems.reduce(
    (sum, item) => sum + (item.fulfillment === "jasa" ? 0 : item.subtotal - (item.discountShare ?? 0)),
    0,
  );

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

  const fulfillment: FulfillmentType = summarizeFulfillment(categories);
  if ((fulfillment === "cetak" || (hasGoods && hasService)) && (!isMayarConfigured() || goodsInvoiceAmount <= 0)) {
    if (couponId) await restoreCouponUsage(couponId, actor.uid);
    return fail(503, {
      error: goodsInvoiceAmount <= 0
        ? "Total item barang setelah diskon harus lebih dari Rp0 agar dapat dibayar melalui Mayar."
        : "Pembayaran Mayar belum tersedia. Pesanan cetak belum dibuat; coba lagi nanti.",
    });
  }
  const initialStatus = fulfillment === "jasa" ? "menunggu_konfirmasi" : "menunggu_bayar";

  // O-01: RESERVASI STOK ATOMIK sebelum order dibuat. `evaluatePurchase` hanya
  // memeriksa stok; ini benar-benar MENGURANGINYA agar dua pembeli tidak bisa
  // membeli unit terakhir bersamaan. Bila gagal → kembalikan kuota kupon & tolak.
  const stock = await reserveStock(
    pricedItems.map((item) => ({
      slug: item.slug,
      variantSlug: item.variantSlug,
      qty: item.qty,
    })),
  );
  if (!stock.ok) {
    if (couponId) await restoreCouponUsage(couponId, actor.uid);
    return fail(409, {
      error: stock.message,
      code: stock.code,
      slug: stock.slug,
    });
  }

  let order;
  try {
    order = await createOrder({
      uid: actor.uid,
      buyerName,
      buyerEmail: actor.email,
      buyerPhotoUrl: buyerPhotoUrl || undefined,
      items: pricedItems,
      subtotal,
      coupon: orderCoupon,
      total,
      status: initialStatus,
      fulfillment,
      whatsapp: settings.whatsapp,
      message,
      stockReservation: stock.reservation.length > 0 ? stock.reservation : undefined,
    });
  } catch (orderErr) {
    if (couponId) await restoreCouponUsage(couponId, actor.uid);
    // Order gagal dibuat → lepas kembali stok yang sudah direservasi.
    await releaseStock(stock.reservation);
    throw orderErr;
  }

  // ===== Produk digital/cetak: buat invoice Mayar =====
  let payUrl: string | null = null;
  let paymentWarning: string | null = null;
  if (fulfillment === "instan" || fulfillment === "cetak" || (hasGoods && hasService)) {
    const payment: OrderPayment = { provider: "mayar", status: "belum_bayar" };
    const invoiceAmount = hasGoods && hasService ? goodsInvoiceAmount : total;
    if (isMayarConfigured() && invoiceAmount > 0) {
      const recovery: InvoiceRecovery = {
        state: "creating",
        component: hasGoods && hasService ? "goods" : "order",
        amountExpected: invoiceAmount,
        correlationId: order.id,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      try {
        await recordInvoiceRecovery(order.id, recovery);
      } catch (markerError) {
        console.error("[checkout] tidak dapat menandai pembuatan invoice:", order.id, markerError);
        return fail(503, { error: `Status invoice pesanan belum aman. Hubungi admin dengan kode pesanan ${order.id} sebelum mencoba lagi.` });
      }
      try {
        const mobile =
          (buyerProfile?.whatsapp ?? "").trim() || settings.whatsapp || "";

        const invoice = await createInvoice({
          name: buyerName || "Pembeli LKTech",
          email: actor.email,
          mobile,
          description: `Pesanan LKTech ${order.id}`,
          items:
            hasGoods && hasService
              ? [{ quantity: 1, rate: invoiceAmount, description: "Item non-jasa setelah alokasi diskon" }]
              : discount > 0 && orderCoupon
                ? [
                    { quantity: 1, rate: subtotal, description: "Subtotal pesanan" },
                    { quantity: 1, rate: -discount, description: `Diskon ${orderCoupon.code}` },
                  ]
                : [{ quantity: 1, rate: total, description: "Total pesanan" }],
          extraData: { orderId: order.id },
        });

        payment.status = "menunggu";
        payment.component = hasGoods && hasService ? "goods" : "order";
        payment.baseAmount = hasGoods && hasService ? pricedItems.reduce((s, i) => s + (i.fulfillment === "jasa" ? 0 : i.subtotal), 0) : subtotal;
        payment.discountAmount = hasGoods && hasService ? pricedItems.reduce((s, i) => s + (i.fulfillment === "jasa" ? 0 : (i.discountShare ?? 0)), 0) : discount;
        payment.amountExpected = invoiceAmount;
        payment.invoiceId = invoice.invoiceId;
        payment.transactionId = invoice.transactionId;
        payment.payUrl = invoice.payUrl;
        // F-11: validasi satuan/format `expiredAt` (detik vs milidetik vs ISO).
        // Nilai tak valid → fallback TTL agar order tidak "kedaluwarsa 1970".
        const expiresAtISO = coerceMayarExpiry(invoice.expiredAt);
        if (!expiresAtISO) {
          console.warn(
            "[checkout] expiredAt Mayar tidak valid — memakai TTL fallback:",
            order.id,
            invoice.expiredAt,
          );
        }
        payment.expiresAt =
          expiresAtISO ??
          new Date(Date.now() + getInvoiceTtlMinutes() * 60_000).toISOString();
        payUrl = invoice.payUrl;

        await recordInvoiceRecovery(order.id, {
          ...recovery,
          invoiceId: invoice.invoiceId,
          transactionId: invoice.transactionId,
          payUrl: invoice.payUrl,
          expiresAt: payment.expiresAt,
          updatedAt: new Date().toISOString(),
        });

        await updateOrderPayment(order.id, payment);
        await recordInvoiceRecovery(order.id, { ...recovery, state: "linked", invoiceId: invoice.invoiceId, transactionId: invoice.transactionId, payUrl: invoice.payUrl, expiresAt: payment.expiresAt, updatedAt: new Date().toISOString() });
        order = { ...order, payment };
      } catch (payErr) {
        const mayarStatus = getMayarErrorStatus(payErr);
        console.error("[checkout] gagal membuat invoice Mayar:", {
          orderId: order.id,
          mode: getMayarMode(),
          apiHost: getMayarApiHost(),
          status: mayarStatus ?? null,
          error: payErr instanceof Error ? payErr.message : "unknown_error",
        });
        const partialInvoice = payment.invoiceId
          ? {
              invoiceId: payment.invoiceId,
              transactionId: payment.transactionId,
              payUrl: payment.payUrl,
              expiresAt: payment.expiresAt,
            }
          : {};
        try {
          await recordInvoiceRecovery(order.id, {
            ...recovery,
            state: "orphaned",
            updatedAt: new Date().toISOString(),
            error: payErr instanceof Error ? payErr.message.slice(0, 300) : "unknown_error",
            ...partialInvoice,
          });
        } catch (recoveryErr) {
          console.error("[checkout] gagal mencatat invoice orphan:", order.id, recoveryErr);
        }
        paymentWarning = mayarStatus === 401 || mayarStatus === 403
          ? `Invoice Mayar belum berhasil dibuat (HTTP ${mayarStatus}, mode ${getMayarMode()}). Jangan membayar atau membuat invoice ulang dulu; hubungi admin dengan kode pesanan ${order.id}.`
          : `Invoice Mayar belum berhasil dibuat. Jangan membayar atau membuat invoice ulang dulu; hubungi admin dengan kode pesanan ${order.id}.`;
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
