"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  Crop,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { ImageUploader } from "@/components/admin/image-uploader";
import { listMedia, saveMedia } from "@/lib/admin-api";
import { imgUrl, type CloudinaryAsset } from "@/lib/cloudinary-client";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABEL,
  type MediaCategory,
  type MediaItem,
  type MediaSortKey,
} from "@/lib/media-types";
import { cn } from "@/lib/utils";

export type MediaPickerMode = "single" | "multiple";

/** Rasio crop yang bisa dipilih (untuk URL transformasi Cloudinary). */
export type CropRatio = "original" | "16:9" | "16:10" | "1:1" | "9:16" | "4:3";

const CROP_OPTIONS: Array<{ key: CropRatio; label: string; w?: number; h?: number }> = [
  { key: "original", label: "Asli" },
  { key: "16:9", label: "16:9", w: 1600, h: 900 },
  { key: "16:10", label: "16:10", w: 1600, h: 1000 },
  { key: "1:1", label: "1:1", w: 1200, h: 1200 },
  { key: "4:3", label: "4:3", w: 1200, h: 900 },
  { key: "9:16", label: "9:16", w: 900, h: 1600 },
];

const SORT_LABEL: Record<MediaSortKey, string> = {
  newest: "Terbaru",
  oldest: "Terlama",
  title: "Judul A–Z",
  size: "Terbesar",
};

const PAGE_LIMIT = 24;
const SEARCH_DEBOUNCE_MS = 350;

/** Terapkan transformasi rasio ke item (mengganti secureUrl dgn URL crop). */
function applyCrop(item: MediaItem, ratio: CropRatio): MediaItem {
  if (ratio === "original" || !item.publicId) return item;
  const opt = CROP_OPTIONS.find((o) => o.key === ratio);
  if (!opt?.w || !opt?.h) return item;
  const cropped = imgUrl(item.publicId, {
    w: opt.w,
    h: opt.h,
    crop: "fill",
  });
  return { ...item, secureUrl: cropped || item.secureUrl };
}

/** URL thumbnail ringan via transformasi Cloudinary (fallback secureUrl). */
function thumb(item: MediaItem, w = 320, h = 240): string {
  if (!item.publicId) return item.secureUrl;
  return imgUrl(item.publicId, { w, h, crop: "fill" }) || item.secureUrl;
}

