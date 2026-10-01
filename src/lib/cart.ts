import type { Product } from "@/lib/product-types";
import type { OrderItem } from "@/lib/order-types";
import { formatPrice } from "@/lib/product-format";

/** Satu item di keranjang (data minimal produk, disimpan di localStorage). */
export type CartItem = {
  slug: string;
  name: string;
  price: number;
  cover: string;
  qty: number;
};

/** Mengubah produk menjadi item keranjang. */
export function toCartItem(product: Product, qty = 1): CartItem {
  return {
    slug: product.slug,
    name: product.name,
    price: product.price,
    cover: product.cover,
    qty,
  };
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

/** Ringkasan order untuk disusun menjadi pesan WhatsApp. */
export type CheckoutBuyer = {
  name: string;
  email: string;
};

/**
 * Membersihkan teks yang berasal dari data yang bisa dikendalikan user/admin
 * (nama produk, nama pembeli) agar tidak bisa memalsukan baris struktur pesan
 * lewat karakter newline / kontrol.
 */
export function sanitizeMessageText(value: string): string {
  return value
    .replace(/[\r\n\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Menyusun pesan checkout WhatsApp dari item yang SUDAH diverifikasi server.
 *
 * Fungsi ini dipakai baik di server (untuk menyimpan pesan kanonik) maupun di
 * klien (untuk membuka link WhatsApp), sehingga isi pesan selalu konsisten.
 */
export function buildOrderMessage(
  items: OrderItem[],
  buyer: CheckoutBuyer,
): string {
  const lines: string[] = [];
  lines.push("Halo LKTech! Saya ingin memesan produk berikut:");
  lines.push("");
  items.forEach((it, i) => {
    const qtyLabel = it.qty > 1 ? ` (${it.qty}x)` : "";
    lines.push(
      `${i + 1}. ${sanitizeMessageText(it.name)}${qtyLabel} — ${formatPrice(
        it.subtotal,
      )}`,
    );
  });
  lines.push("");
  const total = items.reduce((sum, it) => sum + it.subtotal, 0);
  lines.push(`Total: ${formatPrice(total)}`);
  lines.push("");
  lines.push("Data pemesan:");
  lines.push(`- Nama: ${sanitizeMessageText(buyer.name) || "-"}`);
  lines.push(`- Email: ${sanitizeMessageText(buyer.email) || "-"}`);
  lines.push("");
  lines.push("Mohon info langkah pembayaran selanjutnya. Terima kasih!");
  return lines.join("\n");
}

/**
 * Menyusun pesan checkout WhatsApp (multi-item) dari item keranjang lokal.
 * Dipakai sebagai fallback tampilan bila data server tidak tersedia.
 */
export function buildCheckoutMessage(
  items: CartItem[],
  buyer: CheckoutBuyer,
): string {
  const orderItems: OrderItem[] = items.map((it) => ({
    slug: it.slug,
    name: it.name,
    price: it.price,
    qty: it.qty,
    subtotal: it.price * it.qty,
  }));
  return buildOrderMessage(orderItems, buyer);
}
