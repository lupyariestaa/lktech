"use client";

import { LayoutGrid, List, Loader2, RefreshCw, Search, X } from "lucide-react";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABEL,
  MEDIA_SORT_KEYS,
  type MediaCategory,
  type MediaSortKey,
} from "@/lib/media-types";
import { cn } from "@/lib/utils";
import type { MediaViewMode } from "@/components/admin/media-manager";

const SORT_LABEL: Record<MediaSortKey, string> = {
  newest: "Terbaru",
  oldest: "Terlama",
  title: "Judul A–Z",
  size: "Terbesar",
};

/**
 * Toolbar galeri media: pencarian (server-side), filter kategori, sortir,
 * toggle tampilan grid/list, dan tombol muat ulang.
 */
export function MediaToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  loading,
  onReload,
  resultLabel,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  category: MediaCategory | "semua";
  onCategoryChange: (v: MediaCategory | "semua") => void;
  sort: MediaSortKey;
  onSortChange: (v: MediaSortKey) => void;
  view: MediaViewMode;
  onViewChange: (v: MediaViewMode) => void;
  loading: boolean;
  onReload: () => void;
  resultLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari judul, alt, tag, atau nama file…"
            aria-label="Cari media"
            type="search"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
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
            onCategoryChange(e.target.value as MediaCategory | "semua")
          }
          aria-label="Filter kategori media"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          <option value="semua">Semua kategori</option>
          {MEDIA_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {MEDIA_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as MediaSortKey)}
          aria-label="Urutkan media"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          {MEDIA_SORT_KEYS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </select>

        {/* Toggle Grid/List */}
        <div
          className="flex items-center rounded-full border border-slate-200 bg-white p-0.5"
          role="group"
          aria-label="Mode tampilan"
        >
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            aria-label="Tampilan grid"
            aria-pressed={view === "grid"}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full transition-colors",
              view === "grid"
                ? "bg-primary text-white"
                : "text-slate-500 hover:text-primary",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            aria-label="Tampilan daftar"
            aria-pressed={view === "list"}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full transition-colors",
              view === "list"
                ? "bg-primary text-white"
                : "text-slate-500 hover:text-primary",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          aria-label="Muat ulang"
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Live region untuk jumlah hasil (a11y) */}
      <p className="text-xs text-muted" aria-live="polite">
        {resultLabel}
      </p>
    </div>
  );
}