/**
 * Dialog pemilih media yang reusable (dipakai banyak sistem).
 *
 * Fitur: pencarian **server-side** (debounce), filter kategori, urutkan,
 * paginasi (muat lebih banyak), pilih single/multiple, crop/rasio opsional
 * (transformasi Cloudinary on-the-fly), dan unggah gambar baru dari dialog.
 *
 * A11y: `aria-live` jumlah hasil, label item deskriptif, navigasi keyboard
 * ringan (Esc, Tab terjebak), fokus kembali ke pemicu saat ditutup.
 *
 * @example
 * <MediaPickerDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   mode="multiple"
 *   onSelect={(items) => ...}
 * />
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  mode = "multiple",
  onSelect,
  defaultCategory,
  acceptedCategories,
  title = "Pilih dari Media",
  folder = "lktech",
  cropEnabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: MediaPickerMode;
  onSelect: (items: MediaItem[]) => void;
  defaultCategory?: MediaCategory | "semua";
  acceptedCategories?: MediaCategory[];
  title?: string;
  folder?: string;
  /** Tampilkan pilihan rasio crop (transformasi Cloudinary). */
  cropEnabled?: boolean;
}) {
  const categories = useMemo<readonly MediaCategory[]>(
    () => acceptedCategories ?? MEDIA_CATEGORIES,
    [acceptedCategories],
  );

  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<MediaCategory | "semua">(
    defaultCategory ?? "semua",
  );
  const [sort, setSort] = useState<MediaSortKey>("newest");
  const [crop, setCrop] = useState<CropRatio>("original");
  const [selected, setSelected] = useState<Record<string, MediaItem>>({});
  const [showUpload, setShowUpload] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Reset state saat dialog DIBUKA (transisi false→true), dilakukan saat render
  // agar tidak memicu cascading render (aturan React 19). Lihat:
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelected({});
      setShowUpload(false);
      setCrop("original");
      setCategory(defaultCategory ?? "semua");
    }
  }

  // Debounce pencarian → server-side.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const buildQuery = useCallback(
    (cursor?: string) => ({
      q: debouncedQuery || undefined,
      category: category === "semua" ? undefined : category,
      sort,
      status: "active" as const,
      cursor,
      limit: PAGE_LIMIT,
    }),
    [debouncedQuery, category, sort],
  );

  // Muat daftar media saat dialog dibuka / filter berubah. `setState` hanya
  // setelah `await`, jadi tidak memicu cascading render sinkron.
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const data = await listMedia(buildQuery());
        if (!active) return;
        setItems(data.items);
        setNextCursor(data.nextCursor);
        setError(null);
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
  }, [open, buildQuery]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await listMedia(buildQuery(nextCursor));
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {
      /* abaikan */
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, buildQuery]);

  // Tutup dengan tombol Escape & kunci scroll body.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  // Focus trap: simpan fokus sebelumnya, fokuskan panel saat dibuka, dan
  // kembalikan fokus saat ditutup; jaga Tab tetap di dalam dialog.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusFirst = () => {
      const focusables = panel?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusables?.[0]?.focus();
    };
    const id = window.setTimeout(focusFirst, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [open]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const selectedCount = selectedList.length;

  const toggle = (item: MediaItem) => {
    setSelected((prev) => {
      if (mode === "single") {
        return prev[item.id] ? {} : { [item.id]: item };
      }
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  };

  const clearSelection = () => setSelected({});

  const confirm = () => {
    if (selectedCount === 0) return;
    // Terapkan crop pada item terpilih (bila diaktifkan).
    const out = selectedList.map((it) =>
      cropEnabled ? applyCrop(it, crop) : it,
    );
    onSelect(out);
    onOpenChange(false);
  };

  // Setelah unggah gambar baru dari dalam dialog → simpan ke Media & muat ulang.
  const reload = async () => {
    setLoading(true);
    try {
      const data = await listMedia(buildQuery());
      setItems(data.items);
      setNextCursor(data.nextCursor);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat media.");
    } finally {
      setLoading(false);
    }
  };

  const onUploaded = async (
    asset: CloudinaryAsset,
    meta: { title: string; category: MediaCategory },
  ) => {
    await saveMedia({
      publicId: asset.publicId,
      secureUrl: asset.secureUrl,
      width: asset.width,
      height: asset.height,
      format: asset.format,
      bytes: asset.bytes,
      category: meta.category,
      title: meta.title,
      projectSlug: "",
    });
    await reload();
  };

  if (!open) return null;

  const resultLabel = loading
    ? "Memuat media…"
    : `${items.length} media ditampilkan${nextCursor ? ", masih ada lagi" : ""}`;

  return (
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-secondary">{title}</h2>
              <p className="text-xs text-muted">
                {mode === "single"
                  ? "Pilih satu gambar"
                  : "Pilih satu atau beberapa gambar"}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-secondary"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, alt, tag, atau nama file…"
              aria-label="Cari media"
              type="search"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Bersihkan pencarian"
                className="absolute top-1/2 right-3 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as MediaCategory | "semua")
            }
            aria-label="Filter kategori media"
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="semua">Semua kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {MEDIA_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as MediaSortKey)}
            aria-label="Urutkan media"
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            {(Object.keys(SORT_LABEL) as MediaSortKey[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>

          {cropEnabled && (
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1">
              <Crop className="ml-1.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value as CropRatio)}
                aria-label="Rasio crop gambar"
                className="bg-transparent py-1 pr-1 text-sm text-secondary focus:outline-none"
              >
                {CROP_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={reload}
            disabled={loading}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
            aria-label="Muat ulang"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          <button
            onClick={() => setShowUpload((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors",
              showUpload
                ? "border-primary/30 bg-primary-50 text-primary"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary",
            )}
          >
            <Plus className="h-4 w-4" />
            Unggah
          </button>
        </div>

        {/* Panel unggah */}
        {showUpload && (
          <div className="border-b border-slate-100 bg-surface px-5 py-4">
            <UploadInline folder={folder} onUploaded={onUploaded} />
          </div>
        )}

        {/* Konten */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Live region (a11y) */}
          <p className="sr-only" aria-live="polite">
            {resultLabel}
          </p>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-20 text-muted">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm">Memuat media…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <p className="text-sm font-medium text-secondary">
                {debouncedQuery || category !== "semua"
                  ? "Tidak ada media yang cocok."
                  : "Belum ada media."}
              </p>
              <p className="mt-1 text-xs text-muted">
                {debouncedQuery || category !== "semua"
                  ? "Coba ubah kata kunci atau filter."
                  : "Unggah gambar baru lewat tombol “Unggah” di atas."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((item) => {
                  const isSel = Boolean(selected[item.id]);
                  const label = item.title || item.alt || item.publicId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item)}
                      aria-pressed={isSel}
                      aria-label={`${isSel ? "Batalkan pilih" : "Pilih"} ${label}`}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border bg-white text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        isSel
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-slate-200 hover:border-primary/40",
                      )}
                    >
                      <div className="relative aspect-[4/3] bg-surface">
                        <Image
                          src={thumb(item)}
                          alt={item.alt || label}
                          fill
                          sizes="(max-width: 640px) 45vw, 220px"
                          className="object-cover"
                        />
                        {isSel && (
                          <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-white shadow">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-secondary backdrop-blur">
                          {MEDIA_CATEGORY_LABEL[item.category]}
                        </span>
                        {item.favorite && (
                          <span
                            className="absolute bottom-2 left-2 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold text-white"
                            aria-hidden="true"
                          >
                            ★
                          </span>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <p className="truncate text-xs font-semibold text-secondary">
                          {item.title || "Tanpa judul"}
                        </p>
                        <p className="truncate text-[10px] text-muted">
                          {item.width}×{item.height}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {nextCursor && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    Muat lebih banyak
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="text-sm text-muted">
            {selectedCount > 0
              ? `${selectedCount} gambar dipilih`
              : "Belum ada yang dipilih"}
            {selectedCount > 0 && (
              <button
                onClick={clearSelection}
                className="ml-3 text-xs font-semibold text-primary hover:underline"
              >
                Reset
              </button>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              Batal
            </button>
            <button
              onClick={confirm}
              disabled={selectedCount === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              Pilih
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Panel unggah inline di dalam dialog. */
function UploadInline({
  folder,
  onUploaded,
}: {
  folder: string;
  onUploaded: (
    asset: CloudinaryAsset,
    meta: { title: string; category: MediaCategory },
  ) => Promise<void>;
}) {
  const [asset, setAsset] = useState<CloudinaryAsset | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MediaCategory>(MEDIA_CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!asset) return;
    setBusy(true);
    setError(null);
    try {
      await onUploaded(asset, {
        title: title.trim() || asset.publicId.split("/").pop() || "Tanpa judul",
        category,
      });
      setAsset(null);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan media.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <ImageUploader
        value={asset}
        onChange={setAsset}
        folder={`${folder}/${category === "lainnya" ? "lainnya" : category}`}
        label="Gambar baru"
      />
      <div className="flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul (opsional)"
          aria-label="Judul gambar"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as MediaCategory)}
          aria-label="Kategori gambar"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          {MEDIA_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {MEDIA_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={submit}
            disabled={!asset || busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan ke Media
          </button>
          {error && <span className="text-xs text-rose-500">{error}</span>}
        </div>
        <p className="text-xs text-muted">
          Gambar tersimpan ke galeri Media, lalu muncul di daftar di atas.
        </p>
      </div>
    </div>
  );
}
