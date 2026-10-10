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
    /** Status order setelah checkout (mis. menunggu_bayar / menunggu_konfirmasi). */
    status: Order["status"];
    /** Jalur fulfillment: instan (unduh) atau jasa (konsultasi). */
    fulfillment?: Order["fulfillment"];
    /** Info pembayaran (bila dibuat invoice). */
    payment?: Order["payment"];
    /** URL halaman pembayaran (bila tersedia). */
    payUrl?: string | null;
    message: string;
    whatsapp: string;
    createdAt: string;
  };
  /** Pesan peringatan (mis. gateway tidak tersedia → fallback WhatsApp). */
  warning?: string | null;
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

/** Pesanan milik user + link unduhan (bila produk digital sudah lunas). */
export type MyOrder = Order & {
  /** URL halaman unduhan (dihitung server) — ada bila order digital telah dibayar. */
  downloadUrl?: string;
};

/** Mengambil daftar pesanan milik user yang login. */
export async function fetchMyOrders(): Promise<MyOrder[]> {
  const token = await getIdToken();
  if (!token) throw new Error("Sesi berakhir. Silakan masuk kembali.");

  const res = await fetch("/api/orders", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal memuat pesanan.");
  return (data?.orders ?? []) as MyOrder[];
}

/** Harga/kelayakan terkini sebuah item (OR-B3). */
export type CurrentProduct = {
  slug: string;
  exists: boolean;
  active?: boolean;
  soldOut?: boolean;
  name?: string;
  price: number;
  variant?: { slug: string; name: string; price: number; soldOut: boolean; stock: number | null } | null;
};

/**
 * Ambil harga & kelayakan TERKINI untuk item (dipakai "Pesan lagi" agar keranjang
 * menampilkan harga aktual, bukan harga lama di order).
 */
export async function fetchCurrentProducts(
  items: { slug: string; variantSlug?: string }[],
): Promise<Map<string, CurrentProduct>> {
  const slugs = Array.from(new Set(items.map((it) => it.slug)));
  if (slugs.length === 0) return new Map();
  const variants = items
    .filter((it) => it.variantSlug)
    .map((it) => `${it.slug}:${it.variantSlug}`)
    .join(",");
  const params = new URLSearchParams({ slugs: slugs.join(",") });
  if (variants) params.set("variants", variants);

  const res = await fetch(`/api/products/current?${params.toString()}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal memuat harga produk.");
  const list = (data?.products ?? []) as CurrentProduct[];
  return new Map(list.map((p) => [p.slug, p]));
}
