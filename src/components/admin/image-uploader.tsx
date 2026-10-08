"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, ImageUp, Loader2, Trash2, UploadCloud } from "lucide-react";
import {
  deleteImage,
  uploadImage,
  type CloudinaryAsset,
} from "@/lib/cloudinary-client";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB as MAX_MB } from "@/lib/upload-limits";

/**
 * Komponen upload gambar ke Cloudinary (signed upload).
 * Mendukung klik & drag-drop, preview, progres, dan hapus.
 *
 * `removeRemote` (default true): hapus juga berkas di Cloudinary saat klik hapus.
 * Matikan (false) bila gambar bisa masih dipakai di tempat lain (mis. sampul
 * artikel), agar berkas tidak hilang; pembersihan dilakukan via halaman orphans.
 */
export function ImageUploader({
  value,
  onChange,
  folder,
  label = "Unggah gambar",
  removeRemote = true,
}: {
  value: CloudinaryAsset | null;
  onChange: (asset: CloudinaryAsset | null) => void;
  folder?: string;
  label?: string;
  removeRemote?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Ukuran maksimal ${MAX_MB}MB.`);
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const asset = await uploadImage(file, { folder, onProgress: setProgress });
      onChange(asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onRemove = async () => {
    if (!value) return;
    if (!confirm("Hapus gambar ini?")) return;
    setBusy(true);
    setError(null);
    try {
      if (removeRemote) await deleteImage(value.publicId);
      onChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-secondary">{label}</span>

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="relative aspect-[16/10] w-full bg-surface">
            <Image
              src={value.secureUrl}
              alt="Gambar terunggah"
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-xs text-muted">
              <p className="truncate font-medium text-secondary">
                {value.publicId.split("/").pop()}
              </p>
              <p>
                {value.width}×{value.height} · {(value.bytes / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={busy}
          className={cn(
            "flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white px-6 text-center transition-colors",
            dragging
              ? "border-primary bg-primary-50/50"
              : "border-slate-200 hover:border-primary/40 hover:bg-surface",
            busy && "opacity-70",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-sm font-medium text-secondary">
                Mengunggah... {progress}%
              </span>
              <span className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary">
                <ImageUp className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium text-secondary">
                Klik atau seret gambar ke sini
              </span>
              <span className="text-xs text-muted">
                PNG, JPG, WebP · maks {MAX_MB}MB
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />

      {error && (
        <span className="flex items-center gap-1.5 text-xs text-rose-500">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </span>
      )}

      {!value && !busy && (
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <UploadCloud className="h-3.5 w-3.5" />
          Diunggah aman ke Cloudinary dengan signed upload.
        </span>
      )}
    </div>
  );
}
