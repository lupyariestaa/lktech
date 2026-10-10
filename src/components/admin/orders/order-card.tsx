"use client";

import Link from "next/link";
import { Package, MessageCircle, ArrowRight } from "lucide-react";
import type { Order } from "@/lib/order-types";
import { attentionReasons } from "@/lib/orders-filter-pure";
import { formatRupiah, formatDateTime, shortOrderCode } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  FulfillmentChip,
  AttentionChips,
} from "@/components/admin/orders/order-status-badge";
import { cn } from "@/lib/utils";

/** Kartu pesanan (FASE O1) — tampilan seluler / preferensi. */
export function OrderCard({
  order,
  selected,
  onToggle,
}: {
  order: Order;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const itemCount = order.items.reduce((s, it) => s + it.qty, 0);
  const reasons = attentionReasons(order);
  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-slate-900/5",
        selected ? "border-primary/40 ring-1 ring-primary/20" : "border-slate-200",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(order.id)}
            aria-label={`Pilih pesanan ${shortOrderCode(order.id)}`}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
          />
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white">
            {(order.buyerName || order.buyerEmail || "?").charAt(0).toUpperCase()}
          </span>
          <div>
            <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold text-secondary">
              {order.buyerName || "Tanpa nama"}
              <span className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                {shortOrderCode(order.id)}
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {formatDateTime(order.createdAt)} · {itemCount} item ·{" "}
              <a href={`mailto:${order.buyerEmail}`} className="hover:text-primary">
                {order.buyerEmail}
              </a>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <OrderStatusBadge status={order.status} />
          <span className="flex items-center gap-1.5">
            <PaymentStatusBadge status={order.payment?.status} />
            <FulfillmentChip fulfillment={order.fulfillment} />
          </span>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="mt-3">
          <AttentionChips reasons={reasons} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
        <p className="text-xs text-slate-500">
          {order.items.length > 0
            ? order.items.map((it) => `${it.name} ×${it.qty}`).join(", ")
            : "Rincian item tidak tersedia."}
        </p>
        <p className="text-sm font-bold text-secondary">{formatRupiah(order.total)}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Link
          href={`/admin/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-100"
        >
          <Package className="h-3.5 w-3.5" />
          Detail
        </Link>
        <a
          href={waLink(order.message, order.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>
        <Link
          href={`/admin/orders/${order.id}`}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-primary"
        >
          Buka
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}