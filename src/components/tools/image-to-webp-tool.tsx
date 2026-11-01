"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Download, FileImage, Loader2, RotateCcw } from "lucide-react";
import { ImageDropzone } from "@/components/tools/image-dropzone";
import { Button, ButtonAnchor } from "@/components/ui/button";
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_LIMITS,
  buildOutputName,
  clampQuality,
  computeTargetSize,
  formatBytes,
  validateImageFile,
} from "@/lib/tools/image-tool-pure";
import {
  canEncodeImageType,
  canvasToBlob,
  createCanvas,
  decodeImageFile,
} from "@/lib/tools/image-client";
import { cn } from "@/lib/utils";

type Status = "idle" | "working" | "done" | "error";

type Result = {
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
};

const MAX_DIM_OPTIONS = [
  { value: IMAGE_LIMITS.maxOutputDimension, label: "Maks 4096 px (disarankan)" },
  { value: 2048, label: "Maks 2048 px" },
  { value: 1024, label: "Maks 1024 px" },
];

/** Tool Gambar ke WebP — konversi satu gambar lokal, sepenuhnya di browser. */
export function ImageToWebpTool() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [maxDim, setMaxDim] = useState<number>(IMAGE_LIMITS.maxOutputDimension);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const urlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const clearResult = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setResult(null);
  };

  const onFiles = (files: FileList | File[]) => {
    const picked = Array.from(files)[0];
    if (!picked) return;
    const check = validateImageFile(picked);
    clearResult();
    if (!check.ok) {
      setFile(null);
      setError(check.reason);
      setStatus("error");
      return;
    }
    setFile(picked);
    setError(null);
    setStatus("idle");
  };

  const reset = () => {
    clearResult();
    setFile(null);
    setError(null);
    setStatus("idle");
  };

  const convert = async () => {
    if (!file) return;
    clearResult();
    setStatus("working");
    setError(null);
    try {
      if (!canEncodeImageType("image/webp")) {
        throw new Error(
          "Browser ini tidak dapat membuat berkas WebP. Coba Chrome, Edge, atau Firefox terbaru.",
        );
      }
      const decoded = await decodeImageFile(file);
      try {
        const target = computeTargetSize(decoded.width, decoded.height, maxDim);
        const canvas = createCanvas(target.width, target.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Kanvas gambar tidak tersedia di browser ini.");
        ctx.drawImage(decoded.source, 0, 0, target.width, target.height);
        const blob = await canvasToBlob(canvas, "image/webp", clampQuality(quality));
        if (blob.type !== "image/webp") {
          throw new Error(
            `Browser mengembalikan format "${blob.type || "tidak diketahui"}", bukan WebP. Coba browser terbaru.`,
          );
        }

        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setResult({
          url,
          name: buildOutputName(file.name, "webp"),
          size: blob.size,
          width: target.width,
          height: target.height,
        });
        setStatus("done");
      } finally {
        decoded.release();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan saat memproses gambar.");
      setStatus("error");
    }
  };

  const savings =
    result && file && file.size > 0
      ? Math.round((1 - result.size / file.size) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {status === "working"
          ? "Sedang memproses gambar menjadi WebP."
          : status === "done"
            ? "Berkas WebP siap diunduh."
            : status === "error"
              ? `Gagal memproses: ${error ?? "kesalahan tidak diketahui"}`
              : ""}
      </p>
      {!file ? (
        <ImageDropzone
          onFiles={onFiles}
          accept={IMAGE_ACCEPT_ATTR}
          hint={`Maks ${formatBytes(IMAGE_LIMITS.maxFileBytes)} per berkas. PNG, JPG, WebP, GIF, BMP, AVIF.`}
          label="Pilih gambar"
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary">
                <FileImage className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-secondary">{file.name}</p>
                <p className="text-xs text-muted">
                  {formatBytes(file.size)} · {file.type || "tipe tidak diketahui"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Ganti gambar
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
              <span className="flex items-center justify-between text-xs font-semibold text-secondary">
                Kualitas
                <span className="font-mono text-muted">{clampQuality(quality).toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={IMAGE_LIMITS.minQuality}
                max={IMAGE_LIMITS.maxQuality}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
              <span className="text-[11px] text-muted">
                Kualitas lebih rendah → berkas lebih kecil.
              </span>
            </label>

            <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
              <span className="text-xs font-semibold text-secondary">Batas dimensi</span>
              <select
                value={maxDim}
                onChange={(e) => setMaxDim(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              >
                {MAX_DIM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-muted">
                Gambar besar diperkecil hanya bila melebihi batas.
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={convert} disabled={status === "working"}>
              {status === "working" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses…
                </>
              ) : (
                "Ubah ke WebP"
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {result && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <Check className="h-4 w-4" />
            WebP siap diunduh
          </div>

          <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface">
              {/* Object URL lokal; next/image tidak relevan di sini. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt="Pratinjau hasil WebP"
                className="h-full max-h-56 w-full object-contain"
              />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Ukuran asli" value={file ? formatBytes(file.size) : "-"} />
              <Stat label="Ukuran WebP" value={formatBytes(result.size)} />
              <Stat label="Dimensi" value={`${result.width} × ${result.height} px`} />
              <Stat
                label="Perubahan"
                value={file && savings > 0 ? `-${savings}%` : "—"}
                accent={file && savings > 0 ? "text-emerald-600" : undefined}
              />
            </dl>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonAnchor href={result.url} download={result.name}>
              <Download className="h-4 w-4" />
              Unduh WebP
            </ButtonAnchor>
            <Button variant="outline" onClick={reset}>
              Mulai lagi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <dt className="text-[11px] font-medium text-muted">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold text-secondary", accent)}>{value}</dd>
    </div>
  );
}
