"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useSiteContent } from "@/components/admin/use-site-content";
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog";
import type { MediaItem } from "@/lib/media-types";
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

  // Kolom mana yang sedang membuka popup picker media.
  const [pickerFor, setPickerFor] = useState<ColumnKey | null>(null);

  const patch = (p: Partial<HeroShowcase>) => setDraft({ ...view, ...p });

  const setImages = (key: ColumnKey, images: HeroShowcaseImage[]) =>
    patch({ [key]: images } as Partial<HeroShowcase>);

  // Tambah gambar hasil pilih dari Media (hindari duplikat url).
  const addFromMedia = (key: ColumnKey, picked: MediaItem[]) => {
    const existing = new Set(view[key].map((img) => img.url));
    const additions: HeroShowcaseImage[] = picked
      .filter((m) => !existing.has(m.secureUrl))
      .map((m) => ({
        url: m.secureUrl,
        publicId: m.publicId,
        alt: m.title || "Pratinjau LKTech",
      }));
    if (additions.length === 0) return;
    setImages(key, [...view[key], ...additions]);
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

  const removeImage = (key: ColumnKey, i: number) => {
    if (!confirm("Hapus gambar ini dari daftar carousel?")) return;
    // Catatan: berkas tetap ada di galeri Media (tidak dihapus).
    setImages(
      key,
      view[key].filter((_, j) => j !== i),
    );
  };

  const save = async () => {
    if (!draft) return;
    const ok = await commit(
      { hero: draft },
      { successMessage: "Pengaturan hero berhasil disimpan." },
    );
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
          <div className="flex flex-col gap-1.5">
            <span
              id="hero-status-label"
              className="text-sm font-medium text-secondary"
            >
              Status
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={view.enabled}
              aria-labelledby="hero-status-label"
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
                aria-hidden="true"
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
          </div>

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
          images={view.browser}
          onAdd={() => setPickerFor("browser")}
          onAlt={(i, alt) => updateAlt("browser", i, alt)}
          onMove={(i, dir) => move("browser", i, dir)}
          onRemove={(i) => removeImage("browser", i)}
        />
        <ShowcaseColumn
          title="Mockup Ponsel"
          hint="Disarankan rasio 9:16 (mis. 720×1280)."
          images={view.mobile}
          onAdd={() => setPickerFor("mobile")}
          onAlt={(i, alt) => updateAlt("mobile", i, alt)}
          onMove={(i, dir) => move("mobile", i, dir)}
          onRemove={(i) => removeImage("mobile", i)}
        />
      </div>

      {dirty && (
        <p className="text-xs text-amber-600">
          Ada perubahan yang belum disimpan.
        </p>
      )}

      {/* Popup pemilih media (reusable) */}
      <MediaPickerDialog
        open={pickerFor !== null}
        onOpenChange={(o) => {
          if (!o) setPickerFor(null);
        }}
        mode="multiple"
        title="Pilih gambar dari Media"
        onSelect={(items) => {
          if (pickerFor) addFromMedia(pickerFor, items);
        }}
      />
    </div>
  );
}

function ShowcaseColumn({
  title,
  hint,
  images,
  onAdd,
  onAlt,
  onMove,
  onRemove,
}: {
  title: string;
  hint: string;
  images: HeroShowcaseImage[];
  onAdd: () => void;
  onAlt: (i: number, alt: string) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-secondary">{title}</h2>
          <p className="mt-1 text-xs text-muted">{hint}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-slate-500">
          {images.length} gambar
        </span>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-surface px-4 py-4 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/40 hover:text-primary"
      >
        <ImagePlus className="h-4 w-4" />
        Tambah dari Media
      </button>

      {images.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-6 text-center text-xs text-muted">
          Belum ada gambar. Klik &quot;Tambah dari Media&quot; — unggah gambar
          dulu di menu <span className="font-semibold">Media</span> bila belum
          ada.
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
