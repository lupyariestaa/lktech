"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock, Download, RefreshCw, ShoppingBag } from "lucide-react";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  isAwaitingPayment,
} from "@/lib/order-types";
import type { MyOrder } from "@/lib/order-api";
import { formatPrice } from "@/lib/product-format";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tab "Pesanan": daftar pesanan + detail + pesan lagi. */
export function AccountOrders({
  orders,
  onReorder,
  reordering,
}: {
  orders: MyOrder[];
  /** Callback "pesan lagi" — menambahkan item pesanan ke keranjang. */
  onReorder: (order: MyOrder) => void;
  /** Id pesanan yang sedang diproses "pesan lagi" (untuk spinner). */
  reordering: string | null;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-12 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface text-muted">
          <ShoppingBag className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-secondary">
          Belum ada pesanan.
        </p>
        <p className="mt-1 text-xs text-muted">
          Pesanan yang Anda checkout akan muncul di sini.
        </p>
        <button
          onClick={() => router.push("/produk")}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
        >
          <ShoppingBag className="h-4 w-4" />
          Jelajahi Produk
        </button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const open = openId === order.id;
        const itemCount = order.items.reduce((n, it) => n + it.qty, 0);
        const pendingPayment = isAwaitingPayment(order);
        return (
          <li
            key={order.id}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  {formatDateTime(order.createdAt)}
                </p>
                <p className="mt-0.5 text-sm font-bold text-secondary">
                  {formatPrice(order.total)}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {itemCount} item
                  </span>
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  ORDER_STATUS_STYLE[order.status],
                )}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>

            {pendingPayment && (
              <div className="flex flex-wrap items-center gap-2 border-t border-amber-100 bg-amber-50/60 px-5 py-3">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="flex-1 text-xs text-amber-700">
                  Pesanan menunggu pembayaran.
                  {order.payment?.expiresAt
                    ? ` Selesaikan sebelum ${formatDateTime(order.payment.expiresAt)}.`
                    : ""}
                </p>
                <a
                  href={order.payment!.payUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-dark"
                >
                  Bayar sekarang
                </a>
              </div>
            )}

            {order.downloadUrl && (
              <div className="flex flex-wrap items-center gap-2 border-t border-emerald-100 bg-emerald-50/60 px-5 py-3">
                <Download className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <p className="flex-1 text-xs text-emerald-700">
                  Produk digital Anda siap diunduh.
                </p>
                <a
                  href={order.downloadUrl}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-600"
                >
                  Unduh produk
                </a>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
              <button
                onClick={() => setOpenId(open ? null : order.id)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              >
                {open ? "Tutup detail" : "Lihat detail"}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>
              <button
                onClick={() => onReorder(order)}
                disabled={reordering === order.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-primary-dark disabled:opacity-60"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    reordering === order.id && "animate-spin",
                  )}
                />
                Pesan lagi
              </button>
            </div>

            {open && (
              <div className="border-t border-slate-100 bg-surface/50 px-5 py-4">
                <ul className="flex flex-col gap-2">
                  {order.items.map((it) => (
                    <li
                      key={`${it.slug}-${it.variantSlug ?? ""}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 text-slate-700">
                        <span className="break-words">{it.name}</span>
                        {it.qty > 1 && (
                          <span className="ml-1 text-muted">×{it.qty}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium text-secondary">
                        {formatPrice(it.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
