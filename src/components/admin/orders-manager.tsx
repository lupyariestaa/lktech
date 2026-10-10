"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  LayoutGrid,
  Loader2,
  Package,
  Rows3,
} from "lucide-react";
import {
  bulkOrders,
  exportOrdersToCsv,
  fetchOrdersAdmin,
  fetchOrdersAttention,
  fetchOrdersSummary,
  resendOrderEmail,
  type OrdersListResult,
} from "@/lib/admin-orders-api";
import type { Order } from "@/lib/order-types";
import type { AttentionSummary, OrdersSummary } from "@/lib/orders";
import {
  defaultFilter,
  ordersFilterToParams,
  parseOrdersFilter,
  type OrdersFilter,
  type OrdersSort,
} from "@/lib/orders-filter-pure";
import { formatRupiah } from "@/lib/format";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { OrdersToolbar } from "@/components/admin/orders/orders-toolbar";
import { OrdersTable } from "@/components/admin/orders/orders-table";
import { OrderCard } from "@/components/admin/orders/order-card";
import { OrdersAttentionPanel } from "@/components/admin/orders/orders-attention-panel";
import { OrdersBulkBar, type BulkAction } from "@/components/admin/orders/orders-bulk-bar";
import { OrderDetailDialog } from "@/components/admin/orders/order-detail-dialog";
import { useOrdersView } from "@/components/admin/orders/use-orders-view";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

/** Kartu ringkasan (OR-D3: lengkap semua status). */
const SUMMARY_CARDS: Array<{ key: keyof OrdersSummary; label: string; accent: string }> = [
  { key: "total", label: "Total Pesanan", accent: "bg-primary-50 text-primary" },
  { key: "baru", label: "Baru", accent: "bg-blue-50 text-blue-600" },
  { key: "menunggu_bayar", label: "Menunggu Bayar", accent: "bg-amber-50 text-amber-600" },
  { key: "menunggu_konfirmasi", label: "Perlu Konfirmasi", accent: "bg-purple-50 text-purple-600" },
  { key: "dibayar", label: "Dibayar", accent: "bg-emerald-50 text-emerald-600" },
  { key: "diproses", label: "Diproses", accent: "bg-amber-50 text-amber-600" },
  { key: "selesai", label: "Selesai", accent: "bg-emerald-50 text-emerald-600" },
  { key: "dibatalkan", label: "Dibatalkan", accent: "bg-slate-100 text-slate-500" },
  { key: "kedaluwarsa", label: "Kedaluwarsa", accent: "bg-slate-100 text-slate-500" },
  { key: "omzet", label: "Omzet (selesai)", accent: "bg-emerald-50 text-emerald-600" },
];

