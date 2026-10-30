"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  createOrderInvoiceManual,
  deleteOrderAdmin,
  fetchOrderDetail,
  fetchOrderEmails,
  fulfillOrderDownload,
  resendOrderEmail,
  reconcileOrderInvoice,
  verifyOrderInvoice,
  resolveLatePaymentAdmin,
  updateOrderStatusAdmin,
  type OrderEmailLog,
} from "@/lib/admin-orders-api";
import type { Order, OrderStatus } from "@/lib/order-types";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE } from "@/lib/order-types";
import { isTransitionAllowed } from "@/lib/order-status-pure";
import { effectiveFulfillment } from "@/lib/order-fulfillment";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_STYLE } from "@/lib/payment-types";
import { formatRupiah, formatDateTime, shortOrderCode } from "@/lib/format";
import { printSpecificationLines } from "@/lib/order-item-display";
import { waLink } from "@/lib/whatsapp";
import { ensureRecentAdminAuth } from "@/lib/admin-reauth";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useDrawerFocus } from "@/components/admin/use-drawer-focus";
import { OrderTimeline } from "@/components/admin/order-timeline";
import { BuyerAvatar } from "@/components/admin/orders/buyer-avatar";
import { cn } from "@/lib/utils";

/** Dialog tinjauan cepat (FASE O6) — detail lengkap ada di halaman `/admin/orders/[id]`. */
export function OrderDetailDialog({
  order: initial,
  onClose,
  onChanged,
}: {
  order: Order;
  onClose: () => void;
  onChanged: () => void;
}) {
  // Focus-trap + kembalikan fokus ke pemicu saat ditutup (F-G19).
  const { ref: panelRef } = useDrawerFocus<HTMLDivElement>(true);
  // Salinan lokal agar dialog menampilkan data terbaru setelah aksi (F-G5).
  // Di-`key` per order oleh pemanggil sehingga `initial` hanya menginisialisasi.
  const [order, setOrder] = useState<Order>(initial);

  const refreshLocal = useCallback(async () => {
    try {
      const { order: fresh } = await fetchOrderDetail(initial.id);
      setOrder(fresh);
    } catch {
      /* biarkan data lama; list tetap di-refresh oleh pemanggil */
    }
  }, [initial.id]);

  const handleChanged = useCallback(() => {
    onChanged();
    void refreshLocal();
  }, [onChanged, refreshLocal]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
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
            <p className="mt-0.5 text-xs text-muted">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/orders/${order.id}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Buka halaman
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-surface"
              aria-label="Tutup detail"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          <OrderDetailBody order={order} />
        </div>

        <div className="border-t border-slate-100 p-5">
          <OrderActionsBar order={order} onChanged={handleChanged} onDeleted={onClose} />
        </div>
      </div>
    </div>
  );
}

/**
 * Isi detail pesanan (tanpa aksi) — dipakai dialog & halaman detail.
 * `showTimeline` menampilkan timeline aktivitas (khusus halaman detail).
 */
