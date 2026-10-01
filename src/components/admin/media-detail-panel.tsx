"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABEL,
  type MediaCategory,
  type MediaItem,
} from "@/lib/media-types";
import type { MediaAuditEntry } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const AUDIT_LABEL: Record<string, string> = {
  upload: "Diunggah",
  update: "Diperbarui",
  trash: "Dipindah ke Trash",
  restore: "Dipulihkan",
  delete: "Dihapus permanen",
  scan: "Pemindaian",
  bulk: "Aksi massal",
};

export type MediaDetailPatch = {
  title: string;
  alt: string;
  description: string;
  tags: string[];
  category: MediaCategory;
  favorite: boolean;
  collectionId?: string;
  order?: number;
};

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

/**
 * Panel detail/edit aset media (slide-over dari kanan).
 *
 * Menampilkan metadata lengkap, form edit inline, daftar pemakaian (Fase M3),
 * dan aksi: salin URL, unduh, favorit, trash/hapus permanen.
 */
export function MediaDetailPanel({
  item,
  open,
  saving,
  collections,
  audit,
  auditLoading,
  onClose,
  onSave,
  onTrash,
  onRestore,
  onHardDelete,
  onChangeCategory,
}: {
  item: MediaItem | null;
  open: boolean;
  saving: boolean;
  collections: Array<{ id: string; name: string }>;
  audit: MediaAuditEntry[];
  auditLoading: boolean;
  onClose: () => void;
  onSave: (patch: MediaDetailPatch) => void;
  onTrash: (item: MediaItem) => void;
  onRestore: (item: MediaItem) => void;
  onHardDelete: (item: MediaItem) => void;
  onChangeCategory: (item: MediaItem, category: MediaCategory) => void;
}) {
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [orderText, setOrderText] = useState("");
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sinkronkan form dengan item saat panel dibuka/ganti item. Dilakukan saat
  // render (pola "adjusting state when props change") agar tidak memicu
  // cascading render via effect. Lihat:
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevItemId, setPrevItemId] = useState<string | null>(null);
  if (item && item.id !== prevItemId) {
    setPrevItemId(item.id);
    setTitle(item.title);
    setAlt(item.alt);
    setDescription(item.description ?? "");
    setTagsText(item.tags.join(", "));
    setCollectionId(item.collectionId ?? "");
    setOrderText(item.order === undefined ? "" : String(item.order));
    setCopied(false);
  }

  // Tutup dengan Escape; kunci scroll; fokuskan panel & kembalikan fokus saat
  // ditutup; jaga Tab tetap di dalam panel (focus trap).
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      // Kembalikan fokus ke elemen pemicu bila masih ada di DOM.
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [open, onClose]);

  if (!open || !item) return null;

  const trashed = item.status === "trashed";

  const submit = () => {
    onSave({
      title: title.trim(),
      alt: alt.trim() || title.trim(),
      description: description.trim(),
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      category: item.category,
      favorite: item.favorite,
      collectionId,
      order: orderText.trim() === "" ? undefined : Number(orderText),
    });
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(item.secureUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* abaikan */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[12500] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail media: ${item.title || item.publicId}`}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl focus:outline-none"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-sm font-bold text-secondary">Detail Media</h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSave({
                title: title.trim(),
                alt: alt.trim() || title.trim(),
                description: description.trim(),
                tags: tagsText
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                category: item.category,
                favorite: !item.favorite,
                collectionId,
                order: orderText.trim() === "" ? undefined : Number(orderText),
              })}
              aria-label={item.favorite ? "Hapus dari favorit" : "Tandai favorit"}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border transition-colors",
                item.favorite
                  ? "border-amber-200 bg-amber-50 text-amber-500"
                  : "border-slate-200 text-slate-500 hover:text-amber-500",
              )}
            >
              <Star className={cn("h-4 w-4", item.favorite && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel"
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* Preview */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-surface">
            <Image
              src={item.secureUrl}
              alt={item.alt || item.title || item.publicId}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover"
            />
            {trashed && (
              <span className="absolute top-2.5 left-2.5 rounded-full bg-rose-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                Di Trash
              </span>
            )}
          </div>

          {/* Aksi cepat */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyUrl}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Tersalin" : "Salin URL"}
            </button>
            <a
              href={item.secureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka
            </a>
            <a
              href={item.secureUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh
            </a>
          </div>

          {/* Info teknis */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-2xl bg-surface px-4 py-3.5 text-xs">
            <Info label="Dimensi" value={`${item.width}×${item.height}`} />
            <Info label="Ukuran" value={`${(item.bytes / 1024).toFixed(0)} KB`} />
            <Info label="Format" value={item.format.toUpperCase() || "—"} />
            <Info
              label="Diunggah"
              value={
                item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"
              }
            />
            <div className="col-span-2">
              <dt className="text-muted">Public ID</dt>
              <dd className="mt-0.5 truncate font-mono text-[11px] text-secondary">
                {item.publicId}
              </dd>
            </div>
            {item.uploadedBy && (
              <div className="col-span-2">
                <dt className="text-muted">Pengunggah</dt>
                <dd className="mt-0.5 truncate text-secondary">{item.uploadedBy}</dd>
              </div>
            )}
          </dl>

          {/* Dipakai di (Fase M3) */}
          <div>
            <h3 className="text-xs font-bold tracking-wide text-muted uppercase">
              Dipakai di
            </h3>
            {item.usedIn.length === 0 ? (
              <p className="mt-2 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-xs text-muted">
                Tidak dipakai di konten mana pun.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {item.usedIn.map((u, i) => (
                  <li
                    key={`${u.type}-${u.refId}-${i}`}
                    className="rounded-xl bg-surface px-3 py-2 text-xs text-secondary"
                  >
                    <span className="font-semibold">{u.label}</span>
                    <span className="text-muted"> · {u.field}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Riwayat (audit trail) */}
          <div>
            <h3 className="text-xs font-bold tracking-wide text-muted uppercase">
              Riwayat
            </h3>
            {auditLoading ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memuat riwayat…
              </p>
            ) : audit.length === 0 ? (
              <p className="mt-2 text-xs text-muted">Belum ada riwayat.</p>
            ) : (
              <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                {audit.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-secondary">
                      {AUDIT_LABEL[a.action] ?? a.action}
                    </span>
                    <span className="shrink-0 text-muted">
                      {a.atISO
                        ? new Date(a.atISO).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form edit */}
          <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold tracking-wide text-muted uppercase">
              Edit metadata
            </h3>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">Judul</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={fieldBase}
                placeholder="Judul aset"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">
                Teks alternatif (alt)
              </span>
              <input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className={fieldBase}
                placeholder="Deskripsi gambar untuk a11y/SEO"
              />
              <span className="text-xs text-muted">
                Kosongkan untuk memakai judul.
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">
                Deskripsi
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={cn(fieldBase, "resize-none")}
                placeholder="Keterangan singkat (opsional)"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">Tag</span>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                className={fieldBase}
                placeholder="Pisahkan dengan koma, mis. mockup, kopi"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">
                Kategori
              </span>
              <select
                value={item.category}
                onChange={(e) =>
                  onChangeCategory(item, e.target.value as MediaCategory)
                }
                className={fieldBase}
              >
                {MEDIA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {MEDIA_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">
                Koleksi
              </span>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className={fieldBase}
              >
                <option value="">— Tanpa koleksi —</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">
                Urutan (galeri proyek)
              </span>
              <input
                type="number"
                value={orderText}
                onChange={(e) => setOrderText(e.target.value)}
                placeholder="mis. 1, 2, 3 (kosong = otomatis)"
                className={fieldBase}
              />
              <span className="text-xs text-muted">
                Angka kecil tampil lebih dulu di galeri portofolio. Kosongkan
                untuk urut otomatis (terbaru dulu).
              </span>
            </label>

            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan perubahan
            </button>
          </div>

          {/* Zona bahaya */}
          <div className="mt-auto border-t border-slate-100 pt-5">
            {trashed ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onRestore(item)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                >
                  Pulihkan
                </button>
                <button
                  type="button"
                  onClick={() => onHardDelete(item)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition-all hover:bg-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus permanen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onTrash(item)}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                Pindah ke Trash
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-secondary">{value}</dd>
    </div>
  );
}
