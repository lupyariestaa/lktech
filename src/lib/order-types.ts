/** Status pesanan (dikelola manual oleh admin via WhatsApp). */
export const ORDER_STATUSES = [
  "baru",
  "diproses",
  "selesai",
  "dibatalkan",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Label tampilan status pesanan. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

/** Kelas badge status pesanan (konsisten dengan pola lead). */
export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  baru: "bg-blue-50 text-blue-600 border-blue-100",
  diproses: "bg-amber-50 text-amber-600 border-amber-100",
  selesai: "bg-emerald-50 text-emerald-600 border-emerald-100",
  dibatalkan: "bg-slate-100 text-slate-500 border-slate-200",
};

/** Satu item pesanan dengan harga yang SUDAH diverifikasi server. */
export type OrderItem = {
  slug: string;
  name: string;
  /** Harga satuan (Rupiah) saat order dibuat — dari server, bukan klien. */
  price: number;
  qty: number;
  /** Subtotal = price * qty. */
  subtotal: number;
  /** Slug varian terpilih (kosong untuk produk tunggal). */
  variantSlug?: string;
  /** Nama varian terpilih (kosong untuk produk tunggal). */
  variantName?: string;
};

/** Kupon yang tercatat pada sebuah order (snapshot saat checkout). */
export type OrderCoupon = {
  code: string;
  type: "percent" | "amount";
  /** Jumlah diskon (Rupiah) yang diterapkan. */
  discount: number;
};

/** Pesanan tersimpan di Firestore (`orders/{id}`). */
export type Order = {
  id: string;
  uid: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  /** Subtotal sebelum diskon (Rp). Untuk order lama: = `total`. */
  subtotal: number;
  /** Kupon yang dipakai (bila ada). */
  coupon?: OrderCoupon;
  /** Total akhir = subtotal − diskon. */
  total: number;
  status: OrderStatus;
  /** Nomor WhatsApp tujuan checkout (dari settings situs). */
  whatsapp: string;
  /** Pesan WhatsApp kanonik yang dikirim ke admin (untuk audit/ulang kirim). */
  message: string;
  createdAt: string;
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
}

/** Menormalkan data order mentah (dari Firestore) menjadi `Order`. */
export function normalizeOrder(data: Record<string, unknown>): Order {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: OrderItem[] = rawItems
    .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === "object"))
    .map((it) => {
      const price = num(it.price);
      const qty = Math.max(1, Math.floor(num(it.qty)));
      return {
        slug: str(it.slug),
        name: str(it.name),
        price,
        qty,
        subtotal: num(it.subtotal) || price * qty,
        variantSlug: str(it.variantSlug) || undefined,
        variantName: str(it.variantName) || undefined,
      };
    });

  const status = (ORDER_STATUSES as readonly string[]).includes(str(data.status))
    ? (data.status as OrderStatus)
    : "baru";

  const total = num(data.total);
  const subtotal = num(data.subtotal) || total;

  let coupon: OrderCoupon | undefined;
  if (data.coupon && typeof data.coupon === "object") {
    const c = data.coupon as Record<string, unknown>;
    const code = str(c.code);
    if (code) {
      coupon = {
        code,
        type: str(c.type) === "amount" ? "amount" : "percent",
        discount: num(c.discount),
      };
    }
  }

  return {
    id: str(data.id),
    uid: str(data.uid),
    buyerName: str(data.buyerName),
    buyerEmail: str(data.buyerEmail),
    items,
    subtotal,
    coupon,
    total,
    status,
    whatsapp: str(data.whatsapp),
    message: str(data.message),
    createdAt: str(data.createdAtISO) || str(data.createdAt),
  };
}