export function OrderDetailBody({
  order,
  showTimeline = false,
}: {
  order: Order;
  showTimeline?: boolean;
}) {
  // Simpan kunci + data agar perubahan kunci otomatis menampilkan "memuat"
  // tanpa `setState` sinkron di efek.
  const emailKey = `${order.id}|${order.confirmationEmailAt ?? ""}|${order.lastStatusEmailAt ?? ""}|${order.lastStatusEmailStatus ?? ""}|${order.confirmationEmailStatus ?? ""}`;
  const [emailState, setEmailState] = useState<{
    key: string;
    list: OrderEmailLog[];
    error: boolean;
  }>({ key: emailKey, list: [], error: false });

  const emails = emailState.key === emailKey ? emailState.list : null;
  const emailsError = emailState.key === emailKey ? emailState.error : false;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchOrderEmails(order.id);
        if (active) setEmailState({ key: emailKey, list, error: false });
      } catch {
        // Bedakan "gagal memuat" dari "kosong" (F-G15).
        if (active) setEmailState({ key: emailKey, list: [], error: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [order.id, emailKey]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            ORDER_STATUS_STYLE[order.status],
          )}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </span>
        {order.payment && (
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              PAYMENT_STATUS_STYLE[order.payment.status],
            )}
          >
            {PAYMENT_STATUS_LABEL[order.payment.status]}
          </span>
        )}
      </div>

      {/* Pembeli */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-4">
        <BuyerAvatar
          name={order.buyerName}
          email={order.buyerEmail}
          photoUrl={order.buyerPhotoUrl}
          size={44}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Pembeli
          </p>
          <p className="mt-0.5 text-sm font-semibold text-secondary">
            {order.buyerName || "Tanpa nama"}
          </p>
          <a
            href={`mailto:${order.buyerEmail}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-primary"
          >
            <Mail className="h-3.5 w-3.5" />
            {order.buyerEmail}
          </a>
        </div>
      </div>

      {/* Pembayaran */}
      {(order.payment || order.servicePayment) && (
        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Pembayaran
          </p>
          {([...[order.payment ? [{ label: "Barang", payment: order.payment }] : []], ...[order.servicePayment ? [{ label: "Jasa", payment: order.servicePayment }] : []]].flat()).map(({ label, payment }) => (
          <div key={label} className="mt-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
          <p className="text-xs font-semibold text-secondary">{label} · {PAYMENT_STATUS_LABEL[payment.status]}</p>
          <dl className="mt-1 flex flex-col gap-1 text-xs">
            <Row
              label="Metode"
              value={`${payment.provider}${payment.method ? ` · ${payment.method}` : ""}${payment.manual ? " · manual" : ""}`}
            />
            <Row label="Nominal tagihan" value={formatRupiah(payment.amountExpected ?? 0)} />
            {typeof payment.amount === "number" && (
              <Row label="Nominal diterima" value={formatRupiah(payment.amount)} />
            )}
            {payment.paidAt && (
              <Row label="Dibayar pada" value={formatDateTime(payment.paidAt)} />
            )}
            {payment.expiresAt && (
              <Row label="Kedaluwarsa" value={formatDateTime(payment.expiresAt)} />
            )}
          </dl>
          {payment.payUrl && payment.status !== "dibayar" && (
            <a
              href={payment.payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka halaman pembayaran
            </a>
          )}
          </div>
          ))}
        </div>
      )}

      {order.paymentMismatch &&
        (!order.paymentMismatch.reason || order.paymentMismatch.reason === "amount_mismatch") &&
        order.paymentMismatch.received !== undefined &&
        order.paymentMismatch.received < (order.paymentMismatch.expected ?? order.total) && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800">
          <p className="font-semibold">Nominal kurang bayar</p>
          <p className="mt-1">
            Diterima {formatRupiah(order.paymentMismatch.received ?? 0)} dari{" "}
            {formatRupiah(order.paymentMismatch.expected ?? order.total)}. Order tetap
            menunggu bayar — tindak lanjuti manual.
          </p>
        </div>
      )}

      {order.paymentIssue && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800">
          <p className="font-semibold">Bukti pembayaran perlu ditinjau</p>
          <p className="mt-1">
            Webhook pembayaran ditolak ({order.paymentIssue.reason ?? "alasan tidak diketahui"}).
            Pesanan belum ditandai lunas; cocokkan bukti pembayaran melalui Mayar.
          </p>
        </div>
      )}

      <EmailStatusBlock order={order} />

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
              {printSpecificationLines(it).map((detail) => (
                <p key={detail} className="text-xs text-muted">{detail}</p>
              ))}
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

      <div className="mt-3 border-t border-slate-200 pt-3">
        {order.coupon && order.coupon.discount > 0 ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium text-secondary">
                {formatRupiah(order.subtotal)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-emerald-600">Diskon ({order.coupon.code})</span>
              <span className="font-medium text-emerald-600">
                −{formatRupiah(order.coupon.discount)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
              <span className="text-sm font-semibold text-secondary">Total</span>
              <span className="text-base font-bold text-primary">
                {formatRupiah(order.total)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-secondary">Total</span>
            <span className="text-base font-bold text-primary">
              {formatRupiah(order.total)}
            </span>
          </div>
        )}
      </div>

      {/* Riwayat email */}
      <p className="mt-5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        Riwayat Email
      </p>
      <EmailHistory emails={emails} error={emailsError} />

      {/* Pesan WA */}
      <p className="mt-5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        Pesan WhatsApp
      </p>
      <pre className="mt-2 max-h-40 overflow-y-auto rounded-2xl bg-surface p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-600">
        {order.message}
      </pre>

      {showTimeline && (
        <div className="mt-6">
          <OrderTimeline orderId={order.id} />
        </div>
      )}
    </div>
  );
}

/** Bilah aksi pesanan — dipakai dialog & halaman detail. */
export function OrderActionsBar({
  order,
  onChanged,
  onDeleted,
}: {
  order: Order;
  onChanged: () => void;
  /** Dipanggil setelah pesanan berhasil dihapus (mis. tutup dialog / navigasi). */
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [manualPayUrl, setManualPayUrl] = useState<string | null>(null);
  const [recoveredInvoiceId, setRecoveredInvoiceId] = useState("");
  const [recoveredInvoiceUrl, setRecoveredInvoiceUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingFinal, setPendingFinal] = useState<OrderStatus | null>(null);
  const [lateNote, setLateNote] = useState("");

  const FINAL_STATUSES: readonly OrderStatus[] = ["dibatalkan", "kedaluwarsa", "selesai"];

  const canReleaseDownload =
    effectiveFulfillment(order.fulfillment) === "instan" &&
    (order.status === "dibayar" ||
      order.status === "diproses" ||
      order.status === "selesai");

  const mixedServiceOrder = order.items.some((item) => item.fulfillment === "jasa") && order.items.some((item) => item.fulfillment !== "jasa");
  const canVerifyPayment =
    (Boolean(order.payment?.invoiceId) && order.payment?.status !== "dibayar") ||
    (Boolean(order.servicePayment?.invoiceId) && order.servicePayment?.status !== "dibayar");
  const canCreateInvoice =
    (mixedServiceOrder
      ? order.status !== "dibatalkan" && order.status !== "kedaluwarsa" && order.status !== "selesai" &&
        (order.payment?.status !== "dibayar" || order.servicePayment?.status !== "dibayar")
      : order.payment?.status !== "dibayar" && order.status !== "dibayar") &&
    order.status !== "dibatalkan" &&
    order.status !== "kedaluwarsa" &&
    order.status !== "selesai" &&
    order.total > 0;

  // Hapus hanya untuk status yang belum diproses (sama dengan aturan server).
  const deletableStatuses: readonly OrderStatus[] = [
    "baru",
    "menunggu_bayar",
    "menunggu_konfirmasi",
    "kedaluwarsa",
  ];
  const canDelete = deletableStatuses.includes(order.status);

  const selectableStatuses = [
    order.status,
    ...(["baru", "menunggu_bayar", "dibayar", "menunggu_konfirmasi", "diproses", "selesai", "dibatalkan", "kedaluwarsa"] as OrderStatus[]).filter(
      (s) => isTransitionAllowed(order.status, s),
    ),
  ].filter((s, i, arr) => arr.indexOf(s) === i);

  const onStatus = async (status: OrderStatus) => {
    if (status === order.status || busy) return;
    // Transisi ke status final (dibatalkan/kedaluwarsa/selesai) mengembalikan
    // kuota kupon & mengirim email — MINTА konfirmasi dulu (F-G13).
    if (FINAL_STATUSES.includes(status)) {
      setPendingFinal(status);
      return;
    }
    await applyStatus(status);
  };

  const applyStatus = async (status: OrderStatus) => {
    setBusy("status");
    try {
      await updateOrderStatusAdmin(order.id, status);
      toast.success("Status pesanan diperbarui.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status.");
    } finally {
      setBusy(null);
      setPendingFinal(null);
    }
  };

  const onResend = async () => {
    setBusy("resend");
    try {
      await resendOrderEmail(order.id);
      toast.success("Email dikirim ulang ke pembeli.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim ulang email.");
    } finally {
      setBusy(null);
    }
  };

  const onReleaseDownload = async () => {
    setBusy("fulfill");
    try {
      const res = await fulfillOrderDownload(order.id);
      if (res.downloadUrl) setDownloadUrl(res.downloadUrl);
      toast.success(`Link unduhan dibuat (${res.files ?? 0} berkas) & email dikirim ulang.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat link unduhan.");
    } finally {
      setBusy(null);
    }
  };

  const onCreateInvoice = async () => {
    setBusy("invoice");
    try {
      const res = await createOrderInvoiceManual(order.id);
      if (res.payUrl) setManualPayUrl(res.payUrl);
      toast.success(
        res.reused
          ? "Invoice yang menunggu sudah ada — tautan lama dipakai."
          : "Invoice manual dibuat. Kirim tautan ini ke pembeli.",
      );
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat invoice.");
    } finally {
      setBusy(null);
    }
  };

  const onReconcileInvoice = async (link: boolean) => {
    if (!link && !window.confirm("Pastikan Anda sudah mencari invoice ini di dashboard Mayar dan memastikan invoice TIDAK ADA. Setelah dikonfirmasi, admin dapat membuat invoice baru. Lanjutkan?")) return;
    setBusy("invoice");
    try {
      await reconcileOrderInvoice(order.id, link ? { invoiceId: recoveredInvoiceId, payUrl: recoveredInvoiceUrl } : { confirmNoInvoice: true });
      toast.success(link ? "Invoice ditautkan ke pesanan." : "Invoice tidak ditemukan; pembuatan invoice baru kini dapat dicoba.");
      setRecoveredInvoiceId("");
      setRecoveredInvoiceUrl("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rekonsiliasi gagal.");
    } finally {
      setBusy(null);
    }
  };

  const onVerifyPayment = async () => {
    setBusy("verify");
    try {
      const res = await verifyOrderInvoice(order.id);
      if (res.paid && !res.alreadyPaid) {
        toast.success(res.message ?? "Pembayaran terverifikasi. Pesanan ditandai lunas.");
      } else if (res.alreadyPaid) {
        toast.success(res.message ?? "Pesanan sudah lunas.");
      } else {
        toast.toast(res.message ?? "Pesanan belum lunas menurut Mayar.", "info");
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memverifikasi pembayaran.");
    } finally {
      setBusy(null);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(order.message);
      setCopied(true);
      toast.success("Pesan WhatsApp disalin.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin pesan.");
    }
  };

  const onResolveLatePayment = async (
    resolution: "refunded" | "handled" | "ignored",
  ) => {
    setBusy("late");
    try {
      await resolveLatePaymentAdmin(order.id, resolution, lateNote);
      toast.success("Pembayaran terlambat ditandai selesai.");
      setLateNote("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai pembayaran terlambat.");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    setBusy("delete");
    try {
      await ensureRecentAdminAuth();
      await deleteOrderAdmin(order.id);
      toast.success("Pesanan dihapus.");
      setConfirmDelete(false);
      onChanged();
      onDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pesanan.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {(downloadUrl || manualPayUrl) && (
        <div className="mb-3 flex flex-col gap-2">
          {downloadUrl && (
            <CopyField
              label="Link unduhan dibuat"
              value={downloadUrl}
              tone="emerald"
            />
          )}
          {manualPayUrl && (
            <CopyField label="Invoice manual dibuat" value={manualPayUrl} tone="primary" />
          )}
        </div>
      )}

      {order.invoiceRecovery && (order.invoiceRecovery.state === "creating" || order.invoiceRecovery.state === "orphaned") && (
        <div className="my-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-semibold">Invoice perlu rekonsiliasi ({order.invoiceRecovery.state})</p>
          <p className="mt-1">Nominal: {formatRupiah(order.invoiceRecovery.amountExpected)} · Ref: {order.invoiceRecovery.correlationId}</p>
          {order.invoiceRecovery.payUrl && <a className="mt-1 block underline" href={order.invoiceRecovery.payUrl} target="_blank" rel="noreferrer">Buka invoice tercatat</a>}
          <div className="mt-2 flex flex-wrap gap-2">
            <input aria-label="ID invoice Mayar terverifikasi" placeholder="ID invoice Mayar (opsional)" value={recoveredInvoiceId} onChange={(e) => setRecoveredInvoiceId(e.target.value)} className="rounded border px-2 py-1" />
            <input aria-label="URL invoice Mayar terverifikasi" placeholder="URL invoice (opsional)" value={recoveredInvoiceUrl} onChange={(e) => setRecoveredInvoiceUrl(e.target.value)} className="min-w-52 rounded border px-2 py-1" />
            <button type="button" disabled={busy !== null} onClick={() => void onReconcileInvoice(Boolean(recoveredInvoiceId.trim()))} className="rounded bg-amber-700 px-3 py-1 font-semibold text-white">{recoveredInvoiceId.trim() ? "Tautkan invoice terverifikasi" : "Verifikasi: invoice tidak ada"}</button>
          </div>
          <p className="mt-1">Jangan tautkan sebelum mencocokkan invoice dan nominal di Mayar.</p>
        </div>
      )}

      {order.paymentLate && !order.paymentLate.resolvedAtISO && (
        <div className="my-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <Undo2 className="h-3.5 w-3.5" />
            Pembayaran terlambat — perlu tindakan
          </p>
          <p className="mt-1">
            Diterima {formatRupiah(order.paymentLate.amount ?? 0)} setelah pesanan{" "}
            berstatus “{order.paymentLate.orderStatus ?? order.status}”. Uang sudah masuk tetapi
            status sengaja tidak ditimpa. Refund atau tangani manual, lalu tandai selesai.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              aria-label="Catatan penyelesaian pembayaran terlambat"
              placeholder="Catatan (opsional, mis. no. refund)"
              value={lateNote}
              onChange={(e) => setLateNote(e.target.value)}
              className="min-w-52 flex-1 rounded border border-rose-200 px-2 py-1"
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void onResolveLatePayment("refunded")}
              className="rounded bg-rose-700 px-3 py-1 font-semibold text-white disabled:opacity-60"
            >
              {busy === "late" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sudah direfund"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void onResolveLatePayment("handled")}
              className="rounded border border-rose-300 bg-white px-3 py-1 font-semibold text-rose-700 disabled:opacity-60"
            >
              Ditangani manual
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void onResolveLatePayment("ignored")}
              className="rounded border border-rose-200 bg-white px-3 py-1 font-semibold text-rose-600 disabled:opacity-60"
            >
              Abaikan
            </button>
          </div>
        </div>
      )}

      {order.paymentLate?.resolvedAtISO && (
        <div className="my-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <Check className="h-3.5 w-3.5" />
            Pembayaran terlambat sudah ditangani
          </p>
          <p className="mt-1">
            {order.paymentLate.resolution === "refunded"
              ? "Ditandai sudah direfund"
              : order.paymentLate.resolution === "ignored"
                ? "Ditandai diabaikan"
                : "Ditandai ditangani manual"}
            {order.paymentLate.resolvedBy ? ` oleh ${order.paymentLate.resolvedBy}` : ""} ·{" "}
            {formatDateTime(order.paymentLate.resolvedAtISO)}
            {order.paymentLate.note ? ` · ${order.paymentLate.note}` : ""}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={order.status}
          disabled={busy !== null}
          onChange={(e) => onStatus(e.target.value as OrderStatus)}
          aria-label={`Status pesanan ${shortOrderCode(order.id)}`}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-60"
        >
          {selectableStatuses.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <a
          href={waLink(order.message, order.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>

        {canCreateInvoice && (
          <button
            type="button"
            onClick={onCreateInvoice}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {busy === "invoice" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {mixedServiceOrder ? (order.payment?.status === "dibayar" ? "Invoice jasa" : "Invoice barang") : "Invoice manual"}
          </button>
        )}

        {canReleaseDownload && (
          <button
            type="button"
            onClick={onReleaseDownload}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {busy === "fulfill" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Unduhan
          </button>
        )}

        {canVerifyPayment && (
          <button
            type="button"
            onClick={onVerifyPayment}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-100 disabled:opacity-60"
          >
            {busy === "verify" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Periksa pembayaran
          </button>
        )}

        <button
          type="button"
          onClick={onResend}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          {busy === "resend" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Kirim ulang email
        </button>

        <button
          type="button"
          onClick={copyMessage}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Salin pesan
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy !== null}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
          >
            {busy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Hapus
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus pesanan ini?"
        description="Pesanan yang belum diproses dapat dihapus permanen. Bila memakai kupon, kuota akan dikembalikan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        busy={busy === "delete"}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={pendingFinal !== null}
        title={
          pendingFinal
            ? `Ubah status ke "${ORDER_STATUS_LABEL[pendingFinal]}"?`
            : "Ubah status?"
        }
        description={
          pendingFinal === "dibatalkan" || pendingFinal === "kedaluwarsa"
            ? "Status final ini mengembalikan kuota kupon (bila ada) dan mengirim email ke pembeli. Perubahan tidak dapat dibatalkan."
            : "Status final ini mengirim email ke pembeli. Perubahan tidak dapat dibatalkan."
        }
        confirmLabel="Ya, ubah status"
        busy={busy === "status"}
        onConfirm={() => pendingFinal && applyStatus(pendingFinal)}
        onCancel={() => setPendingFinal(null)}
      />
    </div>
  );
}

function CopyField({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "primary";
}) {
  const toast = useToast();
  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        tone === "emerald"
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-primary/20 bg-primary-50/60",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold tracking-wider uppercase",
          tone === "emerald" ? "text-emerald-700" : "text-primary",
        )}
      >
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-secondary"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value).then(
              () => toast.success("Disalin."),
              () => toast.error("Gagal menyalin."),
            );
          }}
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:text-primary"
        >
          Salin
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-secondary">{value}</dd>
    </div>
  );
}

function emailBadge(status?: string) {
  if (!status) return <span className="text-xs text-muted">Belum dikirim</span>;
  const map: Record<string, string> = {
    sent: "bg-emerald-50 text-emerald-600",
    delivered: "bg-emerald-50 text-emerald-600",
    delivery_delayed: "bg-amber-50 text-amber-600",
    skipped: "bg-slate-100 text-slate-500",
    failed: "bg-rose-50 text-rose-600",
    bounced: "bg-rose-50 text-rose-600",
    complained: "bg-amber-50 text-amber-600",
  };
  const label: Record<string, string> = {
    sent: "Terkirim",
    delivered: "Diterima",
    delivery_delayed: "Tertunda",
    skipped: "Dilewati",
    failed: "Gagal",
    bounced: "Pantul",
    complained: "Ditandai spam",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        map[status] ?? "bg-slate-100 text-slate-500",
      )}
    >
      {label[status] ?? status}
    </span>
  );
}

function EmailStatusBlock({ order }: { order: Order }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-3">
        <p className="text-[11px] text-muted">Email konfirmasi</p>
        <div className="mt-1">{emailBadge(order.confirmationEmailStatus)}</div>
        {order.confirmationEmailAt && (
          <p className="mt-1 text-[10px] text-muted">
            {formatDateTime(order.confirmationEmailAt)}
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-3">
        <p className="text-[11px] text-muted">Email update status</p>
        <div className="mt-1">{emailBadge(order.lastStatusEmailStatus)}</div>
        {order.lastStatusEmailAt && (
          <p className="mt-1 text-[10px] text-muted">
            {formatDateTime(order.lastStatusEmailAt)}
          </p>
        )}
      </div>
    </div>
  );
}

function EmailHistory({
  emails,
  error,
}: {
  emails: OrderEmailLog[] | null;
  error?: boolean;
}) {
  if (emails === null) {
    return (
      <p className="mt-2 flex items-center gap-2 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Memuat riwayat email...
      </p>
    );
  }
  if (error) {
    return (
      <p className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
        Gagal memuat riwayat email.
      </p>
    );
  }
  if (emails.length === 0) {
    return (
      <p className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-3 text-xs text-muted">
        Belum ada riwayat email untuk pesanan ini.
      </p>
    );
  }
  return (
    <ul className="mt-2 flex flex-col divide-y divide-slate-100">
      {emails.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-secondary capitalize">
              {e.kind === "resend" ? "Kirim ulang" : e.kind}
            </p>
            <p className="truncate text-[11px] text-muted">{e.to}</p>
          </div>
          <div className="shrink-0 text-right">
            {emailBadge(e.status)}
            <p className="mt-0.5 text-[10px] text-muted">{formatDateTime(e.atISO)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
