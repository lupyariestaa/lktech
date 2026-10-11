"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import type { Order } from "@/lib/order-types";
import type { OrdersSort } from "@/lib/orders-filter-pure";
import { attentionReasons } from "@/lib/orders-filter-pure";
import { formatRupiah, formatDateTime, shortOrderCode } from "@/lib/format";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  FulfillmentChip,
  AttentionChips,
} from "@/components/admin/orders/order-status-badge";
import { BuyerAvatar } from "@/components/admin/orders/buyer-avatar";
import { cn } from "@/lib/utils";

/**
 * Tabel data pesanan (FASE O1) — header dapat disortir, baris dapat diklik ke
 * halaman detail, ceklis seleksi untuk aksi massal.
 */
export function OrdersTable({
  orders,
  selected,
  sort,
  onToggle,
  onToggleAll,
  onOpen,
  onSort,
}: {
  orders: Order[];
  selected: Set<string>;
  sort: OrdersSort;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (order: Order) => void;
  onSort: (sort: OrdersSort) => void;
}) {
  const allSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));
  const now = new Date();

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleAll(e.target.checked)}
                aria-label="Pilih semua di halaman ini"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
            </th>
            <th className="px-3 py-3">Kode</th>
            <SortHeader
              label="Tanggal"
              active={sort === "date_desc" || sort === "date_asc"}
              dir={sort === "date_asc" ? "asc" : "desc"}
              onClick={() =>
                onSort(sort === "date_desc" ? "date_asc" : "date_desc")
              }
            />
            <th className="px-3 py-3">Pembeli</th>
            <th className="px-3 py-3">Item</th>
            <SortHeader
              label="Total"
              active={sort === "total_desc" || sort === "total_asc"}
              dir={sort === "total_asc" ? "asc" : "desc"}
              onClick={() =>
                onSort(sort === "total_desc" ? "total_asc" : "total_desc")
              }
            />
            <SortHeader
              label="Status"
              active={sort === "status"}
              dir="asc"
              onClick={() => onSort("status")}
            />
            <th className="px-3 py-3">Pembayaran</th>
            <th className="px-3 py-3">Jalur</th>
            <th className="w-12 px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((order) => {
            const reasons = attentionReasons(order, now);
            const isSelected = selected.has(order.id);
            return (
              <tr
                key={order.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-surface",
                  isSelected && "bg-primary-50/40",
                )}
                onClick={() => onOpen(order)}
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(order.id)}
                    aria-label={`Pilih pesanan ${shortOrderCode(order.id)}`}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                  />
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                    {shortOrderCode(order.id)}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-muted">
                  {formatDateTime(order.createdAt)}
                </td>
                <td className="max-w-[200px] px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <BuyerAvatar
                      name={order.buyerName}
                      email={order.buyerEmail}
                      photoUrl={order.buyerPhotoUrl}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-secondary">
                        {order.buyerName || "Tanpa nama"}
                      </p>
                      <p className="truncate text-xs text-muted">{order.buyerEmail}</p>
                    </div>
                  </div>
                </td>
                <td className="max-w-[220px] px-3 py-3">
                  <p className="truncate text-xs text-slate-600" title={itemSummary(order)}>
                    {itemSummary(order)}
                  </p>
                  {reasons.length > 0 && (
                    <span className="mt-1 block">
                      <AttentionChips reasons={reasons} />
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-secondary">
                  {formatRupiah(order.total)}
                </td>
                <td className="px-3 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-3 py-3">
                  <PaymentStatusBadge status={order.payment?.status} />
                </td>
                <td className="px-3 py-3">
                  <FulfillmentChip fulfillment={order.fulfillment} />
                </td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    aria-label={`Buka detail ${shortOrderCode(order.id)}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-surface hover:text-primary"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function itemSummary(order: Order): string {
  if (order.items.length === 0) return "Rincian tidak tersedia.";
  const total = order.items.reduce((s, it) => s + it.qty, 0);
  const first = order.items[0];
  return order.items.length === 1
    ? `${first.name} ×${first.qty}`
    : `${first.name} +${order.items.length - 1} lainnya · ${total} item`;
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th
      className="px-3 py-3"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 font-semibold tracking-wide uppercase transition-colors hover:text-primary",
          active && "text-primary",
        )}
      >
        {label}
        {active &&
          (dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
}