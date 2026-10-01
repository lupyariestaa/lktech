"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  AlertTriangle,
  CheckSquare,
  Download,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ImageUploader } from "@/components/admin/image-uploader";
import { MediaToolbar } from "@/components/admin/media-toolbar";
import { MediaCard, type MediaCardAction } from "@/components/admin/media-card";
import { MediaBulkBar, type BulkAction } from "@/components/admin/media-bulk-bar";
import {
  MediaDetailPanel,
  type MediaDetailPatch,
} from "@/components/admin/media-detail-panel";
import {
  applyBulkMedia,
  createMediaCollection,
  deleteMedia,
  deleteMediaCollection,
  exportMediaToCsv,
  fetchMediaAudit,
  fetchMediaCollections,
  fetchMediaTags,
  fetchMediaUsage,
  fetchOrphanMedia,
  fetchProjects,
  listMedia,
  rescanMediaUsage,
  restoreMedia,
  saveMedia,
  updateMedia,
  updateMediaCollection,
  type MediaAuditEntry,
  type MediaCollectionWithCount,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/admin-fetch";
import { imgUrl } from "@/lib/cloudinary-client";
import { MediaSidebar, type SmartFilter } from "@/components/admin/media-sidebar";
import type { CloudinaryAsset } from "@/lib/cloudinary-client";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABEL,
  type MediaCategory,
  type MediaItem,
  type MediaSortKey,
  type MediaUsage,
} from "@/lib/media-types";
import type { Project } from "@/lib/project-types";
import { useToast } from "@/components/admin/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";

export type MediaViewMode = "grid" | "list";

const PAGE_LIMIT = 24;
const SEARCH_DEBOUNCE_MS = 350;

/** URL thumbnail ringan via transformasi Cloudinary (fallback secureUrl). */
function thumbUrl(item: MediaItem, w: number, h: number): string {
  if (!item.publicId) return item.secureUrl;
  return imgUrl(item.publicId, { w, h, crop: "fill" }) || item.secureUrl;
}

/**
 * Manajer Media (FASE M2) — pusat aset dengan pencarian/filter server-side,
 * tampilan grid/list, paginasi (infinite scroll), panel detail/edit, aksi
 * massal, dan tab Trash.
 */
