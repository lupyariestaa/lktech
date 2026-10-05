import "server-only";
import { getProductsBySlugs } from "@/lib/products";
import {
  createDownloadGrant,
  downloadUrl,
  getGrantByOrderId,
  type DownloadFile,
} from "@/lib/downloads";
import { getSiteSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";
import {
  sendOrderPaidToBuyer,
  sendOrderStatusToBuyer,
} from "@/lib/email-order";
import { sendOrderAwaitingConfirmationToAdmin } from "@/lib/email";
import { recordStatusEmail, logOrderEmail } from "@/lib/email-status";
import { getOrderById, setOrderDownloadToken, updateOrderPayment } from "@/lib/orders";
import { createInvoice, isMayarConfigured } from "@/lib/mayar";
import type { Order } from "@/lib/order-types";

/**
 * Orkestrasi PEMBAYARAN → FULFILLMENT (FASE P1).
 *
 * Dipanggil setelah order ditandai `dibayar` (dari webhook Mayar). Best-effort:
 * mengembalikan ringkasan hasil, TIDAK melempar error (webhook harus tetap
 * membalas 200 cepat).
 *
 * Langkah:
 * 1. Kumpulkan berkas unduhan dari produk-produk pada order (`downloadable`).
 * 2. Bila ada → buat token unduhan (idempoten per order) + link.
 * 3. Kirim email "pembayaran diterima" (dengan link unduhan bila ada).
 */

export type FulfillResult = {
  /** Apakah ada berkas unduhan yang disiapkan. */
  downloadsReady: boolean;
  /** Link unduhan (bila ada). */
  downloadUrl?: string;
  /** Status pengiriman email (sent|skipped|failed). */
  emailStatus: "sent" | "skipped" | "failed";
};

/** Kumpulkan berkas unduhan dari produk produk pada order. */
async function collectDownloadFiles(
  order: Order,
): Promise<{ files: DownloadFile[]; note?: string; linkDays?: number; maxHits?: number }> {
  const slugs = Array.from(new Set(order.items.map((it) => it.slug)));
  const products = await getProductsBySlugs(slugs);

  const files: DownloadFile[] = [];
  const notes: string[] = [];
  let linkDays: number | undefined;
  let maxHits: number | undefined;

  for (const slug of slugs) {
    const product = products.get(slug);
    const cfg = product?.downloadable;
    if (!cfg || !cfg.enabled) continue;
    for (const f of cfg.files) {
      files.push({
        name: f.name || product?.name || "Berkas",
        url: f.url,
        ...(typeof f.size === "number" && Number.isFinite(f.size)
          ? { size: f.size }
          : {}),
      });
    }
    if (cfg.note) notes.push(cfg.note);
    if (cfg.linkDays && cfg.linkDays > 0) linkDays = Math.min(linkDays ?? cfg.linkDays, cfg.linkDays);
    if (cfg.maxDownloads && cfg.maxDownloads > 0) {
      maxHits = Math.min(maxHits ?? cfg.maxDownloads, cfg.maxDownloads);
    }
  }

  // Hilangkan duplikat URL (produk sama bisa muncul >1 item).
  const seen = new Set<string>();
  const unique = files.filter((f) => {
    if (seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });

  return {
    files: unique,
    note: notes.length ? notes.join(" ") : undefined,
    linkDays,
    maxHits,
  };
}

/**
 * Memenuhi order yang sudah dibayar: siapkan unduhan (bila ada) & kirim email.
 * Idempoten: pembuatan token per order aman dipanggil ulang; email dibatasi
 * oleh pemanggil (via `lastNotifiedStatus`).
 */
export async function fulfillOrder(orderId: string): Promise<FulfillResult> {
  const order = await getOrderById(orderId);
  if (!order) return { downloadsReady: false, emailStatus: "skipped" };

  let downloadLink: string | undefined;
  const { files, note, linkDays, maxHits } = await collectDownloadFiles(order);

  if (files.length > 0) {
    try {
      const grant = await createDownloadGrant({
        orderId: order.id,
        uid: order.uid,
        buyerEmail: order.buyerEmail,
        files,
        note,
        linkDays,
        maxHits,
        // Bila sudah ada token (mis. fulfillment dijalankan ulang), perbarui
        // berkasnya agar berkas yang baru ditambahkan ikut tersedia.
        refreshExisting: true,
      });
      if (grant) {
        downloadLink = downloadUrl(SITE_URL, grant.token);
        // Simpan tokenId ke order agar `/akun` dapat menampilkan link unduhan.
        await setOrderDownloadToken(order.id, grant.grant.tokenId);
      }
    } catch (err) {
      console.error("[order-payment] gagal membuat token unduhan:", err);
    }
  }

  // Email: "pembayaran diterima (+ link unduhan)". Hormati preferensi pembeli.
  let emailStatus: FulfillResult["emailStatus"] = "skipped";
  try {
    const settings = await getSiteSettings();
    if (settings.notifyBuyerOnOrder) {
      const result = await sendOrderPaidToBuyer(order, downloadLink);
      emailStatus = result.ok ? "sent" : result.skipped ? "skipped" : "failed";
      await recordStatusEmail(order.id, "dibayar", result);
      await logOrderEmail(order.id, {
        kind: "paid",
        to: order.buyerEmail,
        result,
      });
    }
  } catch (err) {
    console.error("[order-payment] gagal kirim email dibayar:", err);
    emailStatus = "failed";
  }

  return { downloadsReady: Boolean(downloadLink), downloadUrl: downloadLink, emailStatus };
}

/**
 * AKSI ADMIN: membuat/menyegarkan ulang link unduhan untuk sebuah order yang
 * sudah dibayar (mis. bila berkas produk baru ditambahkan setelah pembayaran).
 *
 * - Mengumpulkan ulang berkas dari produk (mengikuti perubahan terbaru).
 * - Bila sudah ada token → berkasnya DIPERBARUI (token tetap sama).
 * - Menyimpan `downloadTokenId` ke order & mengirim ulang email "pembayaran
 *   diterima + link unduhan" (best-effort).
 *
 * Mengembalikan `{ ok, downloadUrl?, reason? }`.
 */
export async function releaseOrderDownload(orderId: string): Promise<{
  ok: boolean;
  downloadUrl?: string;
  files: number;
  reason?: string;
}> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, files: 0, reason: "not_found" };

  const { files, note, linkDays, maxHits } = await collectDownloadFiles(order);
  if (files.length === 0) {
    return { ok: false, files: 0, reason: "no_files" };
  }

  const grant = await createDownloadGrant({
    orderId: order.id,
    uid: order.uid,
    buyerEmail: order.buyerEmail,
    files,
    note,
    linkDays,
    maxHits,
    refreshExisting: true,
  });
  if (!grant) {
    return { ok: false, files: files.length, reason: "download_disabled" };
  }

  const link = downloadUrl(SITE_URL, grant.token);
  await setOrderDownloadToken(order.id, grant.grant.tokenId);

  // Kirim ulang email berisi link (best-effort; status dicatat).
  try {
    const settings = await getSiteSettings();
    if (settings.notifyBuyerOnOrder) {
      const result = await sendOrderPaidToBuyer(order, link);
      await logOrderEmail(order.id, {
        kind: "download_release",
        to: order.buyerEmail,
        result,
      });
    }
  } catch (err) {
    console.error("[order-payment] gagal kirim email rilis unduhan:", err);
  }

  return { ok: true, downloadUrl: link, files: files.length };
}

