import type { Product, ProductVariant } from "@/lib/product-types";
import type { OrderItem } from "@/lib/order-types";
import { formatPrice } from "@/lib/product-format";

/**
 * Satu item di keranjang (data minimal, disimpan di localStorage).
 *
 * Untuk produk multi-varian, `variantSlug` & `variantName` diisi agar Basic dan
 * Custom tampil sebagai baris terpisah (dan checkout mengirim varian yang tepat).
 */
export type CartItem = {
  /** Slug produk induk. */
  slug: string;
  /** Nama tampilan: "Produk" atau "Produk — Nama Varian". */
  name: string;
  /** Harga satuan (Rupiah). Untuk varian = harga varian. */
  price: number;
  cover: string;
  qty: number;
  /** Slug varian terpilih (kosong untuk produk tunggal). */
  variantSlug?: string;
  /** Nama varian terpilih (kosong untuk produk tunggal). */
  variantName?: string;
};

/**
 * Kunci unik sebuah item keranjang (produk + varian). Dipakai agar varian
 * berbeda tidak saling menimpa di keranjang.
 */
export function cartItemKey(item: Pick<CartItem, "slug" | "variantSlug">): string {
  return item.variantSlug ? `${item.slug}::${item.variantSlug}` : item.slug;
}

/**
 * Mengubah produk (dan opsional varian) menjadi item keranjang.
 * - Tanpa `variant` → memakai harga produk (produk tunggal).
 * - Dengan `variant` → memakai harga & nama varian.
 */
export function toCartItem(
  product: Product,
  variant?: ProductVariant | null,
  qty = 1,
): CartItem {
  if (variant) {
    return {
      slug: product.slug,
      name: `${product.name} — ${variant.name}`,
      price: variant.price,
      cover: product.cover,
      qty,
      variantSlug: variant.slug,
      variantName: variant.name,
    };
  }
  return {
    slug: product.slug,
    name: product.name,
    price: product.price,
    cover: product.cover,
    qty,
  };
}

/** Mengubah varian produk menjadi item keranjang (harga & nama dari varian). */
export function cardItemForVariant(
  product: Product,
  variant: ProductVariant,
  qty = 1,
): CartItem {
  return toCartItem(product, variant, qty);
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
  lines.push(
    "Selanjutnya saya akan mengirim data & referensi desain yang dibutuhkan. Terima kasih!",
  );
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
    variantSlug: it.variantSlug,
    variantName: it.variantName,
  }));
  return buildOrderMessage(orderItems, buyer);
}
