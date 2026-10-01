"use client";

import { useState } from "react";
import {
  FolderInput,
  Star,
  Tag,
  Trash2,
  RotateCcw,
  X,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABEL,
  type MediaCategory,
} from "@/lib/media-types";
import { cn } from "@/lib/utils";

export type BulkAction =
  | { action: "trash" }
  | { action: "restore" }
  | { action: "delete" }
  | { action: "favorite" }
  | { action: "setCategory"; category: MediaCategory }
  | { action: "setCollection"; collectionId: string };

/**
 * Bar aksi massal yang muncul saat ada aset terpilih. Menyediakan trash,
 * restore, favorit, ganti kategori/koleksi, dan hapus permanen (dengan
 * konfirmasi via pemanggil).
 */
export function MediaBulkBar({
  count,
  busy,
  showRestore,
  collections,
  onClear,
  onAction,
}: {
  count: number;
  busy: boolean;
  showRestore: boolean;
  collections: Array<{ id: string; name: string }>;
  onClear: () => void;
  onAction: (action: BulkAction) => void;
}) {
  const [catOpen, setCatOpen] = useState(false);
  const [colOpen, setColOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[11500] flex justify-center px-4">
      <div
        role="toolbar"
        aria-label="Aksi massal media"
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur"
      >
        <span className="px-2.5 text-sm font-semibold text-secondary">
          {count} dipilih
        </span>
        <span className="mx-1 h-6 w-px bg-slate-200" />

        <BulkButton
          icon={<Trash2 className="h-4 w-4" />}
          label="Trash"
          busy={busy}
          onClick={() => onAction({ action: "trash" })}
        />

        <BulkButton
          icon={<RotateCcw className="h-4 w-4" />}
          label="Pulihkan"
          busy={busy}
          disabled={!showRestore}
          onClick={() => onAction({ action: "restore" })}
        />

        <BulkButton
          icon={<Star className="h-4 w-4" />}
          label="Favorit"
          busy={busy}
          onClick={() => onAction({ action: "favorite" })}
        />

        {/* Ganti kategori */}
        <div className="relative">
          <BulkButton
            icon={<Tag className="h-4 w-4" />}
            label="Kategori"
            busy={busy}
            iconRight={
              <ChevronUp
                className={cn("h-3.5 w-3.5 transition-transform", catOpen && "rotate-180")}
              />
            }
            onClick={() => setCatOpen((v) => !v)}
          />
          {catOpen && (
            <div className="absolute bottom-12 left-1/2 w-44 -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
              {MEDIA_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCatOpen(false);
                    onAction({ action: "setCategory", category: c });
                  }}
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-surface hover:text-secondary"
                >
                  {MEDIA_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pindah koleksi */}
        {collections.length > 0 && (
          <div className="relative">
            <BulkButton
              icon={<FolderInput className="h-4 w-4" />}
              label="Koleksi"
              busy={busy}
              iconRight={
                <ChevronUp
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    colOpen && "rotate-180",
                  )}
                />
              }
              onClick={() => setColOpen((v) => !v)}
            />
            {colOpen && (
              <div className="absolute bottom-12 left-1/2 max-h-64 w-48 -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setColOpen(false);
                    onAction({ action: "setCollection", collectionId: "" });
                  }}
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-surface hover:text-secondary"
                >
                  — Tanpa koleksi —
                </button>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setColOpen(false);
                      onAction({ action: "setCollection", collectionId: c.id });
                    }}
                    className="block w-full truncate px-4 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-surface hover:text-secondary"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <BulkButton
          icon={<Trash2 className="h-4 w-4" />}
          label="Hapus permanen"
          tone="danger"
          busy={busy}
          onClick={() => onAction({ action: "delete" })}
        />

        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          type="button"
          onClick={onClear}
          aria-label="Batalkan pilihan"
          className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-surface hover:text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BulkButton({
  icon,
  iconRight,
  label,
  onClick,
  busy,
  disabled,
  tone = "default",
}: {
  icon: React.ReactNode;
  iconRight?: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger"
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-600 hover:bg-surface hover:text-secondary",
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
      {iconRight}
    </button>
  );
}
