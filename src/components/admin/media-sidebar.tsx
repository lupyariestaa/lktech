"use client";

import { useState } from "react";
import {
  Check,
  Folder,
  FolderPlus,
  Hash,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Star,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Filter "pintar" bawaan sidebar (di luar koleksi/tag). */
export type SmartFilter = "all" | "favorite" | "trash" | "orphan" | "none";

export type FolderFilter = { id: string; name: string; count: number };
export type TagFilter = { tag: string; count: number };

/**
 * Sidebar organisasi media: filter pintar, koleksi (CRUD), dan tag.
 */
export function MediaSidebar({
  smartFilter,
  onSmartFilter,
  activeCollectionId,
  onSelectCollection,
  activeTag,
  onSelectTag,
  collections,
  tags,
  collectionsLoading,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  busy,
}: {
  smartFilter: SmartFilter;
  onSmartFilter: (f: SmartFilter) => void;
  activeCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  collections: FolderFilter[];
  tags: TagFilter[];
  collectionsLoading: boolean;
  onCreateCollection: (name: string) => Promise<void>;
  onRenameCollection: (id: string, name: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  busy: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showTags, setShowTags] = useState(true);

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await onCreateCollection(name);
    setNewName("");
    setCreating(false);
  };

  const submitRename = async (id: string) => {
    const name = editName.trim();
    if (name) await onRenameCollection(id, name);
    setEditingId(null);
    setEditName("");
  };

  return (
    <aside className="flex w-full flex-col gap-5 lg:w-56 lg:shrink-0">
      {/* Filter pintar */}
      <nav className="flex flex-col gap-1" aria-label="Filter media">
        <SidebarItem
          icon={<ImageIcon className="h-4 w-4" />}
          label="Semua media"
          active={smartFilter === "all" && !activeCollectionId && !activeTag}
          onClick={() => {
            onSmartFilter("all");
            onSelectCollection(null);
            onSelectTag(null);
          }}
        />
        <SidebarItem
          icon={<Star className="h-4 w-4" />}
          label="Favorit"
          active={smartFilter === "favorite"}
          onClick={() => {
            onSmartFilter("favorite");
            onSelectCollection(null);
            onSelectTag(null);
          }}
        />
        <SidebarItem
          icon={<TriangleAlert className="h-4 w-4" />}
          label="Tanpa pemakaian"
          active={smartFilter === "orphan"}
          onClick={() => {
            onSmartFilter("orphan");
            onSelectCollection(null);
            onSelectTag(null);
          }}
        />
        <SidebarItem
          icon={<Trash2 className="h-4 w-4" />}
          label="Trash"
          active={smartFilter === "trash"}
          onClick={() => {
            onSmartFilter("trash");
            onSelectCollection(null);
            onSelectTag(null);
          }}
        />
      </nav>

      {/* Koleksi */}
      <div>
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold tracking-wide text-muted uppercase">
            Koleksi
          </h3>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            aria-label="Koleksi baru"
            className="grid h-6 w-6 place-items-center rounded-full text-slate-400 transition-colors hover:text-primary"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>

        {creating && (
          <div className="mt-2 flex items-center gap-1.5 px-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Nama koleksi"
              aria-label="Nama koleksi baru"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={submitCreate}
              disabled={busy || !newName.trim()}
              aria-label="Simpan koleksi"
              className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}

        <ul className="mt-1.5 flex flex-col gap-0.5">
          {collectionsLoading ? (
            <li className="px-2 py-1.5 text-xs text-muted">Memuat…</li>
          ) : collections.length === 0 ? (
            <li className="px-2 py-1.5 text-xs text-muted">
              Belum ada koleksi.
            </li>
          ) : (
            collections.map((c) => (
              <li key={c.id}>
                {editingId === c.id ? (
                  <div className="flex items-center gap-1.5 px-1">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void submitRename(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      aria-label="Ubah nama koleksi"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => submitRename(c.id)}
                      aria-label="Simpan"
                      className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors",
                      activeCollectionId === c.id
                        ? "bg-primary-50 text-primary"
                        : "text-slate-600 hover:bg-surface",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCollection(c.id);
                        onSelectTag(null);
                        onSmartFilter("none");
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <Folder className="h-4 w-4 shrink-0" />
                      <span className="truncate text-sm font-medium">
                        {c.name}
                      </span>
                      <span className="ml-auto text-xs text-muted">
                        {c.count}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      aria-label={`Ubah nama ${c.name}`}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary focus:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCollection(c.id)}
                      aria-label={`Hapus koleksi ${c.name}`}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500 focus:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Tag */}
      <div>
        <button
          type="button"
          onClick={() => setShowTags((v) => !v)}
          className="flex w-full items-center justify-between px-2"
          aria-expanded={showTags}
        >
          <h3 className="text-xs font-bold tracking-wide text-muted uppercase">
            Tag
          </h3>
        </button>
        {showTags && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
            {tags.length === 0 ? (
              <span className="px-1 py-1 text-xs text-muted">
                Belum ada tag.
              </span>
            ) : (
              tags.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => {
                    onSelectTag(activeTag === t.tag ? null : t.tag);
                    onSelectCollection(null);
                    onSmartFilter("none");
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    activeTag === t.tag
                      ? "border-primary/30 bg-primary-50 text-primary"
                      : "border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary",
                  )}
                >
                  <Hash className="h-3 w-3" />
                  {t.tag}
                  <span className="text-muted">{t.count}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary-50 text-primary"
          : "text-slate-600 hover:bg-surface",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
