import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getOrderById, markOrderPaid } from "@/lib/orders";
import { fulfillOrder } from "@/lib/order-payment";
import { obs } from "@/lib/observability";
import { rateLimit } from "@/lib/rate-limit";
import type { OrderStatus } from "@/lib/order-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/mayar — menerima notifikasi `payment.received` dari Mayar.
 *
 * Keamanan & keandalan:
 * 1. **Verifikasi shared-secret (KUAT, OR-A4)**: bila `MAYAR_WEBHOOK_TOKEN`
 *    diisi, token WAJIB cocok (query `?token=` ATAU header `x-webhook-token`,
 *    toleran URL-encoding) — bila TIDAK cocok → **401, tidak diproses**. Bila env
 *    KOSONG, verifikasi dinonaktifkan tapi dicatat peringatan (keamanan fallback:
 *    korelasi order + nominal). Disarankan mengisi token di produksi.
 *    (Event uji "Test URL" Mayar dikecualikan — lihat `isTestingEvent`.)
 * 2. **Korelasi order**: dari `data.extraData.orderId` (di-echo Mayar). Bila
 *    tidak ada, coba `data.productId` sebagai fallback (order id kita).
 * 3. **Idempoten & atomik**: `markOrderPaid` transaksional — tidak menerapkan
 *    perubahan bila order sudah lunas; webhook ganda aman.
 * 4. **Cocokkan nominal**: bila `amount` yang diterima KURANG dari `order.total`,
 *    JANGAN tandai lunas — catat mismatch & beri 200 agar Mayar tak retry.
 * 5. **Guard status terminal (OR-A2)**: pembayaran untuk order `dibatalkan`/
 *    `kedaluwarsa`/`selesai` TIDAK menimpa status — dicatat sebagai `payment_late`.
 * 6. Selalu balas **200 cepat** (kecuali 401 token salah / 503 DB); fulfillment
 *    best-effort.
 */
export async function POST(req: Request) {
  const rl = rateLimit("webhook:mayar", 60, 60_000);
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
  if (!verifyToken(req)) {
    console.warn("[webhook/mayar] token webhook tidak cocok — request ditolak.");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const payload = extractPaymentEvent(body);
  if (!payload) {
    // Event yang tidak kita tangani — balas 200 agar tidak di-retry.
    return NextResponse.json({ ok: true, ignored: "unhandled_event" });
  }

  const { orderId, amount, method, transactionId } = payload;

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      console.warn("[webhook/mayar] order tidak ditemukan:", orderId);
      return NextResponse.json({ ok: true, ignored: "order_not_found" });
    }

    // ===== 4. Cocokkan nominal (toleransi 0; fee ditanggung terpisah) =====
    if (typeof amount === "number" && amount + 1 < order.total) {
      console.error(
        `[webhook/mayar] payment_mismatch order=${orderId} received=${amount} expected=${order.total}`,
      );
      obs.paymentMismatch({ orderId, received: amount, expected: order.total });
      // OR-A6: ini KURANG BAYAR (bukan "gagal") — status order dibiarkan
      // `menunggu_bayar` agar pembeli bisa melunasi; cacat nominal dicatat.
      await db
        .collection("orders")
        .doc(orderId)
        .set(
          {
            paymentMismatch: {
              received: amount,
              expected: order.total,
              atISO: new Date().toISOString(),
            },
          },
          { merge: true },
        );
      return NextResponse.json({ ok: true, mismatch: true });
    }

    // ===== 3. Tandai lunas (idempoten, ATOMIK) → status `dibayar` =====
    const targetStatus: OrderStatus = "dibayar";
    const { applied, reason } = await markOrderPaid(
      orderId,
      { amount: typeof amount === "number" ? amount : order.total, method, transactionId },
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
          amount: typeof amount === "number" ? amount : order.total,
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
      amount: typeof amount === "number" ? amount : order.total,
      method,
    });
    try {
      await fulfillOrder(orderId);
    } catch (err) {
      console.error("[webhook/mayar] fulfillment gagal:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/mayar] gagal memproses:", err);
    // 200 agar Mayar tidak menumpuk retry pada error tak terduga.
    return NextResponse.json({ ok: true, error: "processing_failed" });
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
 * - Bila token DIISI → WAJIB cocok (toleran URL-encoding, dari query `?token=`
 *   ATAU header `x-webhook-token`). Tidak cocok → `false` (pemanggil balas 401).
 *
 * Keamanan berlapis tetap ada (korelasi order + nominal + guard status), tetapi
 * token kini benar-benar mengikat saat dikonfigurasi.
 */
function verifyToken(req: Request): boolean {
  const secret = process.env.MAYAR_WEBHOOK_TOKEN?.trim();
  if (!secret) {
    console.warn(
      "[webhook/mayar] MAYAR_WEBHOOK_TOKEN kosong — verifikasi token dinonaktifkan (disarankan diisi di produksi).",
    );
    return true;
  }

  const url = new URL(req.url);
  const candidates = [
    url.searchParams.get("token") ?? "",
    req.headers.get("x-webhook-token") ?? "",
  ].filter(Boolean);

  // Toleran terhadap perbedaan URL-encoding (mis. token di-decode gateway).
  const normalize = (s: string) => {
    try {
      return decodeURIComponent(s).trim();
    } catch {
      return s.trim();
    }
  };
  const expected = normalize(secret);
  return candidates.some((c) => normalize(c) === expected);
}

/** Hasil ekstraksi event pembayaran dari payload Mentah. */
function extractPaymentEvent(
  body: unknown,
): { orderId: string; amount?: number; method?: string; transactionId?: string } | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;

  const event = typeof root.event === "string" ? root.event : "";
  // Hanya tangani event pembayaran diterima.
  if (event && event !== "payment.received") return null;

  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  // Korelasi order: extraData.orderId (di-echo) atau productId (fallback).
  const extra =
    data.extraData && typeof data.extraData === "object"
      ? (data.extraData as Record<string, unknown>)
      : undefined;
  const orderId = firstString(
    extra?.orderId,
    data.orderId,
    data.productId,
  );
  if (!orderId) return null;

  const amount =
    typeof data.amount === "number"
      ? data.amount
      : typeof data.amount === "string"
        ? Number(data.amount)
        : undefined;

  return {
    orderId,
    amount: Number.isFinite(amount) ? amount : undefined,
    method: firstString(data.paymentMethod, data.channel, data.method) || undefined,
    transactionId: firstString(data.id, data.transactionId) || undefined,
  };
}

function firstString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** GET untuk cek ketersihan endpoint (tidak membocorkan apa pun). */
export function GET() {
  return NextResponse.json({ ok: true, endpoint: "mayar-webhook" });
}
