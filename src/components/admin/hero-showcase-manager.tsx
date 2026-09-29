"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useSiteContent } from "@/components/admin/use-site-content";
import {
  deleteImage,
  type CloudinaryAsset,
} from "@/lib/cloudinary-client";
import type {
  HeroShowcase,
  HeroShowcaseEffect,
  HeroShowcaseImage,
} from "@/lib/content-types";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

type ColumnKey = "browser" | "mobile";

export function HeroShowcaseManager() {
  const { content, loading, saving, error, setError, reload, commit } =
    useSiteContent();
  const hero = content.hero;

  // Perubahan lokal disimpan di draft agar mengetik/atur terasa mulus.
  const [draft, setDraft] = useState<HeroShowcase | null>(null);
  const view = draft ?? hero;
  const dirty = draft !== null;

  const patch = (p: Partial<HeroShowcase>) =>
    setDraft({ ...view, ...p });

  const setImages = (key: ColumnKey, images: HeroShowcaseImage[]) =>
    patch({ [key]: images } as Partial<HeroShowcase>);

  const addImage = (key: ColumnKey, asset: CloudinaryAsset, alt: string) => {
    const next: HeroShowcaseImage = {
      url: asset.secureUrl,
      publicId: asset.publicId,
      alt,
    };
    setImages(key, [...view[key], next]);
  };

  const updateAlt = (key: ColumnKey, i: number, alt: string) =>
    setImages(
      key,
      view[key].map((img, j) => (j === i ? { ...img, alt } : img)),
    );

  const move = (key: ColumnKey, i: number, dir: -1 | 1) => {
    const arr = [...view[key]];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setImages(key, arr);
  };

  const removeImage = async (key: ColumnKey, i: number) => {
    const img = view[key][i];
    if (!confirm("Hapus gambar ini dari daftar?")) return;
    // Opsi: hapus aset Cloudinary sekalian.
    if (
      img.publicId &&
      confirm(
        "Hapus juga berkas gambar di Cloudinary?\n\nOK = hapus berkas (permanen)\nBatal = hapus dari daftar saja",
      )
    ) {
      try {
        await deleteImage(img.publicId);
      } catch {
        /* abaikan bila aset sudah tidak ada */
      }
    }
    setImages(
      key,
      view[key].filter((_, j) => j !== i),
    );
  };

  const save = async () => {
    if (!draft) return;
    const ok = await commit({ hero: draft });
    if (ok) setDraft(null);
  };

  const reloadAll = async () => {
    setDraft(null);
    await reload();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Memuat pengaturan hero…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={reloadAll}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", saving && "animate-spin")} />
          Muat ulang
        </button>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Pengaturan umum */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-secondary">Pengaturan umum</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">Status</span>
            <button
              type="button"
              onClick={() => patch({ enabled: !view.enabled })}
              className={cn(
                "inline-flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors",
                view.enabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                  : "border-slate-200 bg-white text-slate-500",
              )}
            >
              {view.enabled ? "Carousel aktif" : "Carousel nonaktif"}
              <span
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  view.enabled ? "bg-emerald-500" : "bg-slate-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                    view.enabled ? "left-4" : "left-0.5",
                  )}
                />
              </span>
            </button>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">
              Interval ganti (detik)
            </span>
            <input
              type="number"
              min={2}
              max={15}
              value={view.interval}
              onChange={(e) =>
                patch({
                  interval: Math.min(
                    15,
                    Math.max(2, Number(e.target.value) || 4),
                  ),
                })
              }
              className={fieldBase}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-secondary">
              Efek transisi
            </span>
            <select
              value={view.effect}
              onChange={(e) =>
                patch({ effect: e.target.value as HeroShowcaseEffect })
              }
              className={fieldBase}
            >
              <option value="fade">Fade (memudar)</option>
              <option value="slide">Slide (geser)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Dua kolom: browser & ponsel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseColumn
          title="Mockup Browser (desktop)"
          hint="Disarankan rasio 16:10 (mis. 1600×1000)."
          folder="lktech/hero/browser"
          images={view.browser}
          onAdd={(asset, alt) => addImage("browser", asset, alt)}
          onAlt={(i, alt) => updateAlt("browser", i, alt)}
          onMove={(i, dir) => move("browser", i, dir)}
          onRemove={(i) => removeImage("browser", i)}
          onError={setError}
        />
        <ShowcaseColumn
          title="Mockup Ponsel"
          hint="Disarankan rasio 9:16 (mis. 720×1280)."
          folder="lktech/hero/mobile"
          images={view.mobile}
          onAdd={(asset, alt) => addImage("mobile", asset, alt)}
          onAlt={(i, alt) => updateAlt("mobile", i, alt)}
          onMove={(i, dir) => move("mobile", i, dir)}
          onRemove={(i) => removeImage("mobile", i)}
          onError={setError}
        />
      </div>

      {dirty && (
        <p className="text-xs text-amber-600">
          Ada perubahan yang belum disimpan.
        </p>
      )}
    </div>
  );
}

function ShowcaseColumn({
  title,
  hint,
  folder,
  images,
  onAdd,
  onAlt,
  onMove,
  onRemove,
  onError,
}: {
  title: string;
  hint: string;
  folder: string;
  images: HeroShowcaseImage[];
  onAdd: (asset: CloudinaryAsset, alt: string) => void;
  onAlt: (i: number, alt: string) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
  onError: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onError("File harus berupa gambar.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Ukuran maksimal 5MB.");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const { uploadImage } = await import("@/lib/cloudinary-client");
      const asset = await uploadImage(file, {
        folder,
        onProgress: setProgress,
      });
      onAdd(asset, file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-secondary">{title}</h2>
      <p className="mt-1 text-xs text-muted">{hint}</p>

      {/* Tombol upload */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-surface px-4 py-4 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Mengunggah… {progress}%
          </>
        ) : (
          <>+ Unggah gambar</>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Daftar gambar */}
      {images.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-6 text-center text-xs text-muted">
          Belum ada gambar. Unggah minimal satu.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {images.map((img, i) => (
            <li
              key={`${img.url}-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5"
            >
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                <Image
                  src={img.url}
                  alt={img.alt || `Gambar ${i + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <input
                value={img.alt}
                onChange={(e) => onAlt(i, e.target.value)}
                placeholder="Teks alternatif (alt)"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(i, -1)}
                  disabled={i === 0}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:text-primary disabled:opacity-40"
                  aria-label="Naikkan"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(i, 1)}
                  disabled={i === images.length - 1}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:text-primary disabled:opacity-40"
                  aria-label="Turunkan"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
