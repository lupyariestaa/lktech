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

/** Label pendek untuk chip attention agar tidak melar di tabel (F-G20). */
const ATTENTION_SHORT: Record<string, string> = {
  jasa_menunggu: "Jasa >24 jam",
  bayar_segera: "Bayar <6 jam",
  kurang_bayar: "Kurang bayar",
  masalah_pembayaran: "Cek pembayaran",
  belum_dipenuhi: "Belum dipenuhi",
  email_gagal: "Email gagal",
};

/** Badge status pesanan. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const label = ORDER_STATUS_LABEL[status] ?? status;
  const style = ORDER_STATUS_STYLE[status] ?? "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        style,
      )}
    >
      {label}
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
  // F-G21: nama variabel = komponen ikon (bukan "Instan" yang menyesatkan).
  const Icon = eff === "jasa" || eff === "cetak" ? Truck : Zap;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        eff === "jasa" ? "bg-purple-50 text-purple-600" : eff === "cetak" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-600",
      )}
    >
      <Icon className="h-3 w-3" />
      {eff === "jasa" ? "Jasa" : eff === "cetak" ? "Cetak" : "Instan"}
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
          {ATTENTION_SHORT[r] ?? ATTENTION_LABEL[r] ?? r}
        </span>
      ))}
    </span>
  );
}
