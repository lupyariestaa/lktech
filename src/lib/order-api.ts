import { getIdToken } from "@/lib/auth";
import type { Order, OrderCoupon } from "@/lib/order-types";

/** Payload ringkas hasil checkout yang dikembalikan server. */
export type CheckoutResult = {
  order: {
    id: string;
    items: Order["items"];
    subtotal: number;
    coupon?: OrderCoupon;
    total: number;
    message: string;
    whatsapp: string;
    createdAt: string;
  };
};

export type CheckoutRequestItem = {
  slug: string;
  /** Slug varian terpilih (produk multi-varian). */
  variantSlug?: string;
  qty: number;
};

/**
 * Membuat pesanan di server. Server memverifikasi login, menghitung ulang harga
 * dari Firestore, memvalidasi kupon (opsional), dan mengembalikan pesan WhatsApp
 * kanonik.
 */
export async function createOrderRequest(
  items: CheckoutRequestItem[],
  buyerName: string,
  couponCode?: string,
): Promise<CheckoutResult> {
  const token = await getIdToken();
  if (!token) throw new Error("Sesi berakhir. Silakan masuk kembali.");

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items, buyerName, couponCode }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? "Gagal membuat pesanan.");
  }
  return data as CheckoutResult;
}

/** Mengambil daftar pesanan milik user yang login. */
export async function fetchMyOrders(): Promise<Order[]> {
  const token = await getIdToken();
  if (!token) throw new Error("Sesi berakhir. Silakan masuk kembali.");

  const res = await fetch("/api/orders", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal memuat pesanan.");
  return (data?.orders ?? []) as Order[];
}
