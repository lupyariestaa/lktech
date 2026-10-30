import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getOrderById, markOrderPaid } from "@/lib/orders";
import { fulfillOrder } from "@/lib/order-payment";
import { notifyOrderAwaitingConfirmation } from "@/lib/order-payment";
import { obs } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import type { OrderStatus } from "@/lib/order-types";
import { extractMayarPaymentEvent, validateMayarPayment } from "@/lib/mayar-webhook-pure";
import { FieldValue } from "firebase-admin/firestore";
import { timingSafeEqual } from "node:crypto";
import { webhookTokenConfiguration } from "@/lib/webhook-security-pure";
import { canonicalizeToken } from "@/lib/webhook-url-pure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/mayar — menerima notifikasi `payment.received` dari Mayar.
 *
 * Keamanan & keandalan:
 * 1. **Verifikasi shared-secret (fail-closed di production)**: token wajib cocok
 *    (query `?token=` ATAU header `x-webhook-token`); tanpa konfigurasi production
 *    endpoint menolak event pembayaran dengan 503.
 *    (Event uji "Test URL" Mayar dikecualikan — lihat `isTestingEvent`.)
 * 2. **Korelasi order**: dari `data.extraData.orderId` (di-echo Mayar). Bila
 *    tidak ada, coba `data.productId` sebagai fallback (order id kita).
 * 3. **Idempoten & atomik**: `markOrderPaid` transaksional — tidak menerapkan
 *    perubahan bila order sudah lunas; webhook ganda aman.
 * 4. **Cocokkan nominal**: nominal wajib hadir dan sama persis dengan `order.total`;
 *    nominal hilang/tidak valid/tidak cocok tidak pernah menandai lunas.
 * 5. **Guard status terminal (OR-A2)**: pembayaran untuk order `dibatalkan`/
 *    `kedaluwarsa`/`selesai` TIDAK menimpa status — dicatat sebagai `payment_late`.
 * 6. Balas **200 cepat** untuk event yang tidak relevan/ditolak permanen (agar
 *    tidak di-retry), tetapi **500** untuk kegagalan sementara (Firestore down,
 *    timeout) agar Mayar mengulang event. Penulisan status idempoten → retry aman.
 */