/**
 * Info unduhan sebuah order (untuk tampilan admin): link, jumlah berkas,
 * berapa kali diunduh, batas, & kedaluwarsa. Null bila belum ada token.
 */
export async function getOrderDownloadInfo(orderId: string): Promise<{
  url: string;
  fileCount: number;
  hits: number;
  maxHits: number;
  expiresAt: string;
} | null> {
  const found = await getGrantByOrderId(orderId);
  if (!found) return null;
  return {
    url: downloadUrl(SITE_URL, found.token),
    fileCount: found.grant.files.length,
    hits: found.grant.hits,
    maxHits: found.grant.maxHits,
    expiresAt: found.grant.expiresAt,
  };
}

/**
 * Kirim email "menunggu konfirmasi" untuk order JASA (dipanggil dari checkout).
 * - Ke PEMBELI: status `menunggu_konfirmasi` (bila `notifyBuyerOnOrder`).
 * - Ke ADMIN: peringatan bahwa pesanan jasa butuh tindak lanjut manual (FASE P2).
 * Best-effort — tidak melempar.
 */
export async function notifyOrderAwaitingConfirmation(
  order: Order,
): Promise<void> {
  try {
    const settings = await getSiteSettings();
    if (settings.notifyBuyerOnOrder) {
      const result = await sendOrderStatusToBuyer(order, "menunggu_konfirmasi");
      await recordStatusEmail(order.id, "menunggu_konfirmasi", result);
      await logOrderEmail(order.id, {
        kind: "status",
        to: order.buyerEmail,
        result,
      });
    }
  } catch (err) {
    console.error("[order-payment] gagal kirim email konfirmasi jasa (pembeli):", err);
  }

  // Notifikasi admin (best-effort, terpisah agar kegagalan satu tak memblok lain).
  try {
    await sendOrderAwaitingConfirmationToAdmin(order);
  } catch (err) {
    console.error("[order-payment] gagal kirim email konfirmasi jasa (admin):", err);
  }
}

