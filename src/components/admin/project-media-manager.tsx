"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import {
  listMedia,
  updateMedia,
} from "@/lib/admin-api";
import type { MediaItem } from "@/lib/media-types";
import { MediaPickerDialog } from "@/components/admin/media-picker-dialog";
import { useToast } from "@/components/admin/toast";
import { useRegisterDirty } from "@/components/admin/unsaved-changes";
import { cn } from "@/lib/utils";

/**
 * Kelola gambar proyek (cover + galeri) langsung dari form proyek.
 *
 * Gambar disimpan sebagai aset Media berkategori `portofolio` dengan
 * `projectSlug` = slug proyek. Gambar pertama (order terkecil) menjadi cover.
 *
 * Catatan: hanya tersedia untuk proyek yang SUDAH tersimpan (punya slug),
 * karena asosiasi media butuh slug.
 */
export function ProjectMediaManager({ projectSlug }: { projectSlug: string }) {
  const toast = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Tandai "kotor" saat ada perubahan urutan/hapus (agar guard aktif).
  const [dirty, setDirty] = useState(false);
  useRegisterDirty(dirty);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Ambil semua media kategori portofolio, lalu saring milik proyek ini.
      const res = await listMedia({ category: "portofolio", limit: 100 });
      // Muat sisa halaman bila ada.
      let acc = res.items;
      let cursor = res.nextCursor;
      let guard = 0;
      while (cursor && guard < 20) {
        const next = await listMedia({
          category: "portofolio",
          limit: 100,
          cursor,
        });
        acc = [...acc, ...next.items];
        cursor = next.nextCursor;
        guard += 1;
      }
      const mine = acc
        .filter((m) => m.projectSlug === projectSlug && m.status === "active")
        .sort(
          (a, b) =>
            (a.order ?? Number.POSITIVE_INFINITY) -
            (b.order ?? Number.POSITIVE_INFINITY),
        );
      setItems(mine);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat gambar.");
    } finally {
      setLoading(false);
    }
  }, [projectSlug, toast]);

  // Fetch awal — pola async IIFE (setState hanya setelah await).
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await listMedia({ category: "portofolio", limit: 100 });
        let acc = res.items;
        let cursor = res.nextCursor;
        let guard = 0;
        while (cursor && guard < 20) {
          const next = await listMedia({
            category: "portofolio",
            limit: 100,
            cursor,
          });
          acc = [...acc, ...next.items];
          cursor = next.nextCursor;
          guard += 1;
        }
        if (!active) return;
        setItems(
          acc
            .filter(
              (m) => m.projectSlug === projectSlug && m.status === "active",
            )
            .sort(
              (a, b) =>
                (a.order ?? Number.POSITIVE_INFINITY) -
                (b.order ?? Number.POSITIVE_INFINITY),
            ),
        );
      } catch (err) {
        if (active) {
          toast.error(
            err instanceof Error ? err.message : "Gagal memuat gambar.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // sengaja hanya saat mount/projectSlug berubah
  }, [projectSlug, toast]);

  // Persist urutan (order) ke media.
  const persistOrder = async (list: MediaItem[]) => {
    setBusy(true);
    try {
      await Promise.all(
        list.map((m, i) => updateMedia(m.id, { order: i })),
      );
      setDirty(false);
      toast.success("Urutan gambar disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan urutan.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onPick = async (selected: MediaItem[]) => {
    setPickerOpen(false);
    if (selected.length === 0) return;
    setBusy(true);
    try {
      const start = items.length;
      await Promise.all(
        selected.map((m, i) =>
          updateMedia(m.id, {
            category: "portofolio",
            projectSlug,
            order: start + i,
          }),
        ),
      );
      toast.success(`${selected.length} gambar ditambahkan.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah gambar.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: MediaItem) => {
    setBusy(true);
    try {
      await updateMedia(m.id, { projectSlug: "" });
      setItems((prev) => prev.filter((x) => x.id !== m.id));
      toast.success("Gambar dilepas dari proyek.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    setDirty(true);
    void persistOrder(next);
  };

  const makeCover = async (m: MediaItem) => {
    const next = [m, ...items.filter((x) => x.id !== m.id)];
    setItems(next);
    await persistOrder(next);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-secondary">Gambar Proyek</p>
          <p className="mt-0.5 text-xs text-muted">
            Gambar pertama = cover; sisanya galeri. Rasio disarankan 16:9.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
        >
          <ImageIcon className="h-4 w-4" />
          Pilih dari Media
        </button>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Memuat gambar...
        </div>
      ) : items.length === 0 ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-muted transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ImageIcon className="h-6 w-6" />
          <span className="text-sm font-medium">
            Belum ada gambar. Klik untuk memilih dari Media.
          </span>
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m, i) => (
            <div
              key={m.id}
              className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <Image
                src={m.secureUrl}
                alt={m.alt || m.title || `Gambar ${i + 1}`}
                fill
                sizes="200px"
                className="object-cover"
              />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                  <Star className="h-3 w-3" /> Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-slate-900/75 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busy}
                    aria-label="Geser ke kiri"
                    className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-slate-600 hover:text-primary disabled:opacity-40"
                  >
                    <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1 || busy}
                    aria-label="Geser ke kanan"
                    className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-slate-600 hover:text-primary disabled:opacity-40"
                  >
                    <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(m)}
                      disabled={busy}
                      aria-label="Jadikan cover"
                      className="grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-amber-500 hover:text-amber-600 disabled:opacity-40"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(m)}
                  disabled={busy}
                  aria-label="Hapus dari proyek"
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-rose-500 hover:bg-white",
                    busy && "opacity-50",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="multiple"
        title="Pilih gambar proyek"
        cropEnabled
        onSelect={onPick}
      />
    </div>
  );
}
