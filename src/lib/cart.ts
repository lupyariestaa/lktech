import type { Product } from "@/lib/product-types";
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
 * Menyusun pesan checkout WhatsApp (multi-item).
 *
 * Pesan memuat identitas pembeli (hasil login) + daftar produk + total, agar
 * admin langsung tahu siapa & apa yang dipesan.
 */
export function buildCheckoutMessage(
  items: CartItem[],
  buyer: CheckoutBuyer,
): string {
  const lines: string[] = [];
  lines.push("Halo LKTech! Saya ingin memesan produk berikut:");
  lines.push("");
  items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.name}${it.qty > 1 ? ` (${it.qty}x)` : ""} — ${formatPrice(
        it.price * it.qty,
      )}`,
    );
  });
  lines.push("");
  lines.push(`Subtotal: ${formatPrice(cartSubtotal(items))}`);
  lines.push("");
  lines.push("Data pemesan:");
  lines.push(`- Nama: ${buyer.name || "-"}`);
  lines.push(`- Email: ${buyer.email || "-"}`);
  lines.push("");
  lines.push("Mohon info langkah pembayaran selanjutnya. Terima kasih!");
  return lines.join("\n");
}

/** Pesan checkout untuk satu produk (tombol "Beli Sekarang"). */
export function buildSingleProductMessage(
  product: Product,
  buyer: CheckoutBuyer,
): string {
  if (product.waMessage?.trim()) return product.waMessage;
  return buildCheckoutMessage([toCartItem(product)], buyer);
}
