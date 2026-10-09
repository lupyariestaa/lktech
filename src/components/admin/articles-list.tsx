"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ArrowRight,
  Copy,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ARTICLE_CATEGORIES, type StoredArticle } from "@/lib/article-types";
import {
  MANAGE_STATUS_LABEL,
  bulkConfirmText,
  manageStatus,
  matchesManageFilter,
  type BulkAction,
  type ManageFilter,
  type ManageStatus,
} from "@/lib/article-manage";
import { cn } from "@/lib/utils";

/** Jumlah baris per halaman di list (muat lebih banyak). */
const PAGE = 15;

const STATUS_TONE: Record<ManageStatus, string> = {
  draft: "bg-amber-50 text-amber-600",
  published: "bg-emerald-50 text-emerald-600",
  terjadwal: "bg-sky-50 text-sky-600",
};

const STATUS_FILTERS: Array<ManageStatus | "semua"> = ["semua", "published", "terjadwal", "draft"];

/**
 * Daftar artikel di dashboard: pencarian, filter (disimpan di URL agar bisa
 * dibagikan), pilih banyak untuk aksi massal, duplikat, dan muat lebih banyak.
 */
export function ArticlesList({
  items,
  loading,
  onEdit,
  onDelete,
  onDuplicate,
  onBulk,
  onRefreshRequest,
}: {
  items: StoredArticle[];
  loading: boolean;
  onEdit: (a: StoredArticle) => void;
  onDelete: (a: StoredArticle) => void;
  onDuplicate: (a: StoredArticle) => void;
  onBulk: (action: BulkAction, slugs: string[]) => Promise<void>;
  onRefreshRequest: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const filter: ManageFilter = {
    q: sp.get("q") ?? "",
    status: (sp.get("status") as ManageFilter["status"]) ?? "semua",
    category: sp.get("kategori") ?? "semua",
    tag: sp.get("tag") ?? "",
  };

  /** Ubah satu parameter URL tanpa menghapus yang lain. */
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value && value !== "semua") next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // Pencarian: state lokal (ketik lancar), URL diperbarui setelah jeda singkat.
  const [qDraft, setQDraft] = useState(filter.q ?? "");
  useEffect(() => {
    const t = window.setTimeout(() => {
      const current = new URLSearchParams(window.location.search).get("q") ?? "";
      if (qDraft !== current) setParam("q", qDraft);
    }, 300);
    return () => window.clearTimeout(t);
    // setParam stabil per render cukup; hanya bereaksi pada perubahan ketikan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingBulk, setPendingBulk] = useState<BulkAction | null>(null);
  const [busy, setBusy] = useState(false);

  // Waktu acuan status (terjadwal/terbit) diambil saat mount, agar render tetap murni.
  const [now] = useState(() => Date.now());
  const filtered = items.filter((a) => matchesManageFilter(a, filter, now));
  const visible = filtered.slice(0, limit);

  // Pilihan yang sudah tidak terlihat (karena filter berubah) tidak ikut aksi massal.
  const visibleSlugs = new Set(filtered.map((a) => a.slug));
  const selectedVisible = [...selected].filter((s) => visibleSlugs.has(s));

  const toggle = (slug: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((a) => selected.has(a.slug));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((a) => next.delete(a.slug));
      else visible.forEach((a) => next.add(a.slug));
      return next;
    });

  const runBulk = async () => {
    if (!pendingBulk || selectedVisible.length === 0) return;
    setBusy(true);
    try {
      await onBulk(pendingBulk, selectedVisible);
      setSelected(new Set());
    } finally {
      setBusy(false);
      setPendingBulk(null);
    }
  };

  const hasFilter = Boolean(filter.q || filter.status !== "semua" || filter.category !== "semua" || filter.tag);

  return (
    <div>
      {/* Filter */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Cari judul, slug, tag, kategori..."
            aria-label="Cari artikel"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </div>

        <div role="group" aria-label="Filter status" className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setParam("status", s)}
              aria-pressed={filter.status === s}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                filter.status === s ? "bg-primary text-white" : "text-slate-500 hover:text-secondary",
              )}
            >
              {s === "semua" ? "Semua" : MANAGE_STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <select
          value={filter.category}
          onChange={(e) => setParam("kategori", e.target.value)}
          aria-label="Filter kategori"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          <option value="semua">Semua kategori</option>
          {ARTICLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {filter.tag && (
          <button
            type="button"
            onClick={() => setParam("tag", "")}
            className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-2 text-xs font-semibold text-primary"
          >
            Tag: {filter.tag}
            <X className="h-3 w-3" />
          </button>
        )}
        {hasFilter && (
          <button
            type="button"
            onClick={() => router.replace(pathname, { scroll: false })}
            className="text-xs font-semibold text-slate-500 hover:text-secondary"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Ringkasan & aksi massal */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAll}
              aria-label="Pilih semua yang tampil"
              disabled={visible.length === 0}
            />
            Pilih semua
          </label>
          <p className="text-sm text-muted" aria-live="polite">
            {filtered.length} artikel{hasFilter ? " (terfilter)" : ""}
            {selectedVisible.length > 0 && ` · ${selectedVisible.length} dipilih`}
          </p>
        </div>

        {selectedVisible.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPendingBulk("publish")} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-secondary hover:border-primary/40 hover:text-primary">
              Terbitkan
            </button>
            <button type="button" onClick={() => setPendingBulk("unpublish")} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-secondary hover:border-primary/40 hover:text-primary">
              Tarik ke draft
            </button>
            <button type="button" onClick={() => setPendingBulk("delete")} className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
              Hapus
            </button>
          </div>
        )}
      </div>

      {/* Daftar */}
      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memuat artikel...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            {items.length === 0 ? "Belum ada artikel." : "Tidak ada artikel yang cocok."}
          </p>
          {items.length > 0 && (
            <button type="button" onClick={onRefreshRequest} className="mt-2 text-xs font-semibold text-primary">
              Muat ulang
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {visible.map((a) => {
            const status = manageStatus(a, now);
            const isSel = selected.has(a.slug);
            return (
              <div
                key={a.slug}
                className={cn(
                  "flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4",
                  isSel ? "border-primary/40" : "border-slate-200",
                )}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(a.slug)}
                  aria-label={`Pilih ${a.title}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-semibold text-primary">{a.category}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[status])}>
                      {MANAGE_STATUS_LABEL[status]}
                    </span>
                    {a.scheduledAt && status === "terjadwal" && (
                      <span className="text-[11px]">
                        tayang {new Date(a.scheduledAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })} WIB
                      </span>
                    )}
                    {a.updatedAt && (
                      <span className="text-[11px]">
                        diubah {new Date(a.updatedAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium" })}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-0.5 truncate text-sm font-bold text-secondary">{a.title}</h3>
                  <p className="truncate text-xs text-muted">/{a.slug}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={status === "draft" ? `/admin/blog/preview/${a.slug}` : `/blog/${a.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-primary/30 hover:text-primary"
                    aria-label={status === "draft" ? `Pratinjau ${a.title}` : `Lihat ${a.title} di website`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEdit(a)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-primary/30 hover:text-primary"
                    aria-label={`Edit ${a.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(a)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-primary/30 hover:text-primary"
                    aria-label={`Duplikat ${a.title}`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(a)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-500"
                    aria-label={`Hapus ${a.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length > limit && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:border-primary/30 hover:text-primary"
              >
                Muat lebih banyak ({filtered.length - limit} lagi)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Konfirmasi aksi massal */}
      {pendingBulk && (
        <div role="dialog" aria-modal="true" aria-label="Konfirmasi aksi massal" className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary/40" onClick={() => !busy && setPendingBulk(null)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-secondary">Konfirmasi</h2>
            <p className="mt-2 text-sm text-muted">{bulkConfirmText(pendingBulk, selectedVisible.length)}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingBulk(null)} disabled={busy} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-secondary">
                Batal
              </button>
              <button
                type="button"
                onClick={runBulk}
                disabled={busy}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60",
                  pendingBulk === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-primary-dark",
                )}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
