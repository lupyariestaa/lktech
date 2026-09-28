"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { ImageUploader } from "@/components/admin/image-uploader";
import {
  deleteMedia,
  fetchMedia,
  saveMedia,
} from "@/lib/admin-api";
import type { CloudinaryAsset } from "@/lib/cloudinary-client";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABEL,
  type MediaCategory,
  type MediaItem,
} from "@/lib/media-types";
import { PROJECTS } from "@/lib/content";
import { cn } from "@/lib/utils";

export function MediaManager() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState<CloudinaryAsset | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MediaCategory>("portofolio");
  const [projectSlug, setProjectSlug] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
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

  useEffect(() => {
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
  }, []);

  const refresh = async () => {
    setLoading(true);
    await load();
  };

  const onSave = async () => {
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
        projectSlug: category === "portofolio" ? projectSlug : "",
      });
      setPending(null);
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan media.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item: MediaItem) => {
    if (!confirm(`Hapus "${item.title || item.publicId}"? Tindakan ini permanen.`))
      return;
    const prev = items;
    setItems((ls) => ls.filter((l) => l.id !== item.id));
    try {
      await deleteMedia(item.id, item.publicId);
    } catch (err) {
      setItems(prev);
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Panel upload */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-secondary">Unggah gambar baru</h2>
        <p className="mt-1 text-xs text-muted">
          Gambar diunggah langsung ke Cloudinary, lalu metadatanya disimpan.
        </p>

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
                Kategori
              </span>
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
                  {PROJECTS.map((p) => (
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
              onClick={onSave}
              disabled={!pending || saving}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Simpan ke Galeri
            </button>

            {!pending && (
              <p className="text-xs text-muted">
                Unggah gambar terlebih dahulu untuk mengaktifkan tombol simpan.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Galeri */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-secondary">
            Galeri Media ({items.length})
          </h2>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Muat ulang
          </button>
        </div>

        {loading ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-muted">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm">Memuat media...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <p className="text-sm font-medium text-secondary">
              Belum ada media.
            </p>
            <p className="mt-1 text-xs text-muted">
              Unggah gambar pertama Anda di atas.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <figure
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="relative aspect-[16/10] bg-surface">
                  <Image
                    src={item.secureUrl}
                    alt={item.title || item.publicId}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className="object-cover"
                  />
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-secondary backdrop-blur">
                    {MEDIA_CATEGORY_LABEL[item.category]}
                  </span>
                </div>
                <figcaption className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-secondary">
                      {item.title || "Tanpa judul"}
                    </p>
                    <p className="text-xs text-muted">
                      {item.width}×{item.height} ·{" "}
                      {(item.bytes / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(item)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