export function MediaManager() {
  const toast = useToast();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<MediaCategory | "semua">("semua");
  const [sort, setSort] = useState<MediaSortKey>("newest");
  const [view, setView] = useState<MediaViewMode>("grid");

  // Organisasi (FASE M4).
  const [smartFilter, setSmartFilter] = useState<SmartFilter>("all");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [collections, setCollections] = useState<MediaCollectionWithCount[]>([]);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionBusy, setCollectionBusy] = useState(false);

  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const [detail, setDetail] = useState<MediaItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [audit, setAudit] = useState<MediaAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [showUpload, setShowUpload] = useState(false);

  const [toDelete, setToDelete] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Pemakaian aset (guard hapus permanen) & pemindaian.
  const [blockedUsage, setBlockedUsage] = useState<MediaUsage[] | null>(null);
  const [scanning, setScanning] = useState(false);
  // Pengumuman a11y (aria-live) untuk aksi.
  const [announce, setAnnounce] = useState("");

  // --- Pemuatan data (server-side) -----------------------------------------
  const showTrash = smartFilter === "trash";

  const buildQuery = useCallback(
    (cursor?: string, limit = PAGE_LIMIT) => ({
      q: debouncedQuery || undefined,
      category: category === "semua" ? undefined : category,
      collectionId: activeCollectionId ?? undefined,
      tag: activeTag ?? undefined,
      favorite: smartFilter === "favorite" ? true : undefined,
      sort,
      status: (showTrash ? "trashed" : "active") as "trashed" | "active",
      cursor,
      limit,
    }),
    [debouncedQuery, category, activeCollectionId, activeTag, smartFilter, sort, showTrash],
  );

  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      if (smartFilter === "orphan") {
        const list = await fetchOrphanMedia(500);
        setItems(list);
        setNextCursor(null);
        setError(null);
        return;
      }
      const data = await listMedia(buildQuery());
      setItems(data.items);
      setNextCursor(data.nextCursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat media.");
    } finally {
      setLoading(false);
    }
  }, [buildQuery, smartFilter]);

  // Debounce pencarian.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Muat ulang saat filter/sortir/koleksi/tag/trash berubah.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (smartFilter === "orphan") {
          const list = await fetchOrphanMedia(500);
          if (!active) return;
          setItems(list);
          setNextCursor(null);
          setError(null);
        } else {
          const data = await listMedia(buildQuery());
          if (!active) return;
          setItems(data.items);
          setNextCursor(data.nextCursor);
          setError(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat media.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [buildQuery, smartFilter]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await listMedia(buildQuery(nextCursor));
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat lebih banyak.");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, buildQuery]);

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Navigasi keyboard grid (panah): pindah fokus antar tombol kartu.
  const onGridKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const grid = gridRef.current;
    if (!grid) return;
    // Tombol thumbnail kartu adalah target fokus yang bermakna.
    const focusables = Array.from(
      grid.querySelectorAll<HTMLButtonElement>("button[data-media-cell]"),
    );
    if (focusables.length === 0) return;
    const currentIndex = focusables.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (currentIndex === -1) return;

    // Hitung jumlah kolom efektif dari posisi kartu pertama.
    const first = focusables[0].getBoundingClientRect();
    let cols = 1;
    for (const f of focusables) {
      if (Math.abs(f.getBoundingClientRect().top - first.top) < 4) cols += 1;
      else break;
    }
    cols = Math.max(1, cols - 1);

    let next = currentIndex;
    if (e.key === "ArrowRight") next = currentIndex + 1;
    else if (e.key === "ArrowLeft") next = currentIndex - 1;
    else if (e.key === "ArrowDown") next = currentIndex + cols;
    else if (e.key === "ArrowUp") next = currentIndex - cols;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = focusables.length - 1;

    if (next >= 0 && next < focusables.length && next !== currentIndex) {
      e.preventDefault();
      focusables[next].focus();
    }
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // Bersihkan pilihan item saat filter/trash berubah (dilakukan saat render,
  // bukan via effect, agar tidak memicu cascading render). Lihat:
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const filterKey = `${debouncedQuery}|${category}|${sort}|${smartFilter}|${activeCollectionId}|${activeTag}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setSelected({});
  }

  const reload = useCallback(() => void loadFirst(), [loadFirst]);

  // --- Organisasi: muat koleksi & tag --------------------------------------
  const loadCollections = useCallback(async () => {
    setCollectionsLoading(true);
    try {
      const [cols, tagList] = await Promise.all([
        fetchMediaCollections(),
        fetchMediaTags(),
      ]);
      setCollections(cols);
      setTags(tagList);
    } catch {
      /* abaikan: sidebar tetap tampil walau gagal */
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cols, tagList] = await Promise.all([
          fetchMediaCollections(),
          fetchMediaTags(),
        ]);
        if (!active) return;
        setCollections(cols);
        setTags(tagList);
      } catch {
        /* abaikan */
      } finally {
        if (active) setCollectionsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleCreateCollection = async (name: string) => {
    setCollectionBusy(true);
    try {
      await createMediaCollection({ name });
      await loadCollections();
      toast.success(`Koleksi "${name}" dibuat.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat koleksi.";
      toast.error(msg);
    } finally {
      setCollectionBusy(false);
    }
  };

  const handleRenameCollection = async (id: string, name: string) => {
    setCollectionBusy(true);
    try {
      await updateMediaCollection(id, { name });
      await loadCollections();
      toast.success("Nama koleksi diperbarui.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah koleksi.";
      toast.error(msg);
    } finally {
      setCollectionBusy(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    const target = collections.find((c) => c.id === id);
    if (!window.confirm(`Hapus koleksi "${target?.name ?? ""}"? Aset tidak akan dihapus.`)) {
      return;
    }
    setCollectionBusy(true);
    try {
      await deleteMediaCollection(id);
      if (activeCollectionId === id) setActiveCollectionId(null);
      await loadCollections();
      toast.success("Koleksi dihapus.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus koleksi.";
      toast.error(msg);
    } finally {
      setCollectionBusy(false);
    }
  };

  // --- Seleksi bulk ---------------------------------------------------------
  const selectedItems = useMemo(
    () => items.filter((it) => selected[it.id]),
    [items, selected],
  );
  const selectedCount = selectedItems.length;

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  const clearSelection = () => setSelected({});

  // --- Aksi kartu -----------------------------------------------------------
  const openDetail = (item: MediaItem) => {
    setDetail(item);
    setDetailOpen(true);
    setAudit([]);
    setAuditLoading(true);
    // Ambil pemakaian terkini + riwayat (audit trail) untuk panel detail.
    void (async () => {
      try {
        const res = await fetchMediaUsage(item.id);
        patchLocal(item.id, { usedIn: res.usedIn, usageCount: res.usageCount });
      } catch {
        /* abaikan: panel tetap tampil dengan data denormalisasi */
      }
    })();
    void (async () => {
      try {
        const rows = await fetchMediaAudit(item.id);
        setAudit(rows);
      } catch {
        /* abaikan */
      } finally {
        setAuditLoading(false);
      }
    })();
  };

  const patchLocal = (id: string, patch: Partial<MediaItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
    setDetail((d) => (d && d.id === id ? { ...d, ...patch } : d));
  };

  const removeLocal = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setDetail((d) => (d && d.id === id ? null : d));
    setDetailOpen(false);
  };

  const handleCardAction = async (
    action: MediaCardAction,
    item: MediaItem,
  ) => {
    try {
      if (action === "detail") {
        openDetail(item);
      } else if (action === "edit") {
        openDetail(item);
      } else if (action === "favorite" || action === "unfavorite") {
        const favorite = action === "favorite";
        patchLocal(item.id, { favorite });
        await updateMedia(item.id, { favorite });
        toast.success(favorite ? "Ditandai favorit." : "Favorit dihapus.");
      } else if (action === "trash") {
        patchLocal(item.id, { status: "trashed" });
        await deleteMedia(item.id, { hard: false });
        // Hapus dari daftar aktif.
        removeLocal(item.id);
        toast.success("Dipindahkan ke Trash.");
      } else if (action === "restore") {
        await restoreMedia(item.id);
        removeLocal(item.id);
        toast.success("Aset dipulihkan.");
      } else if (action === "delete") {
        setToDelete(item);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Aksi gagal.";
      setError(msg);
      toast.error(msg);
      void loadFirst();
    }
  };

  // --- Simpan detail --------------------------------------------------------
  const saveDetail = async (patch: MediaDetailPatch) => {
    if (!detail) return;
    setSavingDetail(true);
    try {
      const res = await updateMedia(detail.id, {
        title: patch.title,
        alt: patch.alt,
        description: patch.description,
        tags: patch.tags,
        favorite: patch.favorite,
        collectionId: patch.collectionId ?? "",
        ...(patch.order !== undefined ? { order: patch.order } : {}),
      });
      patchLocal(detail.id, res.item);
      toast.success("Perubahan disimpan.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingDetail(false);
    }
  };

  const changeCategoryFromDetail = async (
    item: MediaItem,
    cat: MediaCategory,
  ) => {
    patchLocal(item.id, { category: cat });
    try {
      await updateMedia(item.id, { category: cat });
      toast.success("Kategori diperbarui.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal ubah kategori.";
      setError(msg);
      toast.error(msg);
      void loadFirst();
    }
  };

  // --- Hapus permanen -------------------------------------------------------
  const confirmHardDelete = async () => {
    const item = toDelete;
    if (!item) return;
    setDeleting(true);
    try {
      await deleteMedia(item.id, { publicId: item.publicId, hard: true });
      removeLocal(item.id);
      setToDelete(null);
      setBlockedUsage(null);
      toast.success("Aset dihapus permanen.");
    } catch (err) {
      // Guard MED-04: aset masih dipakai → tampilkan daftar pemakaian.
      if (err instanceof ApiError && err.usedIn && err.usedIn.length > 0) {
        setToDelete(null);
        setBlockedUsage(err.usedIn as MediaUsage[]);
        return;
      }
      const msg = err instanceof Error ? err.message : "Gagal menghapus.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // --- Pindai ulang penggunaan ---------------------------------------------
  const rescanUsage = async () => {
    setScanning(true);
    try {
      const res = await rescanMediaUsage();
      toast.success(
        `Pemindaian selesai: ${res.used} dari ${res.scanned} aset dipakai.`,
      );
      await loadFirst();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memindai.";
      setError(msg);
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  // --- Bulk -----------------------------------------------------------------
  const runBulk = async (action: BulkAction) => {
    if (selectedCount === 0) return;
    if (action.action === "delete") {
      setBulkDeleteOpen(true);
      return;
    }
    setBulkBusy(true);
    try {
      const res = await applyBulkMedia(selectedItems, action);
      const msg = `${res.ok} aset diperbarui${res.failed ? `, ${res.failed} gagal` : ""}.`;
      setAnnounce(msg);
      toast.success(msg);
      clearSelection();
      setBulkMode(false);
      await loadFirst();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Aksi massal gagal.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const confirmBulkDelete = async () => {
    setBulkBusy(true);
    try {
      const res = await applyBulkMedia(selectedItems, { action: "delete" });
      toast.success(
        `${res.ok} aset dihapus${res.failed ? `, ${res.failed} gagal` : ""}.`,
      );
      clearSelection();
      setBulkMode(false);
      setBulkDeleteOpen(false);
      await loadFirst();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const activeCollectionName =
    collections.find((c) => c.id === activeCollectionId)?.name ?? null;

  const filterHeading =
    smartFilter === "favorite"
      ? "Favorit"
      : smartFilter === "trash"
        ? "Trash"
        : smartFilter === "orphan"
          ? "Tanpa pemakaian"
          : activeCollectionName
            ? `Koleksi: ${activeCollectionName}`
            : activeTag
              ? `Tag: #${activeTag}`
              : "Semua media";

  const resultLabel = loading
    ? "Memuat…"
    : `${items.length} aset ditampilkan${nextCursor ? " (masih ada lagi)" : ""}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Live region (a11y) untuk aksi */}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <MediaSidebar
          smartFilter={smartFilter}
          onSmartFilter={setSmartFilter}
          activeCollectionId={activeCollectionId}
          onSelectCollection={setActiveCollectionId}
          activeTag={activeTag}
          onSelectTag={setActiveTag}
          collections={collections.map((c) => ({
            id: c.id,
            name: c.name,
            count: c.mediaCount,
          }))}
          tags={tags}
          collectionsLoading={collectionsLoading}
          onCreateCollection={handleCreateCollection}
          onRenameCollection={handleRenameCollection}
          onDeleteCollection={handleDeleteCollection}
          busy={collectionBusy}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Toolbar + aksi utama */}
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-secondary">{filterHeading}</h2>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkMode((v) => !v);
                    clearSelection();
                  }}
                  aria-pressed={bulkMode}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                    bulkMode
                      ? "border-primary/30 bg-primary-50 text-primary"
                      : "border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary",
                  )}
                >
                  <CheckSquare className="h-4 w-4" />
                  Pilih
                </button>
                <button
                  type="button"
                  onClick={rescanUsage}
                  disabled={scanning}
                  title="Pindai ulang pemakaian aset di seluruh konten"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
                >
                  {scanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Perbarui penggunaan
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportMediaToCsv(
                      items,
                      collections.map((c) => ({ id: c.id, name: c.name })),
                    )
                  }
                  disabled={items.length === 0}
                  title="Ekspor daftar media yang tampil ke CSV"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Ekspor
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpload((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
                >
                  <Plus className="h-4 w-4" />
                  Unggah
                </button>
              </div>
            </div>

            <MediaToolbar
              query={query}
              onQueryChange={setQuery}
              category={category}
              onCategoryChange={setCategory}
              sort={sort}
              onSortChange={setSort}
              view={view}
              onViewChange={setView}
              loading={loading}
              onReload={reload}
              resultLabel={resultLabel}
            />
          </div>

      {/* Panel unggah */}
      {showUpload && (
        <UploadPanel
          onSaved={async () => {
            toast.success("Media disimpan ke galeri.");
            await loadFirst();
          }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Konten galeri */}
      {loading ? (
        <GallerySkeleton view={view} />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            {showTrash
              ? "Trash kosong."
              : debouncedQuery || category !== "semua"
                ? "Tidak ada media yang cocok."
                : "Belum ada media."}
          </p>
          <p className="mt-1 text-xs text-muted">
            {showTrash
              ? "Aset yang dipindah ke Trash akan muncul di sini."
              : "Unggah gambar lewat tombol “Unggah” di atas."}
          </p>
        </div>
      ) : view === "grid" ? (
        <div
          ref={gridRef}
          role="grid"
          aria-label="Galeri media"
          onKeyDown={onGridKeyDown}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              selected={Boolean(selected[item.id])}
              bulkMode={bulkMode}
              onToggleSelect={toggleSelect}
              onOpenDetail={openDetail}
              onAction={handleCardAction}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                {bulkMode && <th className="w-10 px-4 py-3" />}
                <th className="px-4 py-3">Aset</th>
                <th className="hidden px-4 py-3 sm:table-cell">Kategori</th>
                <th className="hidden px-4 py-3 md:table-cell">Dimensi</th>
                <th className="hidden px-4 py-3 md:table-cell">Ukuran</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ListRow
                  key={item.id}
                  item={item}
                  selected={Boolean(selected[item.id])}
                  bulkMode={bulkMode}
                  onToggleSelect={toggleSelect}
                  onOpenDetail={openDetail}
                  onAction={handleCardAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sentinel infinite scroll */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      {loadingMore && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Memuat lebih banyak…
        </div>
      )}

      {/* Bulk bar */}
      {bulkMode && selectedCount > 0 && (
        <MediaBulkBar
          count={selectedCount}
          busy={bulkBusy}
          showRestore={showTrash}
          collections={collections.map((c) => ({ id: c.id, name: c.name }))}
          onClear={clearSelection}
          onAction={runBulk}
        />
      )}
        </div>
      </div>

      {/* Detail panel */}
      <MediaDetailPanel
        item={detail}
        open={detailOpen}
        saving={savingDetail}
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
        audit={audit}
        auditLoading={auditLoading}
        onClose={() => setDetailOpen(false)}
        onSave={saveDetail}
        onTrash={(it) => {
          setDetailOpen(false);
          void handleCardAction("trash", it);
        }}
        onRestore={(it) => {
          setDetailOpen(false);
          void handleCardAction("restore", it);
        }}
        onHardDelete={(it) => {
          setDetailOpen(false);
          setToDelete(it);
        }}
        onChangeCategory={changeCategoryFromDetail}
      />

      {/* Konfirmasi hapus permanen (single) */}
      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus permanen aset ini?"
        description={`"${toDelete?.title || toDelete?.publicId}" akan dihapus selamanya dari galeri dan Cloudinary. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus permanen"
        busy={deleting}
        onConfirm={confirmHardDelete}
        onCancel={() => setToDelete(null)}
      />

      {/* Peringatan: aset masih dipakai (guard MED-04) */}
      <UsageBlockedDialog
        usages={blockedUsage}
        onClose={() => setBlockedUsage(null)}
      />

      {/* Konfirmasi hapus permanen (bulk) */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Hapus permanen ${selectedCount} aset?`}
        description="Semua aset terpilih akan dihapus selamanya dari galeri dan Cloudinary. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus permanen"
        busy={bulkBusy}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}

/** Baris tampilan list. */
function ListRow({
  item,
  selected,
  bulkMode,
  onToggleSelect,
  onOpenDetail,
  onAction,
}: {
  item: MediaItem;
  selected: boolean;
  bulkMode: boolean;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (item: MediaItem) => void;
  onAction: (action: MediaCardAction, item: MediaItem) => void;
}) {
  const label = item.title || item.alt || item.publicId;
  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-surface/60">
      {bulkMode && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            aria-label={`Pilih ${label}`}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
        </td>
      )}
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => (bulkMode ? onToggleSelect(item.id) : onOpenDetail(item))}
          className="flex items-center gap-3 text-left"
        >
          <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-surface">
            <Image
              src={thumbUrl(item, 128, 96)}
              alt={item.alt || label}
              fill
              sizes="64px"
              className="object-cover"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-secondary">
              {item.title || "Tanpa judul"}
            </span>
            <span className="block truncate text-xs text-muted">{item.publicId}</span>
          </span>
        </button>
      </td>
      <td className="hidden px-4 py-3 text-sm text-slate-600 sm:table-cell">
        {MEDIA_CATEGORY_LABEL[item.category]}
      </td>
      <td className="hidden px-4 py-3 text-xs text-muted md:table-cell">
        {item.width}×{item.height}
      </td>
      <td className="hidden px-4 py-3 text-xs text-muted md:table-cell">
        {(item.bytes / 1024).toFixed(0)} KB
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {item.status === "trashed" ? (
            <button
              type="button"
              onClick={() => onAction("restore", item)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
            >
              Pulihkan
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAction("trash", item)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
            >
              Trash
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction("delete", item)}
            aria-label={`Hapus permanen ${label}`}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Panel unggah multi-field (satu berkas; multi-file menyusul). */
function UploadPanel({
  onSaved,
  onClose,
}: {
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<CloudinaryAsset | null>(null);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState<MediaCategory>("portofolio");
  const [projectSlug, setProjectSlug] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchProjects();
        if (active) setProjects(list);
      } catch {
        /* abaikan */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      await saveMedia({
        publicId: pending.publicId,
        secureUrl: pending.secureUrl,
        width: pending.width,
        height: pending.height,
        format: pending.format,
        bytes: pending.bytes,
        category,
        title: title.trim(),
        alt: alt.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        projectSlug: category === "portofolio" ? projectSlug : "",
      });
      setPending(null);
      setTitle("");
      setAlt("");
      setTags("");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan media.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary">
            <Upload className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-secondary">Unggah gambar baru</h2>
            <p className="text-xs text-muted">
              Diunggah langsung ke Cloudinary, lalu metadatanya disimpan.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel unggah"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[320px_1fr]">
        <ImageUploader
          value={pending}
          onChange={setPending}
          folder={`lktech/${category === "lainnya" ? "lainnya" : category}`}
          label="Pilih gambar"
        />

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Judul</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="mis. Mockup website Kopi Lokal"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">
              Teks alternatif (alt)
            </span>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Deskripsi gambar untuk a11y/SEO (opsional)"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Tag</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Pisahkan dengan koma, mis. mockup, kopi"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Kategori</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MediaCategory)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            >
              {MEDIA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {MEDIA_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>

          {category === "portofolio" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">
                Proyek terkait
              </span>
              <select
                value={projectSlug}
                onChange={(e) => setProjectSlug(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              >
                <option value="">— Tidak dikaitkan —</option>
                {projects.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted">
                Gambar pertama proyek menjadi cover; sisanya jadi galeri.
              </span>
            </label>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!pending || saving}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan ke Galeri
          </button>

          {error && <p className="text-xs text-rose-500">{error}</p>}
          {!pending && (
            <p className="text-xs text-muted">
              Unggah gambar terlebih dahulu untuk mengaktifkan tombol simpan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Skeleton grid/list saat memuat. */
function GallerySkeleton({ view }: { view: MediaViewMode }) {
  if (view === "list") {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0"
          >
            <div className="h-12 w-16 animate-pulse rounded-lg bg-slate-100" />
            <div className="flex-1">
              <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="aspect-[16/10] animate-pulse bg-slate-100" />
          <div className="px-4 py-3">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Dialog peringatan saat hapus permanen DITOLAK karena aset masih dipakai di
 * konten (guard MED-04). Menampilkan daftar pemakaian agar admin tahu harus
 * menghapus referensinya dulu.
 */
function UsageBlockedDialog({
  usages,
  onClose,
}: {
  usages: MediaUsage[] | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!usages) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [usages, onClose]);

  if (!usages) return null;

  return (
    <div
      className="fixed inset-0 z-[13000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Aset masih dipakai"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-secondary">
              Aset masih dipakai
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Aset ini dipakai di konten berikut. Hapus referensinya terlebih
              dahulu sebelum menghapus permanen.
            </p>
          </div>
        </div>

        <ul className="mt-4 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {usages.map((u, i) => (
            <li
              key={`${u.type}-${u.refId}-${i}`}
              className="rounded-xl bg-surface px-3 py-2 text-xs text-secondary"
            >
              <span className="font-semibold">{u.label}</span>
              <span className="text-muted"> · {u.field}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
