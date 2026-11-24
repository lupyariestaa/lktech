"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileArchive,
  FileImage,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
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
  preflightImageFile,
} from "@/lib/tools/image-client";
import {
  IMAGE_BATCH_LIMITS,
  makeUniqueOutputName,
  planBatchAddition,
  summarizeBatch,
  type BatchStatus,
} from "@/lib/tools/batch-pure";
import {
  inspectWebpContainer,
  validateWebpDimensions,
} from "@/lib/tools/webp-conversion-pure";
import { buildZipStore } from "@/lib/tools/zip-store";
import { cn } from "@/lib/utils";

type ItemStatus = BatchStatus;

type Result = {
  blob: Blob;
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
};

type QueueItem = {
  id: string;
  file: File;
  status: ItemStatus;
  result?: Result;
  error?: string;
};

type ZipResult = { url: string; name: string; size: number };
type Preset = "fast" | "balanced" | "high" | "manual";

const PRESETS: Array<{
  id: Exclude<Preset, "manual">;
  label: string;
  quality: number;
  maxDim: number;
  hint: string;
}> = [
  { id: "fast", label: "Web cepat", quality: 0.65, maxDim: 1600, hint: "Thumbnail & kartu" },
  { id: "balanced", label: "Seimbang", quality: 0.8, maxDim: 4096, hint: "Kualitas default" },
  { id: "high", label: "Kualitas tinggi", quality: 0.92, maxDim: 4096, hint: "Detail maksimal" },
];

const MAX_DIM_OPTIONS = [
  { value: IMAGE_LIMITS.maxOutputDimension, label: "Maks 4096 px (disarankan)" },
  { value: 2048, label: "Maks 2048 px" },
  { value: 1024, label: "Maks 1024 px" },
];

