"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { fetchUserDetail, setUserBlocked } from "@/lib/admin-users-api";
import type { UserProfile } from "@/lib/user-types";
import type { Order, OrderStatus } from "@/lib/order-types";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE } from "@/lib/order-types";
import { formatRupiah, formatDateTime, shortOrderCode } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { useToast } from "@/components/admin/toast";
import { cn } from "@/lib/utils";

/**
 * Dialog detail user + riwayat pesanan.
 * Memuat data via `/api/admin/users/[uid]` saat dibuka.
 */
export function UserDetailDialog({
  uid,
  onClose,
  onChanged,
}: {
  uid: string;
  onClose: () => void;
  /** Dipanggil setelah aksi yang mengubah data (mis. blokir) → refresh list induk. */
  onChanged?: () => void;
}) {
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchUserDetail(uid);
        if (!active) return;
        setUser(data.user);
        setOrders(data.orders);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat detail.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  // Escape menutup dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);

  const onToggleBlock = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await setUserBlocked(user.uid, !user.blocked);
      setUser({ ...user, blocked: !user.blocked });
      toast.success(user.blocked ? "Blokir dibuka." : "User diblokir.");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[12000] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Detail pengguna"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-secondary">Detail Pengguna</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              Memuat…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
              {error}
            </div>
          ) : user ? (
            <div className="flex flex-col gap-6">
              {/* Profil */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-xl font-bold text-white">
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-base font-bold text-secondary">
                    {user.displayName || "(Tanpa nama)"}
                    {user.blocked && (
                      <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                        Diblokir
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {user.email}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Login via {user.provider}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoItem
                  icon={Phone}
                  label="WhatsApp"
                  value={
                    user.whatsapp ? (
                      <a
                        href={waLink(undefined, user.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {user.whatsapp}
                      </a>
                    ) : (
                      "Belum diisi"
                    )
                  }
                />
                <InfoItem
                  icon={ShoppingBag}
                  label="Jumlah Pesanan"
                  value={`${orders.length}`}
                />
                <InfoItem
                  icon={ShoppingBag}
                  label="Total Belanja"
                  value={orders.length > 0 ? formatRupiah(totalSpent) : "—"}
                />
                <InfoItem
                  icon={ShieldCheck}
                  label="Terdaftar"
                  value={user.createdAt ? formatDateTime(user.createdAt) : "—"}
                />
                <InfoItem
                  icon={ShieldCheck}
                  label="Login Terakhir"
                  value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}
                />
              </dl>

              {/* Riwayat pesanan */}
              <div>
                <h3 className="text-sm font-bold text-secondary">
                  Riwayat Pesanan
                </h3>
                {orders.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-surface py-6 text-center text-xs text-muted">
                    Belum ada pesanan.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {orders.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-muted">
                            {formatDateTime(o.createdAt)} ·{" "}
                            {shortOrderCode(o.id)}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-secondary">
                            {formatRupiah(o.total)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                            ORDER_STATUS_STYLE[o.status as OrderStatus],
                          )}
                        >
                          {ORDER_STATUS_LABEL[o.status as OrderStatus]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {user && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              onClick={onToggleBlock}
              disabled={busy}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
                user.blocked
                  ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  : "border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-600",
              )}
            >
              {user.blocked ? (
                <>
                  <ShieldCheck className="h-4 w-4" /> Buka Blokir
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" /> Blokir User
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-surface p-3.5">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-secondary break-words">
        {value}
      </dd>
    </div>
  );
}
