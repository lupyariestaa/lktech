"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, RefreshCw, Ticket } from "lucide-react";
import {
  deleteCoupon,
  duplicateCouponRequest,
  exportCouponsToCsv,
  fetchCampaignAnalytics,
  fetchCoupons,
  fetchCouponsSummary,
  fetchCouponStats,
  restoreCoupon,
  updateCoupon,
  type CouponStat,
} from "@/lib/admin-coupons-api";
import type { CampaignGlobalStat } from "@/lib/coupon-analytics-pure";
import type { Coupon, CouponsSummary } from "@/lib/coupon-types";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CouponsToolbar } from "@/components/admin/coupons/coupons-toolbar";
import { CouponCard } from "@/components/admin/coupons/coupon-card";
import { CampaignSummary } from "@/components/admin/coupons/campaign-summary";
import { CouponFormDialog } from "@/components/admin/coupons/coupon-form-dialog";
import { BatchDialog } from "@/components/admin/coupons/coupon-batch-dialog";
import { cn } from "@/lib/utils";

export function CouponsManager() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [summary, setSummary] = useState<CouponsSummary | null>(null);
  const [stats, setStats] = useState<Record<string, CouponStat>>({});
  const [campaignStats, setCampaignStats] = useState<CampaignGlobalStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<string>("semua");
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
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
        fetchCouponStats()
          .then((s) => active && setStats(s))
          .catch(() => {});
        fetchCampaignAnalytics(30)
          .then((c) => active && setCampaignStats(c))
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
      if (campaignFilter !== "semua") {
        const camp = c.campaign?.trim() || "";
        if (campaignFilter === "__none__" ? camp !== "" : camp !== campaignFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        (c.campaign ?? "").toLowerCase().includes(q)
      );
    });
  }, [coupons, query, showArchived, campaignFilter]);

  // Daftar kampanye unik (untuk filter) dari kupon non-arsip.
  const campaigns = useMemo(() => {
    const set = new Set<string>();
    let hasNone = false;
    for (const c of coupons) {
      if (c.archived) continue;
      const camp = c.campaign?.trim();
      if (camp) set.add(camp);
      else hasNone = true;
    }
    return { list: Array.from(set).sort((a, b) => a.localeCompare(b)), hasNone };
  }, [coupons]);

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

  const onDuplicate = async (coupon: Coupon) => {
    setBusyId(coupon.id);
    try {
      const copy = await duplicateCouponRequest(coupon.id);
      toast.success(`Kupon diduplikat sebagai ${copy.code} (nonaktif).`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menduplikat.");
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

      <CampaignSummary campaigns={campaignStats} />

      <CouponsToolbar
        query={query}
        onQuery={setQuery}
        campaignFilter={campaignFilter}
        onCampaignFilter={setCampaignFilter}
        campaigns={campaigns}
        showArchived={showArchived}
        onShowArchived={setShowArchived}
        archivedCount={archivedCount}
        loading={loading}
        onRefresh={refresh}
        onExport={onExport}
        onCreate={() => {
          setEditing(null);
          setCreating(true);
        }}
        onBatch={() => setBatchOpen(true)}
      />

      {/* Konten */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
          {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
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
          {filtered.map((c) => (
            <CouponCard
              key={c.id}
              coupon={c}
              stat={stats[c.id] ?? stats[`code:${c.code}`]}
              busy={busyId === c.id}
              onToggleActive={onToggleActive}
              onEdit={(x) => {
                setCreating(false);
                setEditing(x);
              }}
              onArchive={setToDelete}
              onRestore={onRestore}
              onDuplicate={onDuplicate}
            />
          ))}
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

      {batchOpen && (
        <BatchDialog
          onClose={() => setBatchOpen(false)}
          onSaved={() => {
            setBatchOpen(false);
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