const STATUS_LABEL: Record<ItemStatus, string> = {
  waiting: "Menunggu",
  processing: "Memproses…",
  success: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

const STATUS_STYLE: Record<ItemStatus, string> = {
  waiting: "bg-slate-100 text-slate-600",
  processing: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
  cancelled: "bg-amber-50 text-amber-800",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function fileKey(file: File): string {
  return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}`;
}

function savingsLabel(item: QueueItem): string | null {
  const result = item.result;
  if (!result || item.file.size <= 0) return null;
  const delta = Math.round((1 - result.size / item.file.size) * 100);
  return `${result.width} × ${result.height} px · ${formatBytes(result.size)} · ${Math.abs(delta)}% ${
    delta >= 0 ? "lebih kecil" : "lebih besar"
  }`;
}

/**
 * Batch WebP Optimizer: antrean berurutan, hasil per item, dan ZIP lokal.
 * Semua decode/encode terjadi di browser; tidak ada jalur unggah.
 */
export function ImageToWebpTool() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [quality, setQuality] = useState(0.8);
  const [maxDim, setMaxDim] = useState<number>(IMAGE_LIMITS.maxOutputDimension);
  const [preset, setPreset] = useState<Preset>("balanced");
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionErrors, setSelectionErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [zip, setZip] = useState<ZipResult | null>(null);

  const urlsRef = useRef<Set<string>>(new Set());
  const zipRef = useRef<ZipResult | null>(null);
  const runningRef = useRef(false);
  const cancelRef = useRef(false);
  const zippingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const urls = urlsRef.current;
    return () => {
      mountedRef.current = false;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
      zipRef.current = null;
    };
  }, []);

  const summary = useMemo(
    () => summarizeBatch(items.map((item) => item.status)),
    [items],
  );
  const processable = items.filter((item) => item.status !== "success").length;
  const currentItem = items.find((item) => item.status === "processing");

  const revokeUrl = (url: string) => {
    if (urlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(url);
    }
  };

  const clearZip = () => {
    const current = zipRef.current;
    if (current) revokeUrl(current.url);
    zipRef.current = null;
    setZip(null);
  };

  const addFiles = (files: FileList | File[]) => {
    if (runningRef.current || zippingRef.current) return;
    const picked = Array.from(files);
    if (picked.length === 0) return;

    const plan = planBatchAddition({
      existingKeys: items.map((item) => fileKey(item.file)),
      existingBytes: items.reduce((total, item) => total + item.file.size, 0),
      candidates: picked.map((file) => ({
        key: fileKey(file),
        size: file.size,
        check: validateImageFile(file),
      })),
      limits: {
        maxFiles: IMAGE_BATCH_LIMITS.maxFiles,
        maxTotalBytes: IMAGE_BATCH_LIMITS.maxTotalBytes,
      },
    });

    if (plan.accepted.length > 0) {
      const accepted: QueueItem[] = plan.accepted.map((index) => ({
        id: newId(),
        file: picked[index] as File,
        status: "waiting",
      }));
      setItems((current) => [...current, ...accepted]);
      clearZip();
      setNotice(null);
      setError(null);
    }
    setSelectionErrors(
      plan.rejected.map(({ index, reason }) => `${picked[index]?.name ?? "Berkas"}: ${reason}`),
    );
  };

  const updatePreset = (next: (typeof PRESETS)[number]) => {
    setPreset(next.id);
    setQuality(next.quality);
    setMaxDim(next.maxDim);
  };

  const runBatch = async (targetIds?: string[]) => {
    if (runningRef.current || zippingRef.current) return;
    const targets = items.filter(
      (item) =>
        item.status !== "success" &&
        (targetIds ? targetIds.includes(item.id) : true),
    );
    if (targets.length === 0) return;
    if (!canEncodeImageType("image/webp")) {
      setError(
        "Browser ini tidak dapat membuat berkas WebP. Coba Chrome, Edge, atau Firefox terbaru.",
      );
      return;
    }

    clearZip();
    setError(null);
    setNotice(null);
    setSelectionErrors([]);
    runningRef.current = true;
    cancelRef.current = false;
    setRunning(true);
    setItems((current) =>
      current.map((item) =>
        targets.some((target) => target.id === item.id)
          ? { ...item, status: "waiting", error: undefined }
          : item,
      ),
    );

    const usedNames = new Set(
      items
        .filter((item) => item.result)
        .map((item) => item.result?.name.toLowerCase() ?? ""),
    );
    let succeeded = 0;
    let failed = 0;

    try {
      for (const target of targets) {
        if (cancelRef.current || !mountedRef.current) break;
        setItems((current) =>
          current.map((item) =>
            item.id === target.id
              ? { ...item, status: "processing", error: undefined }
              : item,
          ),
        );

        let decoded: Awaited<ReturnType<typeof decodeImageFile>> | null = null;
        try {
          await preflightImageFile(target.file);
          decoded = await decodeImageFile(target.file);
          const dimensionCheck = validateWebpDimensions(decoded.width, decoded.height);
          if (!dimensionCheck.ok) throw new Error(dimensionCheck.reason);

          const size = computeTargetSize(decoded.width, decoded.height, maxDim);
          const canvas = createCanvas(size.width, size.height);
          try {
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Kanvas gambar tidak tersedia di browser ini.");
            context.drawImage(decoded.source, 0, 0, size.width, size.height);

            const blob = await canvasToBlob(canvas, "image/webp", clampQuality(quality));
            if (blob.type !== "image/webp") {
              throw new Error(
                `Browser mengembalikan format "${blob.type || "tidak diketahui"}", bukan WebP.`,
              );
            }
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const container = inspectWebpContainer(bytes);
            if (!container.ok) {
              throw new Error(`Hasil WebP gagal diverifikasi: ${container.reason}`);
            }
            if (container.animated) {
              throw new Error("Hasil WebP tidak boleh berupa animasi.");
            }
            if (container.width !== size.width || container.height !== size.height) {
              throw new Error("Dimensi hasil WebP tidak sesuai dengan target.");
            }

            const name = makeUniqueOutputName(
              buildOutputName(target.file.name, "webp"),
              usedNames,
            );
            usedNames.add(name.toLowerCase());
            const url = URL.createObjectURL(blob);
            urlsRef.current.add(url);
            if (!mountedRef.current) {
              revokeUrl(url);
              break;
            }
            setItems((current) =>
              current.map((item) =>
                item.id === target.id
                  ? {
                      ...item,
                      status: "success",
                      result: {
                        blob,
                        url,
                        name,
                        size: blob.size,
                        width: size.width,
                        height: size.height,
                      },
                      error: undefined,
                    }
                  : item,
              ),
            );
            succeeded += 1;
          } finally {
            canvas.width = 1;
            canvas.height = 1;
          }
        } catch (cause) {
          failed += 1;
          if (mountedRef.current) {
            setItems((current) =>
              current.map((item) =>
                item.id === target.id
                  ? {
                      ...item,
                      status: "failed",
                      error:
                        cause instanceof Error
                          ? cause.message
                          : "Terjadi kesalahan saat memproses gambar.",
                    }
                  : item,
              ),
            );
          }
        } finally {
          decoded?.release();
        }
      }
    } finally {
      runningRef.current = false;
      if (mountedRef.current) {
        if (cancelRef.current) {
          setItems((current) =>
            current.map((item) =>
              item.status === "waiting" &&
              targets.some((target) => target.id === item.id)
                ? { ...item, status: "cancelled" }
                : item,
            ),
          );
          setNotice("Antrean dihentikan. Item yang belum diproses ditandai dibatalkan.");
        } else {
          setNotice(
            failed > 0
              ? `Selesai: ${succeeded} berhasil, ${failed} gagal. Item gagal dapat diulang.`
              : `Selesai: ${succeeded} gambar berhasil diubah ke WebP.`,
          );
        }
        setRunning(false);
      }
    }
  };

  const cancelBatch = () => {
    if (!runningRef.current) return;
    cancelRef.current = true;
    setNotice("Menghentikan setelah item yang sedang diproses…");
  };

  const removeItem = (id: string) => {
    if (runningRef.current || zippingRef.current) return;
    const target = items.find((item) => item.id === id);
    if (!target) return;
    if (target.result) revokeUrl(target.result.url);
    setItems((current) => current.filter((item) => item.id !== id));
    clearZip();
    setNotice(null);
  };

  const reset = () => {
    if (runningRef.current || zippingRef.current) return;
    for (const item of items) {
      if (item.result) revokeUrl(item.result.url);
    }
    clearZip();
    setItems([]);
    setError(null);
    setSelectionErrors([]);
    setNotice(null);
  };

  const buildZip = async () => {
    if (runningRef.current || zippingRef.current) return;
    const successes = items.filter((item) => item.result);
    if (successes.length === 0) return;
    const totalBytes = successes.reduce(
      (total, item) => total + (item.result?.size ?? 0),
      0,
    );
    if (totalBytes > IMAGE_BATCH_LIMITS.maxZipBytes) {
      setError(
        `Total hasil ${formatBytes(totalBytes)} melebihi batas aman ZIP ${formatBytes(
          IMAGE_BATCH_LIMITS.maxZipBytes,
        )}. Unduh hasil satu per satu.`,
      );
      return;
    }

    setZipping(true);
    zippingRef.current = true;
    setError(null);
    setNotice("Menyiapkan ZIP dari hasil yang sudah diverifikasi…");
    try {
      const entries: Array<{ name: string; data: Uint8Array }> = [];
      for (const item of successes) {
        if (!item.result) continue;
        entries.push({
          name: item.result.name,
          data: new Uint8Array(await item.result.blob.arrayBuffer()),
        });
      }
      const zipBytes = buildZipStore(entries);
      if (!mountedRef.current) return;
      clearZip();
      const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
        type: "application/zip",
      });
      const url = URL.createObjectURL(blob);
      urlsRef.current.add(url);
      const result = { url, name: "lktech-webp.zip", size: blob.size };
      zipRef.current = result;
      setZip(result);
      setNotice(`ZIP berisi ${entries.length} hasil siap diunduh.`);
    } catch (cause) {
      if (mountedRef.current) {
        setError(
          cause instanceof Error ? cause.message : "ZIP hasil tidak dapat dibuat.",
        );
      }
    } finally {
      zippingRef.current = false;
      if (mountedRef.current) setZipping(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {currentItem
          ? `Memproses ${currentItem.file.name}. ${summary.finished} dari ${summary.total} item selesai.`
          : (notice ?? "")}
      </p>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-secondary">Batch WebP Optimizer</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Ubah hingga {IMAGE_BATCH_LIMITS.maxFiles} gambar lokal secara berurutan,
              atur kualitas dan batas dimensi, lalu unduh hasil satu per satu atau sebagai ZIP.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Diproses lokal
          </span>
        </div>

        <div className="mt-5">
          <ImageDropzone
            onFiles={addFiles}
            accept={IMAGE_ACCEPT_ATTR}
            multiple
            disabled={running || zipping}
            label={
              running
                ? "Memproses antrean…"
                : zipping
                  ? "Menyiapkan ZIP…"
                  : "Pilih beberapa gambar"
            }
            hint={`Maks. ${IMAGE_BATCH_LIMITS.maxFiles} berkas · ${formatBytes(
              IMAGE_BATCH_LIMITS.maxFileBytes,
            )}/berkas · total ${formatBytes(
              IMAGE_BATCH_LIMITS.maxTotalBytes,
            )}. PNG, JPG, WebP, GIF, BMP, atau AVIF.`}
          />
          <p className="mt-2 text-xs leading-relaxed text-muted">
            GIF dan WebP animasi diproses sebagai satu frame statis. Output selalu WebP statis
            dan diverifikasi MIME serta signature-nya sebelum dapat diunduh.
          </p>
        </div>

        {items.length > 0 && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <fieldset disabled={running || zipping}>
              <legend className="text-sm font-semibold text-secondary">Preset</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={preset === item.id}
                    onClick={() => updatePreset(item)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                      preset === item.id
                        ? "border-primary bg-primary-50 text-primary"
                        : "border-slate-200 text-secondary hover:border-primary/40",
                    )}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 block text-[11px] opacity-75">{item.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3">
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
                  disabled={running || zipping}
                  onChange={(event) => {
                    setQuality(Number(event.target.value));
                    setPreset("manual");
                  }}
                  className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-muted">
                  Kualitas lebih rendah biasanya menghasilkan berkas lebih kecil.
                </span>
              </label>

              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
                <span className="text-xs font-semibold text-secondary">Batas dimensi</span>
                <select
                  value={maxDim}
                  disabled={running || zipping}
                  onChange={(event) => {
                    setMaxDim(Number(event.target.value));
                    setPreset("manual");
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:cursor-not-allowed"
                >
                  {MAX_DIM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted">
                  Tidak melakukan upscale; gambar yang lebih kecil dibiarkan.
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void runBatch()}
            disabled={running || zipping || items.length === 0 || processable === 0}
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Memproses…
              </>
            ) : (
              "Proses semua"
            )}
          </Button>
          {running && (
            <Button variant="outline" onClick={cancelBatch}>
              Hentikan antrean
            </Button>
          )}
          {items.length > 0 && (
            <Button variant="ghost" onClick={reset} disabled={running || zipping}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Bersihkan
            </Button>
          )}
          {summary.success > 0 && (
            <Button
              variant="outline"
              onClick={() => void buildZip()}
              disabled={running || zipping}
            >
              <FileArchive className="h-4 w-4" aria-hidden="true" />
              {zipping ? "Menyiapkan ZIP…" : "Buat ZIP hasil"}
            </Button>
          )}
        </div>
      </section>

      {selectionErrors.length > 0 && (
        <div role="alert" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Sebagian berkas tidak ditambahkan:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {selectionErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setSelectionErrors([])}
              aria-label="Tutup peringatan berkas"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-amber-800 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:outline-none"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {notice && !selectionErrors.length && (
        <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-secondary">{notice}</p>
      )}

      {items.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6" aria-label="Antrean gambar">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-secondary">Antrean gambar</h2>
              <p className="mt-1 text-sm text-muted">
                {summary.total} item · {summary.success} berhasil · {summary.failed} gagal ·{" "}
                {summary.waiting + summary.processing + summary.cancelled} belum selesai
              </p>
            </div>
            <p className="text-xs text-muted">Hasil divalidasi sebelum unduhan tersedia.</p>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {items.map((item) => {
              const savings = savingsLabel(item);
              return (
                <li key={item.id} className="flex items-start gap-3 py-4">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-primary">
                    {item.status === "processing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <FileImage className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-secondary">{item.file.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{formatBytes(item.file.size)}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-semibold",
                          STATUS_STYLE[item.status],
                        )}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                      {savings && <span className="text-emerald-700">{savings}</span>}
                    </div>
                    {item.error && (
                      <p className="mt-1 text-xs leading-relaxed text-rose-700">{item.error}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.result && (
                      <ButtonAnchor
                        href={item.result.url}
                        download={item.result.name}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" /> Unduh {item.result.name}
                      </ButtonAnchor>
                    )}
                    {item.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void runBatch([item.id])}
                        disabled={running || zipping}
                      >
                        Ulangi
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={running || zipping}
                      aria-label={`Hapus ${item.file.name} dari antrean`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {zip && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6" aria-label="Hasil ZIP">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <FileArchive className="h-4 w-4" aria-hidden="true" /> ZIP hasil siap diunduh
          </div>
          <p className="mt-2 text-sm text-emerald-900">
            {summary.success} hasil · {formatBytes(zip.size)}. ZIP berisi berkas yang sudah lolos
            verifikasi signature.
          </p>
          <div className="mt-4">
            <ButtonAnchor href={zip.url} download={zip.name}>
              <Download className="h-4 w-4" aria-hidden="true" /> Unduh {zip.name}
            </ButtonAnchor>
          </div>
        </section>
      )}
    </div>
  );
}
