"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteOrderAdmin,
  exportOrdersToCsv,
  fetchOrdersAdmin,
  fetchOrdersSummary,
  updateOrderStatusAdmin,
} from "@/lib/admin-orders-api";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  type Order,
  type OrderStatus,
} from "@/lib/order-types";
import type { OrdersSummary } from "@/lib/orders";
import { formatRupiah, formatDateTime, shortOrderCode } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 25;

/** Pesanan + status ringkas untuk kartu metrik. */
const SUMMARY_CARDS: Array<{ key: keyof OrdersSummary; label: string; accent: string }> = [
  { key: "total", label: "Total Pesanan", accent: "bg-primary-50 text-primary" },
  { key: "baru", label: "Baru", accent: "bg-blue-50 text-blue-600" },
  { key: "diproses", label: "Diproses", accent: "bg-amber-50 text-amber-600" },
  { key: "omzet", label: "Omzet (selesai)", accent: "bg-emerald-50 text-emerald-600" },
];

export function OrdersManager() {
  const toast = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "semua">("semua");
  const [reloadKey, setReloadKey] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Order | null>(null);
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch awal + setiap kali filter/reload berubah (satu jalur).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [page, sum] = await Promise.all([
          fetchOrdersAdmin({ status: filter, limit: PAGE_LIMIT }),
          fetchOrdersSummary().catch(() => null),
        ]);
        if (!active) return;
        setOrders(page.orders);
        setNextCursor(page.nextCursor);
        if (sum) setSummary(sum);
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
  }, [filter, reloadKey]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchOrdersAdmin({
        status: filter,
        cursor: nextCursor,
        limit: PAGE_LIMIT,
      });
      setOrders((prev) => [...prev, ...page.orders]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat lagi.");
    } finally {
      setLoadingMore(false);
    }
  };

  const refresh = () => {
    setReloadKey((k) => k + 1);
    toast.success("Memuat ulang pesanan...");
  };

  // Filter pencarian di memori (nama/email/kode).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const code = shortOrderCode(o.id).toLowerCase();
      return (
        o.buyerName.toLowerCase().includes(q) ||
        o.buyerEmail.toLowerCase().includes(q) ||
        code.includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [orders, query]);

  const onStatus = async (id: string, status: OrderStatus) => {
    if (busyIds.has(id)) return;
    const prev = orders;
    setBusyIds((s) => new Set(s).add(id));
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await updateOrderStatusAdmin(id, status);
      toast.success("Status pesanan diperbarui.");
      // Ringkasan (badge/metrik) ikut berubah.
      fetchOrdersSummary().then(setSummary).catch(() => {});
    } catch (err) {
      setOrders(prev); // rollback
      const msg = err instanceof Error ? err.message : "Gagal memperbarui.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const onExport = () => {
    if (filtered.length === 0) {
      toast.error("Tidak ada pesanan untuk diekspor.");
      return;
    }
    exportOrdersToCsv(filtered);
    toast.success(`${filtered.length} pesanan diekspor.`);
  };

  const confirmDelete = async () => {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    const prev = orders;
    setOrders((os) => os.filter((o) => o.id !== target.id));
    try {
      await deleteOrderAdmin(target.id);
      setToDelete(null);
      if (detail?.id === target.id) setDetail(null);
      toast.success(`Pesanan ${shortOrderCode(target.id)} dihapus.`);
      fetchOrdersSummary().then(setSummary).catch(() => {});
    } catch (err) {
      setOrders(prev);
      const msg = err instanceof Error ? err.message : "Gagal menghapus.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const copyMessage = async (order: Order) => {
    try {
      await navigator.clipboard.writeText(order.message);
      setCopied(true);
      toast.success("Pesan WhatsApp disalin.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin pesan.");
    }
  };

  return (
    <div>
      {/* Kartu ringkasan */}
      {summary && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SUMMARY_CARDS.map((c) => (
            <div
              key={c.key}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl",
                  c.accent,
                )}
              >
                <Package className="h-4 w-4" />
              </span>
              <p className="mt-3 text-lg font-bold text-secondary">
                {c.key === "omzet" ? formatRupiah(summary.omzet) : summary[c.key]}
              </p>
              <p className="mt-0.5 text-xs text-muted">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, atau kode..."
            aria-label="Cari pesanan"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as OrderStatus | "semua")}
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

        <button
          onClick={onExport}
          disabled={loading || filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          title="Ekspor hasil yang tampil ke CSV"
        >
          <Download className="h-4 w-4" />
          Ekspor CSV
        </button>

        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Muat ulang
        </button>
      </div>

      <p className="mt-3 text-xs text-muted">
        Menampilkan {filtered.length} pesanan
        {nextCursor ? " (masih ada lagi)" : ""}.
      </p>

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
      ) : filtered.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            {orders.length === 0
              ? "Belum ada pesanan masuk."
              : "Tidak ada pesanan yang cocok."}
          </p>
          <p className="mt-1 text-xs text-muted">
            {orders.length === 0
              ? "Pesanan dari checkout produk akan muncul di sini."
              : "Coba ubah kata kunci atau filter status."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                busy={busyIds.has(order.id)}
                onStatus={onStatus}
                onDetail={() => setDetail(order)}
                onDelete={() => setToDelete(order)}
              />
            ))}
          </div>

          {nextCursor && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Muat lagi
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail pesanan */}
      {detail && (
        <OrderDetailDialog
          order={detail}
          copied={copied}
          onCopy={() => copyMessage(detail)}
          onClose={() => setDetail(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus pesanan ini?"
        description={`Pesanan ${toDelete ? shortOrderCode(toDelete.id) : ""} dari "${toDelete?.buyerName ?? toDelete?.buyerEmail}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/** Kartu satu pesanan di daftar. */
function OrderCard({
  order,
  busy,
  onStatus,
  onDetail,
  onDelete,
}: {
  order: Order;
  busy: boolean;
  onStatus: (id: string, status: OrderStatus) => void;
  onDetail: () => void;
  onDelete: () => void;
}) {
  const itemCount = order.items.reduce((sum, it) => sum + it.qty, 0);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-slate-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
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
              <a
                href={`mailto:${order.buyerEmail}`}
                className="transition-colors hover:text-primary"
              >
                {order.buyerEmail}
              </a>
            </p>
          </div>
        </div>

        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            ORDER_STATUS_STYLE[order.status],
          )}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
        <p className="text-xs text-slate-500">
          {order.items.length > 0
            ? order.items
                .map((it) => `${it.name} ×${it.qty}`)
                .join(", ")
            : "Rincian item tidak tersedia."}
        </p>
        <p className="text-sm font-bold text-secondary">
          {formatRupiah(order.total)}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <select
          value={order.status}
          disabled={busy}
          onChange={(e) => onStatus(order.id, e.target.value as OrderStatus)}
          aria-label={`Status pesanan ${shortOrderCode(order.id)}`}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button
          onClick={onDetail}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-100"
        >
          <Package className="h-3.5 w-3.5" />
          Detail
        </button>

        <a
          href={waLink(order.message, order.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>

        <button
          onClick={onDelete}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Hapus
        </button>
      </div>
    </article>
  );
}

/** Dialog detail satu pesanan (item, total, aksi). */
function OrderDetailDialog({
  order,
  copied,
  onCopy,
  onClose,
}: {
  order: Order;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape + kunci scroll body + focus trap sederhana.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const prevFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[13000] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail pesanan ${shortOrderCode(order.id)}`}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-secondary">
              Pesanan
              <span className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                {shortOrderCode(order.id)}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-surface"
            aria-label="Tutup detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {/* Pembeli */}
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Pembeli
            </p>
            <p className="mt-1 text-sm font-semibold text-secondary">
              {order.buyerName || "Tanpa nama"}
            </p>
            <a
              href={`mailto:${order.buyerEmail}`}
              className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" />
              {order.buyerEmail}
            </a>
          </div>

          {/* Item */}
          <p className="mt-5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Rincian Item
          </p>
          <ul className="mt-2 flex flex-col divide-y divide-slate-100">
            {order.items.map((it, i) => (
              <li key={`${it.slug}-${i}`} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-secondary">{it.name}</p>
                  {it.variantName && (
                    <p className="text-xs text-muted">Varian: {it.variantName}</p>
                  )}
                  <p className="text-xs text-muted">
                    {formatRupiah(it.price)} × {it.qty}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-secondary">
                  {formatRupiah(it.subtotal)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            {order.coupon && order.coupon.discount > 0 && (
              <div className="w-full">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-medium text-secondary">
                    {formatRupiah(order.subtotal)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-emerald-600">
                    Diskon ({order.coupon.code})
                  </span>
                  <span className="font-medium text-emerald-600">
                    −{formatRupiah(order.coupon.discount)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                  <span className="text-sm font-semibold text-secondary">
                    Total
                  </span>
                  <span className="text-base font-bold text-primary">
                    {formatRupiah(order.total)}
                  </span>
                </div>
              </div>
            )}
            {!(order.coupon && order.coupon.discount > 0) && (
              <>
                <span className="text-sm font-semibold text-secondary">Total</span>
                <span className="text-base font-bold text-primary">
                  {formatRupiah(order.total)}
                </span>
              </>
            )}
          </div>

          {/* Pesan WA kanonik */}
          <p className="mt-5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Pesan WhatsApp
          </p>
          <pre className="mt-2 max-h-40 overflow-y-auto rounded-2xl bg-surface p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-600">
            {order.message}
          </pre>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-5">
          <a
            href={waLink(order.message, order.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            <MessageCircle className="h-4 w-4" />
            Kirim WhatsApp
          </a>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Salin pesan
          </button>
        </div>
      </div>
    </div>
  );
}
