"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
} from "lucide-react";
import {
  createCoupon,
  deleteCoupon,
  exportCouponsToCsv,
  fetchCoupons,
  fetchCouponsSummary,
  fetchCouponStats,
  restoreCoupon,
  updateCoupon,
  type CouponFormInput,
  type CouponStat,
} from "@/lib/admin-coupons-api";
import {
  COUPON_TYPE_LABEL,
  type Coupon,
  type CouponType,
  type CouponsSummary,
} from "@/lib/coupon-types";
import { formatRupiah } from "@/lib/format";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

const EMPTY_FORM: CouponFormInput = {
  code: "",
  description: "",
  type: "percent",
  value: 10,
  minSpend: 0,
  maxDiscount: undefined,
  startsAt: "",
  endsAt: "",
  usageLimit: undefined,
  limitPerUser: 1,
  active: true,
};

/** ISO → nilai input datetime-local (yyyy-MM-ddTHH:mm). */
function isoToLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Nilai input datetime-local → ISO (kosong = undefined). */
function localToIso(local?: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function CouponsManager() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [summary, setSummary] = useState<CouponsSummary | null>(null);
  const [stats, setStats] = useState<Record<string, CouponStat>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [list, sum] = await Promise.all([
          fetchCoupons(),
          fetchCouponsSummary().catch(() => null),
        ]);
        if (!active) return;
        setCoupons(list);
        if (sum) setSummary(sum);
        // Statistik per-kupon dimuat terpisah (dihitung dari pesanan).
        fetchCouponStats()
          .then((s) => {
            if (active) setStats(s);
          })
          .catch(() => {});
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat kupon.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coupons.filter((c) => {
      if (showArchived ? !c.archived : c.archived) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [coupons, query, showArchived]);

  const archivedCount = useMemo(
    () => coupons.filter((c) => c.archived).length,
    [coupons],
  );

  const onExport = () => {
    if (filtered.length === 0) {
      toast.error("Tidak ada kupon untuk diekspor.");
      return;
    }
    exportCouponsToCsv(filtered, stats);
    toast.success(`${filtered.length} kupon diekspor ke CSV.`);
  };

  const onToggleActive = async (coupon: Coupon) => {
    setBusyId(coupon.id);
    try {
      const updated = await updateCoupon(coupon.id, { active: !coupon.active });
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? updated : c)));
      toast.success(updated.active ? "Kupon diaktifkan." : "Kupon dinonaktifkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCoupon(toDelete.id);
      toast.success("Kupon diarsipkan.");
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kupon.");
    } finally {
      setDeleting(false);
    }
  };

  const onRestore = async (coupon: Coupon) => {
    setBusyId(coupon.id);
    try {
      await restoreCoupon(coupon.id);
      toast.success("Kupon dipulihkan.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulihkan.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Statistik */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Kupon" value={summary?.total ?? 0} icon={Ticket} accent="bg-primary-50 text-primary" />
        <StatCard label="Aktif" value={summary?.active ?? 0} icon={BadgePercent} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Total Pemakaian" value={summary?.totalUsage ?? 0} icon={RefreshCw} accent="bg-amber-50 text-amber-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode atau deskripsi…"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {archivedCount > 0 && (
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-secondary">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              Arsip ({archivedCount})
            </label>
          )}
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
          <button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            Buat Kupon
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
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Memuat kupon…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface text-muted">
            <Ticket className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-secondary">
            {query ? "Kupon tak ditemukan." : "Belum ada kupon."}
          </p>
          <p className="mt-1 text-xs text-muted">
            {query
              ? "Coba kata kunci lain."
              : "Klik “Buat Kupon” untuk membuat kode promo pertama."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => {
            const stat = stats[c.id] ?? stats[`code:${c.code}`];
            return (
            <li
              key={c.id}
              className={cn(
                "rounded-2xl border bg-white p-4",
                c.archived
                  ? "border-slate-200 opacity-80"
                  : c.active
                    ? "border-slate-200"
                    : "border-slate-200 opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-secondary px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-white">
                      {c.code}
                    </span>
                    {c.archived ? (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        Diarsipkan
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          c.active
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {c.active ? "Aktif" : "Nonaktif"}
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-2 text-xs text-muted">{c.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-primary">
                    {c.type === "percent" ? `${c.value}%` : formatRupiah(c.value)}
                  </p>
                  <p className="text-[10px] text-muted">
                    {COUPON_TYPE_LABEL[c.type]}
                  </p>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] sm:grid-cols-3">
                <Info label="Min. belanja" value={c.minSpend > 0 ? formatRupiah(c.minSpend) : "—"} />
                <Info
                  label="Maks. diskon"
                  value={c.type === "percent" && c.maxDiscount ? formatRupiah(c.maxDiscount) : "—"}
                />
                <Info
                  label="Kuota"
                  value={`${c.usageCount}/${c.usageLimit ?? "∞"}`}
                />
                <Info label="Per user" value={`${c.limitPerUser}×`} />
                <Info label="Mulai" value={c.startsAt ? isoToLocal(c.startsAt).replace("T", " ") : "—"} />
                <Info label="Berakhir" value={c.endsAt ? isoToLocal(c.endsAt).replace("T", " ") : "—"} />
              </dl>

              {/* Dampak pemakaian (`KP-M2`) */}
              <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 rounded-xl bg-surface px-3 py-2 text-[11px]">
                <Info label="Order" value={String(stat?.orderCount ?? 0)} />
                <Info
                  label="Σ diskon"
                  value={formatRupiah(stat?.totalDiscount ?? 0)}
                />
                <Info
                  label="Dibatalkan"
                  value={String(stat?.cancelledOrders ?? 0)}
                />
              </dl>

              <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                {c.archived ? (
                  <button
                    onClick={() => onRestore(c)}
                    disabled={busyId === c.id}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                  >
                    Pulihkan
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onToggleActive(c)}
                      disabled={busyId === c.id}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                    >
                      {c.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => {
                        setCreating(false);
                        setEditing(c);
                      }}
                      aria-label="Edit kupon"
                      className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setToDelete(c)}
                      aria-label="Arsipkan kupon"
                      className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {(creating || editing) && (
        <CouponFormDialog
          coupon={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Arsipkan kupon ini?"
        description={
          toDelete
            ? `Kupon "${toDelete.code}" akan diarsipkan (tidak dihapus permanen). Pemakaian yang sudah tercatat di pesanan tetap tersimpan, dan kupon bisa dipulihkan.`
            : undefined
        }
        confirmLabel="Arsipkan"
        busy={deleting}
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Ticket;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <span className={cn("grid h-10 w-10 place-items-center rounded-xl", accent)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-secondary tabular-nums">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-secondary">{value}</dd>
    </div>
  );
}

/** Form buat/edit kupon (dialog). */
function CouponFormDialog({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: Coupon | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = Boolean(coupon);
  const [form, setForm] = useState<CouponFormInput>(() =>
    coupon
      ? {
          code: coupon.code,
          description: coupon.description ?? "",
          type: coupon.type,
          value: coupon.value,
          minSpend: coupon.minSpend,
          maxDiscount: coupon.maxDiscount,
          startsAt: isoToLocal(coupon.startsAt),
          endsAt: isoToLocal(coupon.endsAt),
          usageLimit: coupon.usageLimit,
          limitPerUser: coupon.limitPerUser,
          active: coupon.active,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof CouponFormInput>(k: K, v: CouponFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.code.trim().length < 3) {
      setError("Kode kupon minimal 3 karakter.");
      return;
    }
    setSaving(true);
    try {
      const payload: CouponFormInput = {
        ...form,
        code: form.code.trim().toUpperCase(),
        startsAt: localToIso(form.startsAt),
        endsAt: localToIso(form.endsAt),
        maxDiscount:
          form.type === "percent" && form.maxDiscount ? form.maxDiscount : undefined,
      };
      if (isEdit && coupon) {
        await updateCoupon(coupon.id, payload);
        toast.success("Kupon diperbarui.");
      } else {
        await createCoupon(payload);
        toast.success("Kupon dibuat.");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kupon.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "text-xs font-semibold text-secondary";

  return (
    <div
      className="fixed inset-0 z-[12000] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Edit kupon" : "Buat kupon"}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        onSubmit={submit}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-secondary">
            {isEdit ? "Edit Kupon" : "Buat Kupon"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted hover:text-secondary"
          >
            Tutup
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelCls}>Kode Kupon</span>
              <input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="PROMO10"
                className={cn(field, "font-mono tracking-wide")}
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={labelCls}>Deskripsi (opsional)</span>
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Diskon launching"
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Jenis</span>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as CouponType)}
                className={field}
              >
                <option value="percent">Persen (%)</option>
                <option value="amount">Nominal (Rp)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>
                {form.type === "percent" ? "Diskon (%)" : "Diskon (Rp)"}
              </span>
              <input
                type="number"
                min={0}
                max={form.type === "percent" ? 100 : undefined}
                value={form.value}
                onChange={(e) => set("value", Number(e.target.value))}
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Min. Belanja (Rp)</span>
              <input
                type="number"
                min={0}
                value={form.minSpend}
                onChange={(e) => set("minSpend", Number(e.target.value))}
                className={field}
              />
            </label>

            {form.type === "percent" && (
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Maks. Diskon (Rp, opsional)</span>
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscount ?? ""}
                  onChange={(e) =>
                    set("maxDiscount", e.target.value ? Number(e.target.value) : undefined)
                  }
                  className={field}
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Mulai (opsional)</span>
              <input
                type="datetime-local"
                value={form.startsAt ?? ""}
                onChange={(e) => set("startsAt", e.target.value)}
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Berakhir (opsional)</span>
              <input
                type="datetime-local"
                value={form.endsAt ?? ""}
                onChange={(e) => set("endsAt", e.target.value)}
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Kuota Total (kosong = ∞)</span>
              <input
                type="number"
                min={0}
                value={form.usageLimit ?? ""}
                onChange={(e) =>
                  set("usageLimit", e.target.value ? Number(e.target.value) : undefined)
                }
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>Batas per User</span>
              <input
                type="number"
                min={1}
                value={form.limitPerUser ?? 1}
                onChange={(e) => set("limitPerUser", Math.max(1, Number(e.target.value)))}
                className={field}
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            Aktifkan kupon ini
          </label>

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Buat Kupon"}
          </button>
        </div>
      </form>
    </div>
  );
}
