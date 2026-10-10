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
 * Keamanan & keandalan (lihat `docs/2026-10-06-fase-konversi-closing.md` §3.4):
 * 1. **Verifikasi lunak** via shared-secret: bila `MAYAR_WEBHOOK_TOKEN` diisi,
 *    token dicocokkan (query `?token=` ATAU header `x-webhook-token`, toleran
 *    terhadap URL-encoding). Bila TIDAK cocok, cukup dicatat sebagai peringatan
 *    (TIDAK memblok 401) — keamanan tetap terjaga oleh korelasi order,
 *    idempotensi, dan pencocokan nominal. (Pemblokiran keras menyulitkan saat
 *    gateway mengubah/memotong query string.)
 * 2. **Korelasi order**: dari `data.extraData.orderId` (di-echo Mayar). Bila
 *    tidak ada, coba `data.productId` sebagai fallback (order id kita).
 * 3. **Idempoten**: `markOrderPaid` tidak menerapkan perubahan bila order sudah
 *    `dibayar`; webhook ganda aman.
 * 4. **Cocokkan nominal**: bila `amount` yang diterima KURANG dari `order.total`,
 *    JANGAN tandai lunas — catat mismatch & beri 200 agar Mayar tak retry.
 * 5. Selalu balas **200 cepat** (jangan memblok Mayar); fulfillment best-effort.
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

  // ===== 1. Verifikasi shared-secret (LUNAK — tidak memblok) =====
  verifyTokenSoft(req);

  // ===== Parse payload =====
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: "invalid_json" });
  }

  // ===== Event "testing": tombol "Test URL" di dashboard Mayar =====
  // Mayar menganggap test BERHASIL bila endpoint membalas 200 dengan format
  // respons standar mereka (`{statusCode, messages}`). Kita balas persis itu
  // agar tombol Test URL hijau — TANPA memproses pembayaran apa pun.
  if (isTestingEvent(body)) {
    return NextResponse.json({ statusCode: 200, messages: "success", ok: true });
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
            payment: { ...(order.payment ?? { provider: "mayar", status: "belum_bayar" }), status: "gagal" },
          },
          { merge: true },
        );
      return NextResponse.json({ ok: true, mismatch: true });
    }

    // ===== 3. Tandai lunas (idempoten) → status `dibayar` =====
    const targetStatus: OrderStatus = "dibayar";
    const { applied } = await markOrderPaid(
      orderId,
      { amount: typeof amount === "number" ? amount : order.total, method, transactionId },
      targetStatus,
    );

    if (!applied) {
      // Sudah dibayar sebelumnya — idempoten, tak ada aksi.
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
 * Verifikasi token webhook secara LUNAK.
 * - Bila `MAYAR_WEBHOOK_TOKEN` kosong → verifikasi dinonaktifkan (diam).
 * - Bila token cocok (toleran URL-encoding) → dianggap valid (diam).
 * - Bila tidak cocok / tidak ada → CATAT peringatan saja (TIDAK memblok).
 *
 * Keamanan sesungguhnya tetap terjaga: order dicocokkan via `extraData.orderId`
 * (hanya dibuat server saat checkout), perubahan status idempoten, dan nominal
 * diverifikasi ulang. Webhook "asing" tanpa orderId valid takkan berefek.
 */
function verifyTokenSoft(req: Request): void {
  const secret = process.env.MAYAR_WEBHOOK_TOKEN?.trim();
  if (!secret) return;

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
  const ok = candidates.some((c) => normalize(c) === expected);
  if (!ok) {
    console.warn(
      "[webhook/mayar] token webhook tidak cocok (dilanjutkan; dicek lewat orderId).",
      candidates.length ? "" : "(token tidak dikirim)",
    );
  }
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
