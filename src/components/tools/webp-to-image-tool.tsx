"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileImage,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { ImageDropzone } from "@/components/tools/image-dropzone";
import { Button, ButtonAnchor } from "@/components/ui/button";
import { decodeImageFile } from "@/lib/tools/image-client";
import { formatBytes } from "@/lib/tools/image-tool-pure";
import {
  buildWebpOutputName,
  clampWebpOutputQuality,
  inspectWebpContainer,
  validateWebpDimensions,
  validateWebpFileMeta,
  WEBP_CONVERSION_LIMITS,
  WEBP_OUTPUTS,
  type WebpOutputFormat,
} from "@/lib/tools/webp-conversion-pure";
import { encodeWebpPixels } from "@/lib/tools/webp-image-encoder";

type Status = "idle" | "reading" | "ready" | "working" | "done" | "error";
type ImageInfo = { width: number; height: number; url: string };
type Result = { url: string; name: string; size: number; width: number; height: number };

const FORMATS = Object.keys(WEBP_OUTPUTS) as WebpOutputFormat[];

export function WebpToImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [format, setFormat] = useState<WebpOutputFormat>("png");
  const [quality, setQuality] = useState(0.9);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const inputUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const operationRef = useRef(0);

  useEffect(
    () => () => {
      operationRef.current += 1;
      if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    [],
  );

  const clearResult = () => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
  };

  const reset = () => {
    operationRef.current += 1;
    if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
    inputUrlRef.current = null;
    clearResult();
    setFile(null);
    setImage(null);
    setError(null);
    setStatus("idle");
  };

  const onFiles = async (files: FileList | File[]) => {
    const picked = Array.from(files)[0];
    if (!picked) return;
    reset();
    const operation = operationRef.current;
    const meta = validateWebpFileMeta(picked);
    if (!meta.ok) {
      setError(meta.reason);
      setStatus("error");
      return;
    }

    setStatus("reading");
    setError(null);
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      if (operationRef.current !== operation) return;
      const container = inspectWebpContainer(bytes);
      if (!container.ok) throw new Error(container.reason);
      if (container.animated) {
        throw new Error(
          "WebP animasi belum didukung. V1 hanya menerima WebP statis agar frame animasi tidak hilang tanpa pemberitahuan.",
        );
      }

      const headerDimensions = validateWebpDimensions(container.width, container.height);
      if (!headerDimensions.ok) throw new Error(headerDimensions.reason);

      const decoded = await decodeImageFile(picked);
      try {
        const dimensions = validateWebpDimensions(decoded.width, decoded.height);
        if (!dimensions.ok) throw new Error(dimensions.reason);
        if (decoded.width !== container.width || decoded.height !== container.height) {
          throw new Error("Dimensi hasil decode tidak cocok dengan header WebP.");
        }
        if (operationRef.current !== operation) return;

        const url = URL.createObjectURL(picked);
        inputUrlRef.current = url;
        setFile(picked);
        setImage({ width: decoded.width, height: decoded.height, url });
        setStatus("ready");
      } finally {
        decoded.release();
      }
    } catch (cause) {
      if (operationRef.current !== operation) return;
      setError(cause instanceof Error ? cause.message : "WebP tidak dapat dibaca.");
      setStatus("error");
    }
  };

  const convert = async () => {
    if (!file || !image || status === "working") return;
    clearResult();
    setError(null);
    setStatus("working");
    const operation = operationRef.current;

    try {
      const decoded = await decodeImageFile(file);
      let pixels: ImageData;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Kanvas gambar tidak tersedia di browser ini.");
        try {
          context.drawImage(decoded.source, 0, 0);
          pixels = context.getImageData(0, 0, image.width, image.height);
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      } finally {
        decoded.release();
      }

      const blob = await encodeWebpPixels(pixels, format, clampWebpOutputQuality(quality));
      if (operationRef.current !== operation) return;

      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        url,
        name: buildWebpOutputName(file.name, format),
        size: blob.size,
        width: image.width,
        height: image.height,
      });
      setStatus("done");
    } catch (cause) {
      if (operationRef.current !== operation) return;
      setError(cause instanceof Error ? cause.message : "Terjadi kesalahan saat mengubah gambar.");
      setStatus("error");
    }
  };

  const selectFormat = (next: WebpOutputFormat) => {
    clearResult();
    setFormat(next);
    setError(null);
    setStatus(file ? "ready" : "idle");
  };

  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {status === "reading"
          ? "Memeriksa dan membaca WebP secara lokal."
          : status === "working"
            ? `Sedang mengubah WebP menjadi ${WEBP_OUTPUTS[format].label}.`
            : status === "done"
              ? `Hasil ${WEBP_OUTPUTS[format].label} siap diunduh.`
              : status === "error"
                ? `Gagal memproses: ${error ?? "kesalahan tidak diketahui"}`
                : ""}
      </p>

      {!file ? (
        <ImageDropzone
          onFiles={onFiles}
          accept=".webp,image/webp"
          disabled={status === "reading"}
          hint={`WebP statis · maks ${formatBytes(WEBP_CONVERSION_LIMITS.maxFileBytes)} · maks 8 megapiksel`}
          label={status === "reading" ? "Memeriksa WebP…" : "Pilih berkas WebP"}
        />
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-6" aria-label="Pengaturan konversi WebP">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary">
                <FileImage className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-secondary">{file.name}</p>
                <p className="text-xs text-muted">
                  {formatBytes(file.size)} · {image?.width} × {image?.height} px · WebP
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={status === "working" || status === "reading"}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Ganti WebP
            </button>
          </div>

          {image && (
            <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="Pratinjau gambar WebP" className="h-full max-h-56 w-full object-contain" />
              </div>

              <div>
                <fieldset>
                  <legend className="text-sm font-semibold text-secondary">Format keluaran</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {FORMATS.map((item) => (
                      <label
                        key={item}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-primary/40 ${
                          format === item
                            ? "border-primary bg-primary-50 text-primary"
                            : "border-slate-200 text-secondary hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="webp-output-format"
                          value={item}
                          checked={format === item}
                          disabled={status === "working"}
                          onChange={() => selectFormat(item)}
                          className="accent-primary"
                        />
                        {WEBP_OUTPUTS[item].label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {(format === "jpeg" || format === "avif") && (
                  <label className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
                    <span className="flex items-center justify-between text-xs font-semibold text-secondary">
                      Kualitas <span className="font-mono text-muted">{clampWebpOutputQuality(quality).toFixed(2)}</span>
                    </span>
                    <input
                      type="range"
                      disabled={status === "working"}
                      min={WEBP_CONVERSION_LIMITS.minQuality}
                      max={WEBP_CONVERSION_LIMITS.maxQuality}
                      step={0.05}
                      value={quality}
                      onChange={(event) => {
                        clearResult();
                        setQuality(Number(event.target.value));
                        if (file) setStatus("ready");
                      }}
                      className="h-2 w-full cursor-pointer accent-primary"
                    />
                    <span className="text-[11px] text-muted">Kualitas lebih rendah biasanya menghasilkan berkas lebih kecil.</span>
                  </label>
                )}

                {format === "jpeg" && <FormatNote>JPG tidak mendukung transparansi; area transparan diratakan ke warna putih.</FormatNote>}
                {format === "bmp" && <FormatNote>BMP 24-bit tidak mendukung transparansi dan biasanya berukuran lebih besar; area transparan menjadi putih.</FormatNote>}
                {format === "gif" && <FormatNote>GIF statis memakai palet maksimal 256 warna dan transparansi satu tingkat. WebP animasi tidak didukung.</FormatNote>}
                {format === "avif" && <FormatNote>Encoder AVIF lokal dimuat saat konversi pertama; proses awal dapat memerlukan waktu lebih lama.</FormatNote>}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button onClick={convert} disabled={status === "working" || status === "reading" || !image}>
                    {status === "working" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Memproses…</> : `Ubah ke ${WEBP_OUTPUTS[format].label}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {result && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6" aria-label="Hasil konversi">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <Check className="h-4 w-4" aria-hidden="true" /> {WEBP_OUTPUTS[format].label} siap diunduh
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt={`Pratinjau hasil ${WEBP_OUTPUTS[format].label}`} className="h-full max-h-56 w-full object-contain" />
            </div>
            <dl className="grid grid-cols-2 content-start gap-3 text-sm">
              <Stat label="Ukuran asli" value={formatBytes(file?.size ?? 0)} />
              <Stat label="Ukuran hasil" value={formatBytes(result.size)} />
              <Stat label="Dimensi" value={`${result.width} × ${result.height} px`} />
              <Stat label="Format" value={WEBP_OUTPUTS[format].label} />
            </dl>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonAnchor href={result.url} download={result.name}>
              <Download className="h-4 w-4" aria-hidden="true" /> Unduh {result.name}
            </ButtonAnchor>
            <Button variant="outline" onClick={reset}>Mulai lagi</Button>
          </div>
        </section>
      )}
    </div>
  );
}

function FormatNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">{children}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-surface px-4 py-3"><dt className="text-[11px] font-medium text-muted">{label}</dt><dd className="mt-0.5 font-semibold text-secondary">{value}</dd></div>;
}
