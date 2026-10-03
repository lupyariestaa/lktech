"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  Copy,
  Download,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import {
  deleteUser,
  exportUsersToCsv,
  fetchUsers,
  fetchUsersSummary,
  setUserBlocked,
  type UsersFilter,
} from "@/lib/admin-users-api";
import type { AdminUserRow, AdminUsersSummary } from "@/lib/user-types";
import { waLink } from "@/lib/whatsapp";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { UserDetailDialog } from "@/components/admin/user-detail-dialog";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 100;

/** Debounce sederhana untuk pencarian. */
function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function UsersManager() {
  const toast = useToast();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UsersFilter>("semua");
  const [reloadKey, setReloadKey] = useState(0);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedQuery = useDebounced(query);

  // Ambil data (list + summary) saat filter/pencarian/reload berubah.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [list, sum] = await Promise.all([
          fetchUsers({ q: debouncedQuery, filter, limit: PAGE_LIMIT }),
          fetchUsersSummary().catch(() => null),
        ]);
        if (!active) return;
        setUsers(list);
        if (sum) setSummary(sum);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat pengguna.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedQuery, filter, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const onExport = () => {
    if (users.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }
    exportUsersToCsv(users);
    toast.success(`${users.length} pengguna diekspor ke CSV.`);
  };

  const onToggleBlock = async (user: AdminUserRow) => {
    setBusyId(user.uid);
    try {
      await setUserBlocked(user.uid, !user.blocked);
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid ? { ...u, blocked: !u.blocked } : u,
        ),
      );
      toast.success(user.blocked ? "User dibuka blokirnya." : "User diblokir.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui user.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteUser(toDelete.uid);
      setUsers((prev) => prev.filter((u) => u.uid !== toDelete.uid));
      toast.success("User dihapus.");
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus user.");
    } finally {
      setDeleting(false);
    }
  };

  const cards = useMemo(
    () => [
      { label: "Total Pengguna", value: summary?.total ?? 0, accent: "bg-primary-50 text-primary", icon: Users },
      { label: "Baru (30 hari)", value: summary?.newLast30Days ?? 0, accent: "bg-blue-50 text-blue-600", icon: UserRound },
      { label: "Sudah Pesan", value: summary?.withOrders ?? 0, accent: "bg-emerald-50 text-emerald-600", icon: ShieldCheck },
      { label: "Belum Pesan", value: summary?.withoutOrders ?? 0, accent: "bg-amber-50 text-amber-600", icon: AlertCircle },
    ],
    [summary],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Kartu statistik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl", c.accent)}>
              <c.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-xs font-medium text-muted">{c.label}</p>
            <p className="mt-0.5 text-2xl font-bold text-secondary tabular-nums">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, atau WhatsApp…"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div
          role="group"
          aria-label="Filter status pesanan"
          className="flex items-center rounded-full border border-slate-200 bg-white p-1"
        >
          {(
            [
              { key: "semua", label: "Semua" },
              { key: "sudah", label: "Sudah Pesan" },
              { key: "belum", label: "Belum Pesan" },
            ] as { key: UsersFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === f.key
                  ? "bg-primary text-white"
                  : "text-slate-500 hover:text-secondary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={refresh}
            aria-label="Muat ulang"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Download className="h-4 w-4" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* Konten */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
          {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          Memuat pengguna…
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface text-muted">
            <Users className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-secondary">
            Tidak ada pengguna.
          </p>
          <p className="mt-1 text-xs text-muted">
            {query || filter !== "semua"
              ? "Coba ubah kata kunci atau filter."
              : "Belum ada user yang login di website."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Pengguna</th>
                  <th scope="col" className="px-4 py-3 font-semibold">WhatsApp</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Terdaftar</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Login Terakhir</th>
                  <th scope="col" className="px-4 py-3 text-center font-semibold">Pesanan</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Total Belanja</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.uid}
                    className={cn(
                      "border-t border-slate-100",
                      i % 2 === 1 && "bg-surface/50",
                    )}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailId(u.uid)}
                        className="flex items-center gap-3 text-left"
                      >
                        <UserAvatar user={u} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-secondary">
                            {u.displayName}
                            {u.blocked && (
                              <span className="ml-1.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">
                                Diblokir
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {u.email}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <WhatsappCell whatsapp={u.whatsapp} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {u.createdAt ? formatDateTime(u.createdAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-secondary tabular-nums">
                      {u.orderCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {u.totalSpent > 0 ? formatRupiah(u.totalSpent) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          u.hasOrders
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {u.hasOrders ? "Sudah pesan" : "Belum pesan"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RowActions
                        user={u}
                        busy={busyId === u.uid}
                        onDetail={() => setDetailId(u.uid)}
                        onToggleBlock={() => onToggleBlock(u)}
                        onDelete={() => setToDelete(u)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: kartu */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {users.map((u) => (
              <li
                key={u.uid}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar user={u} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-secondary">
                      {u.displayName}
                      {u.blocked && (
                        <span className="ml-1.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">
                          Diblokir
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      u.hasOrders
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {u.hasOrders ? "Sudah pesan" : "Belum"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted">
                    WhatsApp:{" "}
                    <span className="font-medium text-secondary">
                      {u.whatsapp || "—"}
                    </span>
                  </div>
                  <div className="text-muted">
                    Pesanan:{" "}
                    <span className="font-medium text-secondary">
                      {u.orderCount}
                    </span>
                  </div>
                  <div className="text-muted">
                    Belanja:{" "}
                    <span className="font-medium text-secondary">
                      {u.totalSpent > 0 ? formatRupiah(u.totalSpent) : "—"}
                    </span>
                  </div>
                  <div className="text-muted">
                    Daftar:{" "}
                    <span className="font-medium text-secondary">
                      {u.createdAt ? formatDateTime(u.createdAt) : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <WhatsappCell whatsapp={u.whatsapp} compact />
                  <RowActions
                    user={u}
                    busy={busyId === u.uid}
                    onDetail={() => setDetailId(u.uid)}
                    onToggleBlock={() => onToggleBlock(u)}
                    onDelete={() => setToDelete(u)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Detail user */}
      {detailId && (
        <UserDetailDialog
          uid={detailId}
          onClose={() => setDetailId(null)}
          onChanged={refresh}
        />
      )}

      {/* Hapus user */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Hapus pengguna ini?"
        description={
          toDelete
            ? `Data profil "${toDelete.displayName}" (${toDelete.email}) akan dihapus. Pesanannya tetap tersimpan di daftar Pesanan.`
            : undefined
        }
        confirmLabel="Hapus"
        busy={deleting}
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/** Avatar user (foto Google atau inisial). */
function UserAvatar({ user }: { user: AdminUserRow }) {
  if (user.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoURL}
        alt={user.displayName}
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initial = (user.displayName || user.email || "U").charAt(0).toUpperCase();
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-light text-sm font-bold text-white">
      {initial}
    </span>
  );
}

/** Sel nomor WhatsApp (link wa.me + tombol salin). */
function WhatsappCell({
  whatsapp,
  compact = false,
}: {
  whatsapp: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!whatsapp) {
    return <span className={compact ? "text-xs text-muted" : "text-xs text-muted"}>—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <a
        href={waLink(undefined, whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        title="Chat WhatsApp"
      >
        <Phone className="h-3.5 w-3.5" />
        {whatsapp}
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(whatsapp);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard tak tersedia */
          }
        }}
        aria-label="Salin nomor WhatsApp"
        className="grid h-6 w-6 place-items-center rounded-full text-slate-400 transition-colors hover:text-primary"
      >
        {copied ? (
          <span className="text-[10px] font-bold text-emerald-500">OK</span>
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
}

/** Tombol aksi baris (detail, blokir, hapus). */
function RowActions({
  user,
  busy,
  onDetail,
  onToggleBlock,
  onDelete,
}: {
  user: AdminUserRow;
  busy: boolean;
  onDetail: () => void;
  onToggleBlock: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={onDetail}
        aria-label="Lihat detail"
        className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
      >
        <UserRound className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggleBlock}
        disabled={busy}
        aria-label={user.blocked ? "Buka blokir" : "Blokir user"}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full border transition-colors disabled:opacity-50",
          user.blocked
            ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            : "border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600",
        )}
      >
        {user.blocked ? (
          <ShieldCheck className="h-3.5 w-3.5" />
        ) : (
          <Ban className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        onClick={onDelete}
        disabled={busy}
        aria-label="Hapus user"
        className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
