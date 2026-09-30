"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { ImageUploader } from "@/components/admin/image-uploader";
import { fetchMedia, saveMedia } from "@/lib/admin-api";
import type { CloudinaryAsset } from "@/lib/cloudinary-client";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABEL,
  type MediaCategory,
  type MediaItem,
} from "@/lib/media-types";
import { cn } from "@/lib/utils";

export type MediaPickerMode = "single" | "multiple";

type SortKey = "newest" | "oldest" | "title";

/**
 * Dialog pemilih media yang reusable (dipakai banyak sistem).
 *
 * Fitur: pencarian judul, filter kategori, urutkan, pilih single/multiple,
 * dan unggah gambar baru langsung dari dalam dialog.
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: MediaPickerMode;
  onSelect: (items: MediaItem[]) => void;
  defaultCategory?: MediaCategory | "semua";
  acceptedCategories?: MediaCategory[];
  title?: string;
  folder?: string;
}) {
  const categories = useMemo<readonly MediaCategory[]>(
    () => acceptedCategories ?? MEDIA_CATEGORIES,
    [acceptedCategories],
  );

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MediaCategory | "semua">(
    defaultCategory ?? "semua",
  );
  const [sort, setSort] = useState<SortKey>("newest");
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
      setSelected({});
      setShowUpload(false);
      setCategory(defaultCategory ?? "semua");
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMedia();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat media.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat daftar media saat dialog dibuka. `setState` hanya setelah `await`,
  // jadi tidak memicu cascading render sinkron.
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const data = await fetchMedia();
        if (!active) return;
        setItems(data);
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
  }, [open, defaultCategory]);

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
    // Fokuskan kontrol pertama yang bisa difokus di dalam dialog.
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items
      .filter((m) => (category === "semua" ? true : m.category === category))
      .filter(
        (m) =>
          !q ||
          m.title.toLowerCase().includes(q) ||
          m.publicId.toLowerCase().includes(q),
      );
    const sorted = [...list];
    if (sort === "newest") {
      sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    } else if (sort === "oldest") {
      sorted.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [items, query, category, sort]);

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
    onSelect(selectedList);
    onOpenChange(false);
  };

  // Setelah unggah gambar baru dari dalam dialog → simpan ke Media & muat ulang.
  const onUploaded = async (asset: CloudinaryAsset, meta: {
    title: string;
    category: MediaCategory;
  }) => {
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
    await load();
  };

  if (!open) return null;

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
              placeholder="Cari nama file atau judul…"
              aria-label="Cari media"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
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
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Urutkan media"
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="title">Judul A–Z</option>
          </select>

          <button
            onClick={load}
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

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-20 text-muted">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm">Memuat media…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <p className="text-sm font-medium text-secondary">
                {items.length === 0
                  ? "Belum ada media."
                  : "Tidak ada media yang cocok."}
              </p>
              <p className="mt-1 text-xs text-muted">
                {items.length === 0
                  ? "Unggah gambar baru lewat tombol “Unggah” di atas."
                  : "Coba ubah kata kunci atau filter."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((item) => {
                const isSel = Boolean(selected[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-white text-left transition-all",
                      isSel
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-slate-200 hover:border-primary/40",
                    )}
                  >
                    <div className="relative aspect-[4/3] bg-surface">
                      <Image
                        src={item.secureUrl}
                        alt={item.title || item.publicId}
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
  const [category, setCategory] = useState<MediaCategory>(
    MEDIA_CATEGORIES[0],
  );
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
          {error && (
            <span className="text-xs text-rose-500">{error}</span>
          )}
        </div>
        <p className="text-xs text-muted">
          Gambar tersimpan ke galeri Media, lalu muncul di daftar di atas.
        </p>
      </div>
    </div>
  );
}
