"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Download,
  X,
  Filter,
} from "lucide-react";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/order-types";
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABEL } from "@/lib/payment-types";
import {
  hasActiveFilter,
  ORDERS_SORT_LABEL,
  ORDER_SORTS,
  type DatePreset,
  type OrdersFilter,
  type OrdersSort,
} from "@/lib/orders-filter-pure";
import { cn } from "@/lib/utils";

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: "semua", label: "Semua waktu" },
  { value: "hari_ini", label: "Hari ini" },
  { value: "7_hari", label: "7 hari" },
  { value: "30_hari", label: "30 hari" },
  { value: "bulan_ini", label: "Bulan ini" },
  { value: "kustom", label: "Kustom" },
];

/**
 * Toolbar filter/sort/pencarian daftar pesanan (FASE O2/O3).
 * Semua perubahan dikirim ke pemanggil (`onChange`), yang menyinkron ke URL &
 * memuat ulang dari server.
 */
export function OrdersToolbar({
  filter,
  sort,
  loading,
  onFilter,
  onSort,
  onRefresh,
  onExport,
  exportDisabled,
}: {
  filter: OrdersFilter;
  sort: OrdersSort;
  loading: boolean;
  onFilter: (next: OrdersFilter) => void;
  onSort: (sort: OrdersSort) => void;
  onRefresh: () => void;
  onExport: () => void;
  exportDisabled: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const active = hasActiveFilter(filter);

  const set = (patch: Partial<OrdersFilter>) => onFilter({ ...filter, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filter.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Cari kode, email, atau nama pembeli..."
            aria-label="Cari pesanan"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </div>

        <select
          value={filter.status}
          onChange={(e) => set({ status: e.target.value })}
          aria-label="Filter status pesanan"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          <option value="semua">Semua status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as OrdersSort)}
          aria-label="Urutkan pesanan"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          {ORDER_SORTS.map((s) => (
            <option key={s} value={s}>
              {ORDERS_SORT_LABEL[s]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors",
            showAdvanced || active
              ? "border-primary/30 bg-primary-50 text-primary"
              : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
          {active && (
            <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              !
            </span>
          )}
        </button>

        <button
          onClick={onExport}
          disabled={loading || exportDisabled}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          title="Ekspor hasil filter ke CSV"
        >
          <Download className="h-4 w-4" />
          Ekspor
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Muat ulang"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {showAdvanced && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Rentang tanggal</span>
            <select
              value={filter.datePreset}
              onChange={(e) => set({ datePreset: e.target.value as DatePreset })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              {DATE_PRESETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            {filter.datePreset === "kustom" && (
              <span className="mt-1 flex items-center gap-1.5">
                <input
                  type="date"
                  value={filter.from}
                  onChange={(e) => set({ from: e.target.value })}
                  aria-label="Dari tanggal"
                  className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-secondary"
                />
                <input
                  type="date"
                  value={filter.to}
                  onChange={(e) => set({ to: e.target.value })}
                  aria-label="Sampai tanggal"
                  className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-secondary"
                />
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Fulfillment</span>
            <select
              value={filter.fulfillment}
              onChange={(e) =>
                set({ fulfillment: e.target.value as OrdersFilter["fulfillment"] })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              <option value="semua">Semua jalur</option>
              <option value="instan">Instan (unduh)</option>
              <option value="jasa">Jasa</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Status pembayaran</span>
            <select
              value={filter.paymentStatus}
              onChange={(e) => set({ paymentStatus: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              <option value="semua">Semua</option>
              {PAYMENT_STATUSES.map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_STATUS_LABEL[p]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Kupon</span>
            <select
              value={filter.coupon}
              onChange={(e) =>
                set({ coupon: e.target.value as OrdersFilter["coupon"] })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              <option value="semua">Semua</option>
              <option value="ada">Pakai kupon</option>
              <option value="tanpa">Tanpa kupon</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Nominal minimal (Rp)</span>
            <input
              type="number"
              min={0}
              value={filter.minTotal ?? ""}
              onChange={(e) =>
                set({ minTotal: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-secondary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Nominal maksimal (Rp)</span>
            <input
              type="number"
              min={0}
              value={filter.maxTotal ?? ""}
              onChange={(e) =>
                set({ maxTotal: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-secondary"
            />
          </label>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={filter.attention}
                onChange={(e) => set({ attention: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              Hanya yang butuh perhatian
            </label>
          </div>

          {active && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onFilter(resetFilter(filter))}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500"
              >
                <X className="h-3.5 w-3.5" />
                Reset filter
              </button>
            </div>
          )}
        </div>
      )}

      {active && (
        <p className="flex items-center gap-1.5 text-[11px] text-primary">
          <Filter className="h-3 w-3" />
          Filter aktif — hasil disaring di server.
        </p>
      )}
    </div>
  );
}

/** Reset filter tetapi pertahankan pencarian cepat? Tidak — reset penuh. */
function resetFilter(current: OrdersFilter): OrdersFilter {
  return {
    status: "semua",
    datePreset: "semua",
    from: "",
    to: "",
    fulfillment: "semua",
    paymentStatus: "semua",
    coupon: "semua",
    minTotal: null,
    maxTotal: null,
    attention: false,
    q: current.q,
  };
}