/**
 * AKSI ADMIN (FASE P2): buat **invoice manual** via Mayar untuk sebuah order
 * (umumnya JASA setelah kesepakatan, atau INSTAN yang gagal invoice otomatis).
 *
 * - Membuat invoice Mayar dengan `extraData.orderId` → webhook `payment.received`
 *   akan menandai order lunas otomatis (jalur yang sama seperti checkout).
 * - Menyimpan `payment` (status `menunggu`, payUrl, invoiceId, expiresAt) ke order
 *   TANPA mengubah status order (biarkan `menunggu_konfirmasi`/`menunggu_bayar`).
 * - **Idempoten (GAP-5):** bila sudah ada invoice MENUNGGU dengan tautan, tautan
 *   itu dikembalikan (`reused: true`) — tidak membuat invoice baru (cegah dobel).
 * - **GAP-4:** menolak order berstatus final (`dibatalkan`/`kedaluwarsa`/`selesai`).
 *
 * Mengembalikan `{ ok, payUrl?, reason? }`. Tidak melempar (dipanggil API admin).
 */
export async function createManualOrderInvoice(orderId: string): Promise<{
  ok: boolean;
  payUrl?: string;
  invoiceId?: string;
  expiresAt?: string;
  /** True bila tautan lama dipakai ulang (tidak membuat invoice baru). */
  reused?: boolean;
  reason?: string;
}> {
  if (!isMayarConfigured()) {
    return { ok: false, reason: "mayar_disabled" };
  }

  const order = await getOrderById(orderId);
  if (!order) return { ok: false, reason: "not_found" };
  if (order.payment?.status === "dibayar") {
    return { ok: false, reason: "already_paid" };
  }
  // GAP-4: tolak order yang sudah final (tidak masuk akal ditagih lagi).
  if (
    order.status === "dibatalkan" ||
    order.status === "kedaluwarsa" ||
    order.status === "selesai"
  ) {
    return { ok: false, reason: "final_status" };
  }
  // GAP-5: cegah invoice DOBEL — bila sudah ada invoice yang menunggu bayar
  // dengan tautan, kembalikan tautan itu (jangan buat invoice baru).
  if (order.payment?.payUrl && order.payment.status === "menunggu") {
    return {
      ok: true,
      payUrl: order.payment.payUrl,
      invoiceId: order.payment.invoiceId,
      expiresAt: order.payment.expiresAt,
      reused: true,
    };
  }
  if (order.total <= 0) {
    return { ok: false, reason: "no_amount" };
  }

  // `mobile` WAJIB Mayar: pakai nomor WhatsApp situs (kontak admin) sebagai
  // fallback karena invoice manual dipicu admin, bukan pembeli.
  const settings = await getSiteSettings();
  const mobile = settings.whatsapp || "";

  const invoice = await createInvoice({
    name: order.buyerName || "Pembeli LKTech",
    email: order.buyerEmail,
    mobile,
    description: `Pesanan LKTech ${order.id}`,
    items:
      order.coupon && order.coupon.discount > 0
        ? [
            { quantity: 1, rate: order.subtotal, description: "Subtotal pesanan" },
            {
              quantity: 1,
              rate: -order.coupon.discount,
              description: `Diskon ${order.coupon.code}`,
            },
          ]
        : [{ quantity: 1, rate: order.total, description: "Total pesanan" }],
    extraData: { orderId: order.id },
  });

  const expiresAt = new Date(invoice.expiredAt).toISOString();
  await updateOrderPayment(order.id, {
    provider: "mayar",
    status: "menunggu",
    invoiceId: invoice.invoiceId,
    transactionId: invoice.transactionId,
    payUrl: invoice.payUrl,
    expiresAt,
    manual: true,
  } as NonNullable<Order["payment"]>);

  return {
    ok: true,
    payUrl: invoice.payUrl,
    invoiceId: invoice.invoiceId,
    expiresAt,
  };
}
