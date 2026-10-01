"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Info,
  MoreVertical,
  Pencil,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import {
  MEDIA_CATEGORY_LABEL,
  type MediaItem,
} from "@/lib/media-types";
import { imgUrl } from "@/lib/cloudinary-client";
import { cn } from "@/lib/utils";

/** URL thumbnail ringan via transformasi Cloudinary (fallback ke secureUrl). */
function thumb(item: MediaItem, w = 400): string {
  if (!item.publicId) return item.secureUrl;
  return imgUrl(item.publicId, { w, crop: "fill", h: Math.round(w * 0.625) }) || item.secureUrl;
}

export type MediaCardAction =
  | "detail"
  | "edit"
  | "favorite"
  | "unfavorite"
  | "trash"
  | "restore"
  | "delete";

/**
 * Kartu satu aset media di galeri dashboard.
 *
 * Menampilkan thumbnail, judul, badge kategori, indikator "Dipakai", status
 * favorit, checkbox bulk, dan menu aksi. Aksesibel lewat `role="button"` +
 * `aria-label` deskriptif.
 */
export function MediaCard({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tutup menu saat klik di luar atau Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const label = item.title || item.alt || item.publicId || "Media tanpa judul";
  const trashed = item.status === "trashed";

  const handleCardClick = () => {
    if (bulkMode) onToggleSelect(item.id);
    else onOpenDetail(item);
  };

  return (
    <figure
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white transition-all",
        selected ? "border-primary ring-2 ring-primary/40" : "border-slate-200",
        trashed && "opacity-80",
      )}
    >
      <div className="relative aspect-[16/10] bg-surface">
        {/* Area klik utama (thumbnail) */}
        <button
          type="button"
          onClick={handleCardClick}
          data-media-cell
          aria-label={`${bulkMode ? "Pilih" : "Buka detail"} ${label}`}
          aria-pressed={bulkMode ? selected : undefined}
          className="absolute inset-0 h-full w-full focus:outline-none"
        >
          <Image
            src={thumb(item)}
            alt={item.alt || label}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
            className="object-cover"
          />
        </button>

        {/* Badge kategori */}
        <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-secondary backdrop-blur">
          {MEDIA_CATEGORY_LABEL[item.category]}
        </span>

        {/* Indikator status trashed / favorit */}
        <div className="pointer-events-none absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {trashed && (
            <span className="rounded-full bg-rose-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              Trash
            </span>
          )}
          {item.favorite && (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-400/95 text-white shadow">
              <Star className="h-3.5 w-3.5 fill-current" />
            </span>
          )}
        </div>

        {/* Checkbox bulk */}
        {(bulkMode || selected) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
            aria-label={selected ? `Batalkan pilih ${label}` : `Pilih ${label}`}
            className={cn(
              "absolute bottom-2.5 left-2.5 grid h-7 w-7 place-items-center rounded-full border-2 transition-colors",
              selected
                ? "border-primary bg-primary text-white"
                : "border-white bg-white/80 text-transparent hover:border-primary",
            )}
          >
            <Check className="h-4 w-4" />
          </button>
        )}

        {/* Menu aksi */}
        <div ref={menuRef} className="absolute right-2.5 bottom-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label={`Aksi untuk ${label}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-600 shadow backdrop-blur transition-colors hover:text-primary"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 bottom-10 z-20 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl"
            >
              <MenuItem
                icon={<Info className="h-4 w-4" />}
                label="Detail"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenDetail(item);
                }}
              />
              <MenuItem
                icon={<Pencil className="h-4 w-4" />}
                label="Edit"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("edit", item);
                }}
              />
              <MenuItem
                icon={<Star className={cn("h-4 w-4", item.favorite && "fill-current")} />}
                label={item.favorite ? "Hapus favorit" : "Favoritkan"}
                onClick={() => {
                  setMenuOpen(false);
                  onAction(item.favorite ? "unfavorite" : "favorite", item);
                }}
              />
              {trashed ? (
                <MenuItem
                  icon={<RotateCcw className="h-4 w-4" />}
                  label="Pulihkan"
                  onClick={() => {
                    setMenuOpen(false);
                    onAction("restore", item);
                  }}
                />
              ) : (
                <MenuItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Pindah ke Trash"
                  onClick={() => {
                    setMenuOpen(false);
                    onAction("trash", item);
                  }}
                />
              )}
              {trashed && (
                <MenuItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Hapus permanen"
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    onAction("delete", item);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <figcaption className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-secondary">
            {item.title || "Tanpa judul"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {item.width}×{item.height} · {(item.bytes / 1024).toFixed(0)} KB
          </p>
          {item.usageCount > 0 && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
              title="Jumlah referensi di konten"
            >
              Dipakai ×{item.usageCount}
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium transition-colors",
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-600 hover:bg-surface hover:text-secondary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
