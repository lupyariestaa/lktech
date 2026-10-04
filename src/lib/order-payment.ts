import "server-only";
import { getProductsBySlugs } from "@/lib/products";
import { createDownloadGrant, downloadUrl, type DownloadFile } from "@/lib/downloads";
import { getSiteSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";
import {
  sendOrderPaidToBuyer,
  sendOrderStatusToBuyer,
} from "@/lib/email-order";
import { recordStatusEmail, logOrderEmail } from "@/lib/email-status";
import { getOrderById, setOrderDownloadToken } from "@/lib/orders";
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
 * Kirim email "menunggu konfirmasi" untuk order JASA (dipanggil dari checkout).
 * Best-effort — tidak melempar.
 */
export async function notifyOrderAwaitingConfirmation(
  order: Order,
): Promise<void> {
  try {
    const settings = await getSiteSettings();
    if (!settings.notifyBuyerOnOrder) return;
    const result = await sendOrderStatusToBuyer(order, "menunggu_konfirmasi");
    await recordStatusEmail(order.id, "menunggu_konfirmasi", result);
    await logOrderEmail(order.id, {
      kind: "status",
      to: order.buyerEmail,
      result,
    });
  } catch (err) {
    console.error("[order-payment] gagal kirim email konfirmasi jasa:", err);
  }
}
