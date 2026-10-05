import { adminFetch } from "@/lib/admin-fetch";
import {
  ORDER_STATUS_LABEL,
  type Order,
  type OrderStatus,
} from "@/lib/order-types";
import { formatRupiah, shortOrderCode } from "@/lib/format";
import type { OrdersSummary } from "@/lib/orders";

/** Opsi query daftar pesanan admin. */
export type OrdersListQuery = {
  status?: OrderStatus | "semua";
  cursor?: string | null;
  limit?: number;
};

export type OrdersListResult = {
  orders: Order[];
  nextCursor: string | null;
};

function buildQuery(query: OrdersListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.status && query.status !== "semua") params.set("status", query.status);
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Daftar pesanan terpaginasi (admin). */
export async function fetchOrdersAdmin(
  query: OrdersListQuery = {},
): Promise<OrdersListResult> {
  return adminFetch<OrdersListResult>(`/api/admin/orders${buildQuery(query)}`);
}

/** Ringkasan pesanan (badge/metrik). */
export async function fetchOrdersSummary(): Promise<OrdersSummary> {
  const data = await adminFetch<{ summary: OrdersSummary }>(
    "/api/admin/orders?summary=1",
  );
  return data.summary;
}

/** Perbarui status pesanan. */
export async function updateOrderStatusAdmin(id: string, status: OrderStatus) {
  return adminFetch<{ ok: boolean }>("/api/admin/orders", {
    method: "PATCH",
    body: JSON.stringify({ id, status }),
  });
}

/** Hapus pesanan (permanen). */
export async function deleteOrderAdmin(id: string) {
  return adminFetch<{ ok: boolean }>(
    `/api/admin/orders?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/** Entri riwayat email sebuah order (`EM-P1`). */
export type OrderEmailLog = {
  id: string;
  kind: string;
  to: string;
  status: string;
  error?: string;
  attempt: number;
  atISO: string;
};

/** Riwayat email sebuah pesanan. */
export async function fetchOrderEmails(orderId: string): Promise<OrderEmailLog[]> {
  const data = await adminFetch<{ emails: OrderEmailLog[] }>(
    `/api/admin/orders?emails=${encodeURIComponent(orderId)}`,
  );
  return data.emails;
}

/** Daftar pesanan satu hari (drill-down analitik `AN-P2`). */
export async function fetchOrdersByDay(dateISO: string): Promise<Order[]> {
  const data = await adminFetch<{ orders: Order[] }>(
    `/api/admin/orders?date=${encodeURIComponent(dateISO)}`,
  );
  return data.orders;
}

/** Kirim ulang email ke pembeli (`EM-P1`). */
export async function resendOrderEmail(
  id: string,
  kind?: "confirmation" | "status",
) {
  return adminFetch<{ ok: boolean }>("/api/admin/orders", {
    method: "POST",
    body: JSON.stringify({ id, kind }),
  });
}

/**
 * Buat/segarkan link unduhan untuk order digital yang sudah dibayar.
 * Mengembalikan URL unduhan (juga dikirim ulang ke email pembeli).
 */
export async function fulfillOrderDownload(id: string) {
  return adminFetch<{ ok: boolean; downloadUrl?: string; files?: number }>(
    "/api/admin/orders",
    {
      method: "POST",
      body: JSON.stringify({ id, action: "fulfill" }),
    },
  );
}

/**
 * Buat invoice manual (Mayar) untuk sebuah order (FASE P2) — umumnya JASA.
 * Mengembalikan URL pembayaran yang bisa dikirim ke pembeli.
 */
export async function createOrderInvoiceManual(id: string) {
  return adminFetch<{
    ok: boolean;
    payUrl?: string;
    invoiceId?: string;
    expiresAt?: string;
    reused?: boolean;
  }>("/api/admin/orders", {
    method: "POST",
    body: JSON.stringify({ id, action: "invoice" }),
  });
}

/** Bungkus nilai agar aman sebagai sel CSV (quote + escape). */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Ubah daftar pesanan menjadi CSV dan unduh di browser.
 * Item dirangkum jadi satu kolom (nama ×qty; dipisah ";").
 */
export function exportOrdersToCsv(orders: Order[], filename?: string) {
  const headers = [
    "Kode",
    "ID",
    "Pembeli",
    "Email",
    "Item",
    "Jumlah item",
    "Total",
    "Status",
    "Tanggal",
  ];
  const rows = orders.map((o) => {
    const items = o.items
      .map((it) => `${it.name}${it.variantName ? ` (${it.variantName})` : ""} ×${it.qty}`)
      .join("; ");
    return [
      shortOrderCode(o.id),
      o.id,
      o.buyerName || "—",
      o.buyerEmail,
      items,
      o.items.length,
      o.total,
      ORDER_STATUS_LABEL[o.status],
      o.createdAt ?? "",
    ]
      .map(csvCell)
      .join(",");
  });
  const csv = "\uFEFF" + [headers.map(csvCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename ?? `pesanan-lktech-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Label total untuk ringkasan cepat (dipakai kartu metrik). */
export function formatTotal(total: number): string {
  return formatRupiah(total);
}
