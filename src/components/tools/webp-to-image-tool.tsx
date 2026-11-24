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
import { decodeImageFile, preflightImageFile } from "@/lib/tools/image-client";
import { formatBytes } from "@/lib/tools/image-tool-pure";
import {
  buildWebpOutputName,
  clampWebpOutputQuality,
  hasExpectedWebpOutput,
  inspectWebpContainer,
  validateWebpDimensions,
  validateWebpFileMeta,
  WEBP_CONVERSION_LIMITS,
  WEBP_OUTPUTS,
  type WebpOutputFormat,
} from "@/lib/tools/webp-conversion-pure";
import { encodeWebpPixels } from "@/lib/tools/webp-image-encoder";
import {
  IMAGE_BATCH_LIMITS,
  makeUniqueOutputName,
  planBatchAddition,
  summarizeBatch,
  type BatchStatus,
} from "@/lib/tools/batch-pure";
import { buildZipStore } from "@/lib/tools/zip-store";
import { cn } from "@/lib/utils";

/** Batas batch khusus WebP→Gambar: lebih rendah dari Gambar→WebP karena
 *  AVIF bisa sangat lambat dan GIF perlu memori palet besar. */
const WEBP_BATCH_MAX_FILES = 20;
const WEBP_BATCH_TOTAL_BYTES = 80 * 1024 * 1024;

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

const FORMATS = Object.keys(WEBP_OUTPUTS) as WebpOutputFormat[];

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

