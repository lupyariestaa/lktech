import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { markOrderPaid } from "@/lib/orders";
import { normalizeOrder, type Order, type OrderPayment } from "@/lib/order-types";
import { getInvoice, isMayarConfigured, isInvoicePaid } from "@/lib/mayar";
import { fulfillOrder, notifyOrderAwaitingConfirmation } from "@/lib/order-payment";

/**
 * REKONSILIASI PEMBAYARAN (F-09) — jaring pengaman di belakang webhook.
 *
 * Webhook `payment.received` adalah jalur CEPAT. Bila webhook tidak terkirim,
 * ditolak, atau gagal diterapkan, order bisa tertinggal di `menunggu_bayar`
 * padahal invoice sudah lunas di Mayar. Fungsi ini memeriksa langsung ke Mayar
 * secara berkala.
 *
 * PRINSIP KESELAMATAN (uang):
 * - Hanya menandai lunas bila **status invoice = lunas** DAN **nominal sama
 *   persis** dengan yang diharapkan. Tidak pernah menebak.
 * - Tidak pernah membuat invoice baru / menagih ulang.
 * - `markOrderPaid` sendiri transaksional & menolak status terminal (late payment
 *   dicatat, bukan ditimpa).
 * - Idempoten: order yang sudah lunas tidak diproses lagi.
 */

/** Maksimum order yang dipindai per run (membatasi biaya baca). */
const MAX_SCAN = 50;
/** Maksimum panggilan `getInvoice` per run (membatasi kuota API Mayar). */
const MAX_INVOICE_CHECKS = 40;

export type ReconcileResult = {
  /** Order yang dipindai. */
  scanned: number;
  /** Invoice yang benar-benar dicek ke Mayar. */
  checked: number;
  /** Order yang berhasil ditandai lunas. */
  paid: number;
  /** Order yang masih belum lunas (wajar). */
  skipped: number;
  /** Pembayaran masuk untuk order terminal (perlu tindakan admin/refund). */
  late: number;
  /** Kegagalan sementara (API/DB) — harus memicu retry. */
  failed: number;
  paidIds: string[];
  lateIds: string[];
  failedIds: string[];
};

type Candidate = {
  payment: OrderPayment;
  component: "goods" | "service";
};

function pendingInvoices(order: Order): Candidate[] {
  const out: Candidate[] = [];
  if (order.payment?.invoiceId && order.payment.status === "menunggu") {
    out.push({ payment: order.payment, component: "goods" });
  }
  if (order.servicePayment?.invoiceId && order.servicePayment.status === "menunggu") {
    out.push({ payment: order.servicePayment, component: "service" });
  }
  return out;
}

export async function reconcilePendingPayments(): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    scanned: 0,
    checked: 0,
    paid: 0,
    skipped: 0,
    late: 0,
    failed: 0,
    paidIds: [],
    lateIds: [],
    failedIds: [],
  };

  // Tanpa API key tidak ada yang bisa diverifikasi.
  if (!isMayarConfigured()) return result;
  const db = getAdminDb();
  if (!db) return result;

  // Dua status yang mungkin masih menunggu pembayaran. Order campuran berstatus
  // `menunggu_konfirmasi` tetapi bisa punya invoice barang yang menunggu.
  const snap = await db
    .collection("orders")
    .where("status", "in", ["menunggu_bayar", "menunggu_konfirmasi"])
    .limit(MAX_SCAN)
    .get();

  result.scanned = snap.docs.length;

  for (const doc of snap.docs) {
    if (result.checked >= MAX_INVOICE_CHECKS) break;
    const order = normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) });
    const candidates = pendingInvoices(order);

    for (const candidate of candidates) {
      if (result.checked >= MAX_INVOICE_CHECKS) break;
      result.checked += 1;
      const invoiceId = candidate.payment.invoiceId!;

      try {
        const detail = await getInvoice(invoiceId);

        // Belum lunas di Mayar → biarkan (bukan kegagalan).
        if (!isInvoicePaid(detail.status)) {
          result.skipped += 1;
          continue;
        }

        // Lunas tetapi nominal tidak sama persis → JANGAN tandai lunas.
        const expected = candidate.payment.amountExpected ?? order.total;
        if (!Number.isFinite(detail.amount) || detail.amount !== expected) {
          result.skipped += 1;
          console.error(
            `[reconcile] nominal tidak cocok, tidak ditandai lunas: order=${order.id} invoice=${invoiceId} received=${detail.amount} expected=${expected}`,
          );
          continue;
        }

        const { applied, reason } = await markOrderPaid(
          order.id,
          {
            amount: detail.amount,
            invoiceId,
            component: candidate.component,
            ...(detail.transactionId ? { transactionId: detail.transactionId } : {}),
          },
          "dibayar",
        );

        if (applied) {
          result.paid += 1;
          result.paidIds.push(order.id);
          // Fulfillment best-effort — kegagalan email/unduhan tidak membatalkan
          // status lunas yang sudah valid.
          try {
            if (candidate.component === "service") {
              await notifyOrderAwaitingConfirmation(order);
            } else {
              await fulfillOrder(order.id);
            }
          } catch (err) {
            console.error("[reconcile] fulfillment gagal:", order.id, err);
          }
        } else if (reason === "not_payable") {
          // Uang masuk untuk order terminal (dibatalkan/kedaluwarsa/selesai).
          result.late += 1;
          result.lateIds.push(order.id);
          console.error(
            `[reconcile] late_payment order=${order.id} invoice=${invoiceId} status=${order.status}`,
          );
          // F-08: catat penanda permanen agar muncul di panel "butuh perhatian".
          // Path bertitik → retry tidak menimpa resolusi admin (Sprint 5).
          try {
            await db.collection("orders").doc(order.id).set({
              "paymentLate.amount": expected,
              "paymentLate.atISO": new Date().toISOString(),
              "paymentLate.orderStatus": order.status,
              "paymentLate.reason": reason,
            }, { merge: true });
          } catch (err) {
            console.error("[reconcile] gagal mencatat paymentLate:", order.id, err);
          }
        } else {
          // already_paid / not_found → tidak ada aksi.
          result.skipped += 1;
        }
      } catch (err) {
        result.failed += 1;
        result.failedIds.push(order.id);
        console.error("[reconcile] gagal memeriksa invoice:", order.id, invoiceId, err);
      }
    }
  }

  return result;
}