export function OrdersManager() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const filter = useMemo(() => parseOrdersFilter(sp), [sp]);
  const sort = (sp.get("sort") as OrdersSort | null) ?? "date_desc";
  const page = Math.max(Number(sp.get("page")) || 1, 1);
  const pageSize = (() => {
    const n = Number(sp.get("pageSize"));
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
  })();

  const [data, setData] = useState<OrdersListResult | null>(null);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [attention, setAttention] = useState<AttentionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { view, setView: setViewPersist } = useOrdersView();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Order | null>(null);

  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    | { kind: "delete"; ids: string[] }
    | { kind: "delete-one"; order: Order }
    | null
  >(null);

  // Preferensi tampilan ditangani hook `useOrdersView` (useSyncExternalStore).

  const reload = useCallback(() => {
    setData(null);
    setSelected(new Set());
  }, []);

  // Fetch daftar (filter/sort/page dari URL).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchOrdersAdmin({
          filter,
          sort,
          page,
          limit: pageSize,
        });
        if (!active) return;
        setData(result);
        setSelected(new Set());
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat pesanan.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter, sort, page, pageSize]);

  // Ringkasan + attention (di-refresh saat daftar berubah halaman/filter).
  useEffect(() => {
    let active = true;
    (async () => {
      const [sum, att] = await Promise.all([
        fetchOrdersSummary().catch(() => null),
        fetchOrdersAttention().catch(() => null),
      ]);
      if (!active) return;
      if (sum) setSummary(sum);
      if (att) setAttention(att);
    })();
    return () => {
      active = false;
    };
  }, [data]);

  const orders = data?.orders ?? [];
  const total = data?.total ?? orders.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const navigate = (
    nextFilter: OrdersFilter,
    nextSort: OrdersSort,
    nextPage: number,
    nextPageSize: number = pageSize,
  ) => {
    const params = ordersFilterToParams(nextFilter);
    if (nextSort !== "date_desc") params.set("sort", nextSort);
    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextPageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(nextPageSize));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const onFilter = (next: OrdersFilter) => navigate(next, sort, 1);
  const onSort = (next: OrdersSort) => navigate(filter, next, 1);
  const onPage = (next: number) => navigate(filter, sort, next);
  const onPageSize = (next: number) => navigate(filter, sort, 1, next);

  const refresh = () => {
    reload();
    fetchOrdersSummary()
      .then(setSummary)
      .catch(() => {});
    fetchOrdersAttention()
      .then(setAttention)
      .catch(() => {});
    toast.success("Memuat ulang pesanan...");
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(orders.map((o) => o.id)) : new Set());

  const selectedIds = [...selected];

  const onExport = () => {
    const rows = selected.size > 0 ? orders.filter((o) => selected.has(o.id)) : orders;
    if (rows.length === 0) {
      toast.error("Tidak ada pesanan untuk diekspor.");
      return;
    }
    exportOrdersToCsv(rows);
    toast.success(`${rows.length} pesanan diekspor (halaman ini).`);
  };

  const runBulk = async (action: BulkAction) => {
    if (selectedIds.length === 0) return;
    if (action.action === "export") {
      onExport();
      return;
    }
    if (action.action === "delete") {
      setConfirm({ kind: "delete", ids: selectedIds });
      return;
    }
    setBulkBusy(true);
    try {
      if (action.action === "status") {
        const res = await bulkOrders({
          ids: selectedIds,
          op: "status",
          status: action.status,
        });
        toast.success(
          `${res.applied} pesanan diperbarui${res.skipped.length ? `, ${res.skipped.length} dilewati` : ""}.`,
        );
      } else {
        // resend email — loop (endpoint per-order).
        let ok = 0;
        for (const id of selectedIds) {
          try {
            await resendOrderEmail(id);
            ok += 1;
          } catch {
            /* lewati */
          }
        }
        toast.success(`Email dikirim ulang untuk ${ok}/${selectedIds.length} pesanan.`);
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Aksi massal gagal.");
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (!confirm) return;
    setBulkBusy(true);
    try {
      if (confirm.kind === "delete") {
        const res = await bulkOrders({ ids: confirm.ids, op: "delete" });
        toast.success(
          `${res.applied} pesanan dihapus${res.skipped.length ? `, ${res.skipped.length} dilewati` : ""}.`,
        );
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBulkBusy(false);
      setConfirm(null);
    }
  };

  return (
    <div>
      {/* Panel butuh perhatian */}
      {attention && attention.total > 0 && (
        <div className="mb-5">
          <OrdersAttentionPanel
            attention={attention}
            onFocus={() => onFilter({ ...defaultFilter(), attention: true })}
          />
        </div>
      )}

      {/* Kartu ringkasan (klik → set filter status) */}
      {summary && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SUMMARY_CARDS.map((c) => {
            const isOmzet = c.key === "omzet";
            const active = !isOmzet && filter.status === c.key;
            return (
              <button
                key={c.key}
                type="button"
                disabled={isOmzet}
                onClick={() =>
                  onFilter({
                    ...defaultFilter(),
                    status: active ? "semua" : (c.key as string),
                  })
                }
                className={cn(
                  "rounded-2xl border bg-white p-4 text-left transition-colors",
                  active
                    ? "border-primary/40 ring-1 ring-primary/20"
                    : "border-slate-200",
                  !isOmzet && "hover:border-primary/30",
                )}
              >
                <span
                  className={cn("grid h-9 w-9 place-items-center rounded-xl", c.accent)}
                >
                  <Package className="h-4 w-4" />
                </span>
                <p className="mt-3 text-lg font-bold text-secondary">
                  {isOmzet ? formatRupiah(summary.omzet) : summary[c.key]}
                </p>
                <p className="mt-0.5 text-xs text-muted">{c.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <OrdersToolbar
        filter={filter}
        sort={sort}
        loading={loading}
        onFilter={onFilter}
        onSort={onSort}
        onRefresh={refresh}
        onExport={onExport}
        exportDisabled={orders.length === 0}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Menampilkan <span className="font-semibold text-secondary">{orders.length}</span>{" "}
          dari {total} pesanan
          {data?.truncated && (
            <span className="ml-1 text-amber-600">
              (dibatasi pemindaian — persempit filter untuk presisi)
            </span>
          )}
          .
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            Per halaman
            <select
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              aria-label="Jumlah pesanan per halaman"
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewPersist("table")}
              aria-label="Tampilan tabel"
              aria-pressed={view === "table"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "table" ? "bg-primary-50 text-primary" : "text-slate-500",
              )}
            >
              <Rows3 className="h-3.5 w-3.5" />
              Tabel
            </button>
            <button
              type="button"
              onClick={() => setViewPersist("card")}
              aria-label="Tampilan kartu"
              aria-pressed={view === "card"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "card" ? "bg-primary-50 text-primary" : "text-slate-500",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kartu
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Daftar */}
      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memuat pesanan...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            Tidak ada pesanan yang cocok.
          </p>
          <p className="mt-1 text-xs text-muted">
            Coba ubah kata kunci atau filter.
          </p>
        </div>
      ) : view === "table" ? (
        <div className="mt-4">
          <OrdersTable
            orders={orders}
            selected={selected}
            sort={sort}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onOpen={(o) => setDetail(o)}
            onSort={onSort}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selected.has(order.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {/* Paginasi bernomor (FASE O7) */}
      {!loading && total > pageSize && (
        <Pagination page={page} totalPages={totalPages} onPage={onPage} />
      )}

      {/* Dialog tinjauan cepat */}
      {detail && (
        <OrderDetailDialog
          order={detail}
          onClose={() => setDetail(null)}
          onChanged={refresh}
        />
      )}

      {/* Bilah aksi massal */}
      {selected.size > 0 && (
        <OrdersBulkBar
          count={selected.size}
          busy={bulkBusy}
          onClear={() => setSelected(new Set())}
          onAction={runBulk}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === "delete"
            ? `Hapus ${confirm.ids.length} pesanan?`
            : "Hapus pesanan ini?"
        }
        description="Hanya pesanan yang belum diproses yang dapat dihapus. Pesanan lain akan dilewati. Tindakan ini permanen."
        confirmLabel="Hapus"
        busy={bulkBusy}
        onConfirm={confirmBulkDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <nav
      aria-label="Navigasi halaman"
      className="mt-6 flex items-center justify-center gap-1.5"
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
      >
        ‹
      </button>
      {start > 1 && (
        <>
          <PageBtn p={1} active={false} onPage={onPage} />
          {start > 2 && <span className="px-1 text-slate-400">…</span>}
        </>
      )}
      {pages.map((p) => (
        <PageBtn key={p} p={p} active={p === page} onPage={onPage} />
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
          <PageBtn p={totalPages} active={false} onPage={onPage} />
        </>
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
      >
        ›
      </button>
    </nav>
  );
}

function PageBtn({
  p,
  active,
  onPage,
}: {
  p: number;
  active: boolean;
  onPage: (p: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPage(p)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "grid h-9 min-w-9 place-items-center rounded-full px-2 text-xs font-semibold transition-colors",
        active
          ? "bg-primary text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary",
      )}
    >
      {p}
    </button>
  );
}