export async function POST(req: Request) {
  const rl = await checkRateLimit("webhook:mayar", 60, 60_000);
  if (!rl.ok) {
    // Tetap 200 agar pengirim tidak menumpuk retry; cukup log.
    console.warn("[webhook/mayar] rate limited", rl.retryAfter);
    return NextResponse.json({ ok: true, throttled: true });
  }

  const db = getAdminDb();
  if (!db) {
    console.error("[webhook/mayar] Admin SDK tidak tersedia.");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  // ===== Parse payload (butuh body untuk mendeteksi event "testing") =====
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: "invalid_json" });
  }

  // ===== Event "testing": tombol "Test URL" di dashboard Mayar =====
  // Mayar menganggap test BERHASIL bila endpoint membalas 200 dengan format
  // respons standar mereka (`{statusCode, messages}`). Kita balas persis itu
  // agar tombol Test URL hijau — TANPA memproses pembayaran apa pun. Event uji
  // dikecualikan dari verifikasi token (Mayar tak menjamin token pada test).
  if (isTestingEvent(body)) {
    return NextResponse.json({ statusCode: 200, messages: "success", ok: true });
  }

  // ===== 1. Verifikasi shared-secret (KUAT — blok bila token diisi & salah) =====
  const webhookConfig = webhookTokenConfiguration(process.env.NODE_ENV, process.env.MAYAR_WEBHOOK_TOKEN);
  if (!webhookConfig.configured && webhookConfig.required) {
    console.error("[webhook/mayar] konfigurasi token wajib di production belum tersedia.");
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
  }
  if (!verifyToken(req)) {
    console.warn("[webhook/mayar] token webhook tidak cocok — request ditolak.");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const payload = extractMayarPaymentEvent(body);
  if (!payload) {
    // Event yang tidak kita tangani — balas 200 agar tidak di-retry.
    return NextResponse.json({ ok: true, ignored: "unhandled_event" });
  }

  const { orderId, amount, method, transactionId, invoiceId } = payload;

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      console.warn("[webhook/mayar] order tidak ditemukan:", orderId);
      return NextResponse.json({ ok: true, ignored: "order_not_found" });
    }

    // ===== 4. Validasi bukti pembayaran; jangan pernah menebak nominal =====
    const matchedPayment = invoiceId && order.servicePayment?.invoiceId === invoiceId
      ? order.servicePayment
      : order.payment;
    const validation = validateMayarPayment(
      { amount, invoiceId, transactionId },
      {
        total: matchedPayment?.amountExpected ?? order.total,
        invoiceId: matchedPayment?.invoiceId,
        transactionId: matchedPayment?.transactionId,
      },
    );
    if (!validation.ok) {
      console.error(
        `[webhook/mayar] payment_rejected order=${orderId} reason=${validation.reason} received=${amount ?? "?"} expected=${order.total}`,
      );
      const rejectedAt = new Date().toISOString();
      const mismatchExpected = matchedPayment?.amountExpected ?? order.total;
      const isUnderpayment = validation.reason === "amount_mismatch" &&
        typeof amount === "number" && amount < mismatchExpected;
      if (isUnderpayment) {
        obs.paymentMismatch({ orderId, received: amount!, expected: mismatchExpected });
        await db.collection("orders").doc(orderId).set({
          paymentMismatch: {
            received: amount,
            expected: mismatchExpected,
            reason: validation.reason,
            atISO: rejectedAt,
          },
          paymentIssue: FieldValue.delete(),
        }, { merge: true });
      } else {
        // Preserve the distinction: invoice/transaction evidence failures are
        // not underpayments and must not show the "Nominal kurang bayar" UI.
        await db.collection("orders").doc(orderId).set({
          paymentMismatch: FieldValue.delete(),
          paymentIssue: { reason: validation.reason, atISO: rejectedAt },
        }, { merge: true });
      }
      return NextResponse.json({ ok: true, rejected: validation.reason });
    }

    // ===== 3. Tandai lunas (idempoten, ATOMIK) → status `dibayar` =====
    const targetStatus: OrderStatus = "dibayar";
    const { applied, reason } = await markOrderPaid(
      orderId,
      { amount: validation.amount, method, transactionId, invoiceId },
      targetStatus,
    );

    if (!applied) {
      if (reason === "not_payable") {
        // OR-A2: pembayaran datang untuk order yang sudah terminal
        // (dibatalkan/kedaluwarsa/selesai). JANGAN timpa status/kuota — catat
        // sebagai anomali agar admin bisa menindak (mis. refund manual).
        console.error(
          `[webhook/mayar] late_payment order=${orderId} status=${order.status} received=${amount ?? "?"}`,
        );
        obs.paymentLate({
          orderId,
          amount: validation.amount,
          orderStatus: order.status,
        });
        return NextResponse.json({ ok: true, not_payable: true });
      }
      // Sudah dibayar sebelumnya (atau tidak ditemukan) — idempoten, tak ada aksi.
      return NextResponse.json({ ok: true, already_paid: true });
    }

    // ===== 5. Fulfillment best-effort (unduhan + email) =====
    obs.paymentReceived({
      orderId,
      amount: validation.amount,
      method,
    });
    try {
      if (matchedPayment?.component === "goods") {
        await fulfillOrder(orderId);
      } else if (matchedPayment?.component === "service") {
        await notifyOrderAwaitingConfirmation(order);
      } else {
        await fulfillOrder(orderId);
      }
    } catch (err) {
      console.error("[webhook/mayar] fulfillment gagal:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/mayar] gagal memproses:", err);
    // 500 (bukan 200) agar Mayar MENGULANG event saat kegagalan sementara
    // (Firestore error/timeout). Sebelumnya 200 membuat kegagalan persisten
    // tidak pernah dicoba ulang dan tampak "SUCCESS" di riwayat webhook.
    // `markOrderPaid` idempoten, jadi retry tidak menggandakan efek.
    return NextResponse.json(
      { ok: false, error: "processing_failed" },
      { status: 500 },
    );
  }
}

/** Apakah payload adalah event uji coba dari tombol "Test URL" Mayar. */
function isTestingEvent(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const event = (body as Record<string, unknown>).event;
  return typeof event === "string" && (event === "testing" || event === "test");
}

/**
 * Verifikasi token webhook (KUAT, OR-A4).
 * - Bila `MAYAR_WEBHOOK_TOKEN` KOSONG → verifikasi dinonaktifkan tetapi dicatat
 *   peringatan (mode fallback; disarankan mengisi token di produksi). → `true`.
 * - Bila token DIISI → WAJIB cocok (toleran URL-encoding & `+`/spasi, dari query
 *   `?token=` ATAU header `x-webhook-token`). Tidak cocok → `false` (pemanggil balas
 *   401).
 *
 * Keamanan berlapis tetap ada (korelasi order + nominal + guard status), tetapi
 * token kini benar-benar mengikat saat dikonfigurasi.
 */
function verifyToken(req: Request): boolean {
  const secret = process.env.MAYAR_WEBHOOK_TOKEN?.trim();
  if (!secret) {
    return true;
  }

  const url = new URL(req.url);
  const candidates = [
    url.searchParams.get("token") ?? "",
    req.headers.get("x-webhook-token") ?? "",
  ].filter(Boolean);

  // Toleran terhadap perbedaan URL-encoding, tanda kutip, dan `+`/spasi
  // (query encoding mengubah `+` menjadi spasi, sedangkan token base64 dapat
  // berisi `+` literal).
  const normalize = canonicalizeToken;
  const expected = Buffer.from(normalize(secret));
  return candidates.some((candidate) => {
    const received = Buffer.from(normalize(candidate));
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}


/** GET untuk cek ketersihan endpoint (tidak membocorkan apa pun). */
export function GET() {
  return NextResponse.json({ ok: true, endpoint: "mayar-webhook" });
}