const FORMAT_NOTES: Partial<Record<WebpOutputFormat, string>> = {
  jpeg: "JPG tidak mendukung transparansi; area transparan diratakan ke putih.",
  bmp: "BMP 24-bit tidak mendukung transparansi; area transparan diratakan ke putih.",
  gif: "GIF statis memakai palet maksimal 256 warna. WebP animasi tetap ditolak.",
  avif: "Encoder AVIF lokal dimuat saat konversi pertama; proses awal bisa lebih lama.",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function fileKey(file: File): string {
  return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}`;
}

function savingsLabel(item: QueueItem): string | null {
  const r = item.result;
  if (!r || item.file.size <= 0) return null;
  const delta = Math.round((1 - r.size / item.file.size) * 100);
  return `${r.width} × ${r.height} px · ${formatBytes(r.size)} · ${Math.abs(delta)}% ${
    delta >= 0 ? "lebih kecil" : "lebih besar"
  }`;
}

/** Validasi cepat berkas WebP sebelum masuk antrean (ukuran saja; container
 *  diperiksa saat decode agar tidak membaca seluruh berkas di tahap seleksi). */
function validateWebpForBatch(file: File): { ok: true } | { ok: false; reason: string } {
  if (!file.type || file.type.toLowerCase() !== "image/webp") {
    return { ok: false, reason: "Hanya berkas WebP yang diterima." };
  }
  return validateWebpFileMeta(file);
}

/**
 * Batch WebP ke Gambar: antrean berurutan, format & kualitas global,
 * hasil per item, ZIP lokal. WebP animasi tetap ditolak saat decode.
 */
export function WebpToImageTool() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [format, setFormat] = useState<WebpOutputFormat>("png");
  const [quality, setQuality] = useState(0.9);
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
        check: validateWebpForBatch(file),
      })),
      limits: {
        maxFiles: WEBP_BATCH_MAX_FILES,
        maxTotalBytes: WEBP_BATCH_TOTAL_BYTES,
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

  const runBatch = async (targetIds?: string[]) => {
    if (runningRef.current || zippingRef.current) return;
    const targets = items.filter(
      (item) =>
        item.status !== "success" &&
        (targetIds ? targetIds.includes(item.id) : true),
    );
    if (targets.length === 0) return;

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
          // 1. Preflight signature + dimensi dari maksimum 256 KiB.
          const preflight = await preflightImageFile(target.file);
          if (preflight.format !== "webp") {
            throw new Error("Header WebP tidak konsisten.");
          }

          // 2. Baca container lengkap untuk mendeteksi animasi sebelum decode.
          const bytes = new Uint8Array(await target.file.arrayBuffer());
          const container = inspectWebpContainer(bytes);
          if (!container.ok) throw new Error(container.reason);
          if (container.animated) {
            throw new Error(
              "WebP animasi belum didukung. Hanya WebP statis yang dapat dikonversi.",
            );
          }
          const dimCheck = validateWebpDimensions(container.width, container.height);
          if (!dimCheck.ok) throw new Error(dimCheck.reason);

          // 3. Decode piksel setelah kedua header setuju.
          if (preflight.width !== container.width || preflight.height !== container.height) {
            throw new Error("Header WebP tidak konsisten.");
          }
          decoded = await decodeImageFile(target.file);
          const decDimCheck = validateWebpDimensions(decoded.width, decoded.height);
          if (!decDimCheck.ok) throw new Error(decDimCheck.reason);
          if (decoded.width !== container.width || decoded.height !== container.height) {
            throw new Error("Dimensi hasil decode tidak cocok dengan header WebP.");
          }

          // 4. Ambil ImageData di canvas sementara
          let pixels: ImageData;
          const canvas = document.createElement("canvas");
          canvas.width = decoded.width;
          canvas.height = decoded.height;
          try {
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) throw new Error("Kanvas gambar tidak tersedia di browser ini.");
            ctx.drawImage(decoded.source, 0, 0);
            pixels = ctx.getImageData(0, 0, decoded.width, decoded.height);
          } finally {
            canvas.width = 1;
            canvas.height = 1;
          }

          // 5. Encode ke format target
          const blob = await encodeWebpPixels(pixels, format, clampWebpOutputQuality(quality));

          // 6. Verifikasi signature (encodeWebpPixels sudah verifikasi, lapisan tambahan)
          const header = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
          if (!hasExpectedWebpOutput(format, blob.type, header)) {
            throw new Error(
              `Signature hasil tidak cocok dengan format ${WEBP_OUTPUTS[format].label}.`,
            );
          }

          const name = makeUniqueOutputName(
            buildWebpOutputName(target.file.name, format),
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
                      width: decoded!.width,
                      height: decoded!.height,
                    },
                    error: undefined,
                  }
                : item,
            ),
          );
          succeeded += 1;
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
                          : "Terjadi kesalahan saat memproses berkas.",
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
              : `Selesai: ${succeeded} WebP berhasil diubah ke ${WEBP_OUTPUTS[format].label}.`,
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
      const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      urlsRef.current.add(url);
      const result = { url, name: `lktech-${format}.zip`, size: blob.size };
      zipRef.current = result;
      setZip(result);
      setNotice(`ZIP berisi ${entries.length} hasil siap diunduh.`);
    } catch (cause) {
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : "ZIP hasil tidak dapat dibuat.");
      }
    } finally {
      zippingRef.current = false;
      if (mountedRef.current) setZipping(false);
    }
  };

  const selectFormat = (next: WebpOutputFormat) => {
    if (runningRef.current || zippingRef.current) return;
    // Cabut hasil lama yang sudah tidak sesuai format baru
    for (const item of items) {
      if (item.result) revokeUrl(item.result.url);
    }
    clearZip();
    setItems((current) =>
      current.map((item) =>
        item.result ? { ...item, status: "waiting", result: undefined, error: undefined } : item,
      ),
    );
    setFormat(next);
    setNotice(null);
    setError(null);
  };

  const busy = running || zipping;
  const note = FORMAT_NOTES[format];

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
            <h2 className="text-lg font-bold text-secondary">Batch WebP ke Gambar</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Ubah hingga {WEBP_BATCH_MAX_FILES} WebP statis lokal ke format yang sama, lalu unduh
              satu per satu atau sebagai ZIP. WebP animasi tetap ditolak.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Diproses lokal
          </span>
        </div>

        <div className="mt-5">
          <ImageDropzone
            onFiles={addFiles}
            accept=".webp,image/webp"
            multiple
            disabled={busy}
            label={
              running
                ? "Memproses antrean…"
                : zipping
                  ? "Menyiapkan ZIP…"
                  : "Pilih beberapa WebP"
            }
            hint={`Maks. ${WEBP_BATCH_MAX_FILES} berkas WebP statis · ${formatBytes(
              WEBP_CONVERSION_LIMITS.maxFileBytes,
            )}/berkas · total ${formatBytes(WEBP_BATCH_TOTAL_BYTES)} · 8 megapiksel/gambar`}
          />
        </div>

        {items.length > 0 && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <fieldset disabled={busy}>
              <legend className="text-sm font-semibold text-secondary">Format keluaran</legend>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {FORMATS.map((item) => (
                  <label
                    key={item}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-primary/40",
                      format === item
                        ? "border-primary bg-primary-50 text-primary"
                        : "border-slate-200 text-secondary hover:border-primary/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="webp-output-format"
                      value={item}
                      checked={format === item}
                      disabled={busy}
                      onChange={() => selectFormat(item)}
                      className="accent-primary"
                    />
                    {WEBP_OUTPUTS[item].label}
                  </label>
                ))}
              </div>
              {note && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  {note}
                </p>
              )}
            </fieldset>

            {(format === "jpeg" || format === "avif") && (
              <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
                <span className="flex items-center justify-between text-xs font-semibold text-secondary">
                  Kualitas
                  <span className="font-mono text-muted">
                    {clampWebpOutputQuality(quality).toFixed(2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={WEBP_CONVERSION_LIMITS.minQuality}
                  max={WEBP_CONVERSION_LIMITS.maxQuality}
                  step={0.05}
                  value={quality}
                  disabled={busy}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-muted">
                  Kualitas lebih rendah biasanya menghasilkan berkas lebih kecil.
                </span>
              </label>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void runBatch()}
            disabled={busy || items.length === 0 || processable === 0}
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
            <Button variant="ghost" onClick={reset} disabled={busy}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Bersihkan
            </Button>
          )}
          {summary.success > 0 && (
            <Button
              variant="outline"
              onClick={() => void buildZip()}
              disabled={busy}
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
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {notice && !selectionErrors.length && (
        <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-secondary">{notice}</p>
      )}

      {items.length > 0 && (
        <section
          className="rounded-3xl border border-slate-200 bg-white p-6"
          aria-label="Antrean WebP"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-secondary">Antrean WebP</h2>
              <p className="mt-1 text-sm text-muted">
                {summary.total} item · {summary.success} berhasil · {summary.failed} gagal ·{" "}
                {summary.waiting + summary.processing + summary.cancelled} belum selesai
              </p>
            </div>
            <p className="text-xs text-muted">Format: {WEBP_OUTPUTS[format].label}</p>
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
                    <p className="truncate text-sm font-semibold text-secondary">
                      {item.file.name}
                    </p>
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
                        disabled={busy}
                      >
                        Ulangi
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={busy}
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
        <section
          className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6"
          aria-label="Hasil ZIP"
        >
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
