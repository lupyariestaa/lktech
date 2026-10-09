"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteReviewAdmin,
  fetchAllReviews,
  fetchReviewsSummary,
  moderateReviewAdmin,
} from "@/lib/admin-reviews-api";
import { importTamanFromReview } from "@/lib/admin-api";
import {
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_STYLE,
  type Review,
  type ReviewStatus,
} from "@/lib/review-types";
import type { ReviewsSummary } from "@/lib/reviews";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

/** Kartu metrik ringkas. */
const SUMMARY_CARDS: Array<{ key: keyof ReviewsSummary; label: string; accent: string }> = [
  { key: "total", label: "Total Ulasan", accent: "bg-primary-50 text-primary" },
  { key: "pending", label: "Menunggu Moderasi", accent: "bg-amber-50 text-amber-600" },
  { key: "approved", label: "Disetujui", accent: "bg-emerald-50 text-emerald-600" },
  { key: "avgRating", label: "Rata-rata Rating", accent: "bg-purple-50 text-purple-600" },
];

export function ReviewsManager() {
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewStatus | "semua">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [toDelete, setToDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [list, sum] = await Promise.all([
          fetchAllReviews(filter),
          fetchReviewsSummary().catch(() => null),
        ]);
        if (!active) return;
        setReviews(list);
        if (sum) setSummary(sum);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat ulasan.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  /** Angkat ulasan jadi draft testimoni taman (T6). Server menentukan aturannya. */
  const onImportTaman = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await importTamanFromReview(id);
      toast.success("Diangkat jadi draft testimoni. Lengkapi persetujuan di Taman Testimoni.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengangkat ulasan.");
    } finally {
      setBusyId(null);
    }
  };

  const onModerate = async (id: string, status: "approved" | "rejected") => {
    if (busyId) return;
    setBusyId(id);
    const prev = reviews;
    try {
      await moderateReviewAdmin(id, status);
      toast.success(
        status === "approved" ? "Ulasan disetujui." : "Ulasan ditolak.",
      );
      // Muat ulang daftar sesuai filter + ringkasan.
      const [list, sum] = await Promise.all([
        fetchAllReviews(filter),
        fetchReviewsSummary().catch(() => null),
      ]);
      setReviews(list);
      if (sum) setSummary(sum);
    } catch (err) {
      setReviews(prev);
      toast.error(err instanceof Error ? err.message : "Gagal memoderasi.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    try {
      await deleteReviewAdmin(target.id);
      setReviews((rs) => rs.filter((r) => r.id !== target.id));
      setToDelete(null);
      toast.success("Ulasan dihapus.");
      fetchReviewsSummary().then(setSummary).catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredNote = useMemo(() => {
    if (!summary) return null;
    return `${summary.total} ulasan · ${summary.pending} menunggu`;
  }, [summary]);

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
                <Star className="h-4 w-4" />
              </span>
              <p className="mt-3 text-lg font-bold text-secondary">
                {c.key === "avgRating"
                  ? summary.avgRating > 0
                    ? summary.avgRating.toFixed(1)
                    : "—"
                  : summary[c.key]}
              </p>
              <p className="mt-0.5 text-xs text-muted">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ReviewStatus | "semua")}
          aria-label="Filter status ulasan"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          <option value="pending">Menunggu moderasi</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="semua">Semua</option>
        </select>

        <button
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Muat ulang
        </button>

        {filteredNote && <p className="text-xs text-muted">{filteredNote}</p>}
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
          <span className="text-sm">Memuat ulasan...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            Tidak ada ulasan pada filter ini.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-secondary">
                    {r.productName || r.productSlug}
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {r.rating}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {r.buyerName} · {formatDateTime(r.createdAtISO)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    REVIEW_STATUS_STYLE[r.status],
                  )}
                >
                  {REVIEW_STATUS_LABEL[r.status]}
                </span>
              </div>

              {r.title && (
                <p className="mt-3 text-sm font-semibold text-secondary">
                  {r.title}
                </p>
              )}
              {r.body && (
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                  {r.body}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <a
                  href={`/produk/${r.productSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Lihat produk
                </a>

                {r.status !== "approved" && (
                  <button
                    onClick={() => onModerate(r.id, "approved")}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {busyId === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Setujui
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => onModerate(r.id, "rejected")}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" />
                    Tolak
                  </button>
                )}
                {r.status === "approved" && r.rating >= 4 && (
                  <button
                    onClick={() => onImportTaman(r.id)}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-50 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Angkat jadi testimoni
                  </button>
                )}
                <button
                  onClick={() => setToDelete(r)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus ulasan ini?"
        description={`Ulasan "${
          toDelete?.title || toDelete?.body?.slice(0, 40) || toDelete?.productName
        }" akan dihapus permanen dan agregat rating produk dihitung ulang.`}
        confirmLabel="Hapus"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
