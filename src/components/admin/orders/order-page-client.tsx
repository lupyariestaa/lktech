"use client";

import { useCallback, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { fetchOrderDetail } from "@/lib/admin-orders-api";
import type { Order } from "@/lib/order-types";
import {
  OrderDetailBody,
  OrderActionsBar,
} from "@/components/admin/orders/order-detail-dialog";
import { OrderTimeline } from "@/components/admin/order-timeline";
import { useToast } from "@/components/admin/toast";

/**
 * Halaman detail pesanan (FASE O6) — dua kolom: rincian (kiri) & aksi +
 * timeline (kanan). Data awal dari server; setelah aksi, disegarkan via API.
 * Komponen di-`key` per `order.id` oleh pemanggil sehingga state tidak basi.
 */
export function OrderPageClient({ order: initial }: { order: Order }) {
  const toast = useToast();
  const [order, setOrder] = useState<Order>(initial);
  const [refreshing, setRefreshing] = useState(false);

  const onChanged = useCallback(async () => {
    setRefreshing(true);
    try {
      const { order: fresh } = await fetchOrderDetail(initial.id);
      setOrder(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat ulang pesanan.");
    } finally {
      setRefreshing(false);
    }
  }, [initial.id, toast]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div
        data-print-root
        className="rounded-3xl border border-slate-200 bg-white p-5 print:border-0 print:p-0"
      >
        <div className="mb-3 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-bold text-secondary">Rincian pesanan</h2>
          <div className="flex items-center gap-3">
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                <Loader2 className="h-3 w-3 animate-spin" />
                Menyegarkan...
              </span>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak
            </button>
          </div>
        </div>
        <OrderDetailBody order={order} />
      </div>

      <div className="flex flex-col gap-6 print:hidden">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-secondary">Aksi</h2>
          <OrderActionsBar order={order} onChanged={onChanged} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <OrderTimeline orderId={order.id} />
        </div>
      </div>
    </div>
  );
}