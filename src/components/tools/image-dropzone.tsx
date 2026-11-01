"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Area unggah gambar: klik untuk memilih atau seret-lepas berkas. Tombol di
 * dalamnya dapat difokus keyboard; area seret hanya jalur alternatif.
 */
export function ImageDropzone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  hint,
  label = "Pilih gambar",
}: {
  onFiles: (files: FileList | File[]) => void;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  hint?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-3xl border-2 border-dashed p-8 text-center transition-colors",
        dragging ? "border-primary bg-primary-50" : "border-slate-200 bg-surface",
        disabled && "opacity-60",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-secondary shadow-sm transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed"
      >
        <ImagePlus className="h-4 w-4" />
        {label}
      </button>
      <p className="mt-3 text-xs text-muted">atau seret &amp; lepas gambar ke sini</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          // Reset agar berkas sama bisa dipilih ulang.
          e.target.value = "";
        }}
      />
    </div>
  );
}
