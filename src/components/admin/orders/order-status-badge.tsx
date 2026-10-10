"use client";

import { Truck, Zap, AlertTriangle } from "lucide-react";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  type OrderStatus,
} from "@/lib/order-types";
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
  type PaymentStatus,
} from "@/lib/payment-types";
import { effectiveFulfillment } from "@/lib/order-fulfillment";
import type { FulfillmentType } from "@/lib/payment-types";
import { ATTENTION_LABEL } from "@/lib/orders-filter-pure";
import { cn } from "@/lib/utils";

/** Badge status pesanan. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        ORDER_STATUS_STYLE[status],
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

/** Badge status pembayaran (bila ada info pembayaran). */
export function PaymentStatusBadge({
  status,
}: {
  status: PaymentStatus | undefined;
}) {
  if (!status) {
    return <span className="text-[11px] text-muted">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        PAYMENT_STATUS_STYLE[status],
      )}
    >
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

/** Chip jalur fulfillment (instan/jasa). */
export function FulfillmentChip({
  fulfillment,
}: {
  fulfillment: FulfillmentType | undefined;
}) {
  const eff = effectiveFulfillment(fulfillment);
  const Instan = eff === "jasa" ? Truck : Zap;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        eff === "jasa"
          ? "bg-purple-50 text-purple-600"
          : "bg-sky-50 text-sky-600",
      )}
    >
      <Instan className="h-3 w-3" />
      {eff === "jasa" ? "Jasa" : "Instan"}
    </span>
  );
}

/** Daftar chip alasan "butuh perhatian". */
export function AttentionChips({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {reasons.map((r) => (
        <span
          key={r}
          title={ATTENTION_LABEL[r] ?? r}
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
        >
          <AlertTriangle className="h-3 w-3" />
          {ATTENTION_LABEL[r] ?? r}
        </span>
      ))}
    </span>
  );
}