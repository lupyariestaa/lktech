"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ImageDropzone } from "@/components/tools/image-dropzone";
import { Button, ButtonAnchor } from "@/components/ui/button";
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_LIMITS,
  PDF_PAGE_PRESETS,
  buildOutputName,
  computeTargetSize,
  fitImageOnPage,
  formatBytes,
  validateImageFile,
} from "@/lib/tools/image-tool-pure";
import { canvasToBlob, createCanvas, decodeImageFile } from "@/lib/tools/image-client";
import { cn } from "@/lib/utils";

type Status = "idle" | "working" | "done" | "error";
type PageMode = keyof typeof PDF_PAGE_PRESETS | "fit";

type Item = { id: string; file: File; previewUrl: string };
type Result = { url: string; name: string; size: number; pages: number };

const PAGE_OPTIONS: Array<{ value: PageMode; label: string }> = [
  { value: "a4", label: "A4 (potret)" },
  { value: "letter", label: "Letter (potret)" },
  { value: "fit", label: "Sesuaikan ukuran gambar" },
];

/** ID unik sederhana (fallback bila `crypto.randomUUID` tak tersedia). */
function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Tool Gambar ke PDF — gabungkan beberapa gambar lokal jadi satu PDF. */
export function ImageToPdfTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>("a4");
  const [margin, setMargin] = useState(24);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<Result | null>(null);

  const urlRef = useRef<string | null>(null);
  const previewsRef = useRef<Set<string>>(new Set());

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      for (const u of previewsRef.current) URL.revokeObjectURL(u);
    },
    [],
  );

  const clearResult = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setResult(null);
    setStatus((prev) => (prev === "done" ? "idle" : prev));
  };

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    const accepted: Item[] = [];
    const problems: string[] = [];
    let count = items.length;

    for (const f of incoming) {
      if (count >= IMAGE_LIMITS.maxPdfImages) {
        problems.push(`Maksimum ${IMAGE_LIMITS.maxPdfImages} gambar per PDF.`);
        break;
      }
      const check = validateImageFile(f);
      if (!check.ok) {
        problems.push(`${f.name}: ${check.reason}`);
        continue;
      }
      const previewUrl = URL.createObjectURL(f);
      previewsRef.current.add(previewUrl);
      accepted.push({ id: makeId(), file: f, previewUrl });
      count += 1;
    }

    if (accepted.length > 0) {
      setItems((prev) => [...prev, ...accepted]);
      clearResult();
    }
    setError(problems.length > 0 ? problems.join(" ") : null);
    if (problems.length > 0 && accepted.length === 0) setStatus("error");
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        previewsRef.current.delete(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
    clearResult();
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === id);
      const next = index + dir;
      if (index < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
    clearResult();
  };

  const reset = () => {
    for (const u of previewsRef.current) URL.revokeObjectURL(u);
    previewsRef.current.clear();
    clearResult();
    setItems([]);
    setError(null);
    setStatus("idle");
    setProgress({ done: 0, total: 0 });
  };

  const buildPdf = async () => {
    if (items.length === 0) return;
    clearResult();
    setStatus("working");
    setError(null);
    setProgress({ done: 0, total: items.length });
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      pdf.setProducer("LKTech Tools");
      pdf.setCreator("LKTech Tools");

      let done = 0;
      for (const item of items) {
        const decoded = await decodeImageFile(item.file);
        try {
          const target = computeTargetSize(
            decoded.width,
            decoded.height,
            IMAGE_LIMITS.maxOutputDimension,
          );
          const useJpeg = item.file.type === "image/jpeg";
          const canvas = createCanvas(target.width, target.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Kanvas gambar tidak tersedia di browser ini.");
          if (useJpeg) {
            // JPEG tak mendukung alfa → latar putih agar transparan tidak jadi hitam.
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, target.width, target.height);
          }
          ctx.drawImage(decoded.source, 0, 0, target.width, target.height);
          const blob = await canvasToBlob(
            canvas,
            useJpeg ? "image/jpeg" : "image/png",
            useJpeg ? 0.92 : undefined,
          );
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const embedded = useJpeg ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);

          const pageW =
            pageMode === "fit" ? target.width : PDF_PAGE_PRESETS[pageMode].width;
          const pageH =
            pageMode === "fit" ? target.height : PDF_PAGE_PRESETS[pageMode].height;
          const page = pdf.addPage([pageW, pageH]);
          const fit = fitImageOnPage(
            embedded.width,
            embedded.height,
            pageW,
            pageH,
            pageMode === "fit" ? 0 : margin,
          );
          page.drawImage(embedded, {
            x: fit.x,
            y: fit.y,
            width: fit.width,
            height: fit.height,
          });
        } finally {
          decoded.release();
        }
        done += 1;
        setProgress({ done, total: items.length });
      }

      const bytes = await pdf.save();
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setResult({
        url,
        name: buildOutputName(items[0]?.file.name ?? "", "pdf", "dokumen"),
        size: blob.size,
        pages: items.length,
      });
      setStatus("done");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Terjadi kesalahan saat menyusun PDF.",
      );
      setStatus("error");
    }
  };

  const working = status === "working";

  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {status === "working"
          ? `Menyusun PDF, ${progress.done} dari ${progress.total} gambar.`
          : status === "done"
            ? "PDF siap diunduh."
            : status === "error"
              ? `Gagal menyusun PDF: ${error ?? "kesalahan tidak diketahui"}`
              : ""}
      </p>
      <ImageDropzone
        onFiles={addFiles}
        accept={IMAGE_ACCEPT_ATTR}
        multiple
        disabled={working || items.length >= IMAGE_LIMITS.maxPdfImages}
        label={items.length === 0 ? "Pilih gambar" : "Tambah gambar"}
        hint={`Hingga ${IMAGE_LIMITS.maxPdfImages} gambar, maks ${formatBytes(
          IMAGE_LIMITS.maxFileBytes,
        )} per berkas.`}
      />

      {items.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-secondary">
              {items.length} gambar · urutan atas ke bawah
            </p>
            <button
              type="button"
              onClick={reset}
              disabled={working}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Kosongkan
            </button>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-surface p-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-xs font-bold text-primary shadow-sm">
                  {index + 1}
                </span>
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {/* Object URL lokal. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-secondary">
                    {item.file.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatBytes(item.file.size)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <IconButton
                    label="Naikkan urutan"
                    disabled={working || index === 0}
                    onClick={() => moveItem(item.id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label="Turunkan urutan"
                    disabled={working || index === items.length - 1}
                    onClick={() => moveItem(item.id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label="Hapus gambar"
                    disabled={working}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
              <span className="text-xs font-semibold text-secondary">Ukuran halaman</span>
              <select
                value={pageMode}
                onChange={(e) => {
                  setPageMode(e.target.value as PageMode);
                  clearResult();
                }}
                disabled={working}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              >
                {PAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              className={cn(
                "flex flex-col gap-2 rounded-2xl border border-slate-200 p-4",
                pageMode === "fit" && "opacity-50",
              )}
            >
              <span className="flex items-center justify-between text-xs font-semibold text-secondary">
                Tepi halaman
                <span className="font-mono text-muted">{margin} pt</span>
              </span>
              <input
                type="range"
                min={0}
                max={96}
                step={8}
                value={margin}
                disabled={working || pageMode === "fit"}
                onChange={(e) => {
                  setMargin(Number(e.target.value));
                  clearResult();
                }}
                className="h-2 w-full cursor-pointer accent-primary"
              />
              <span className="text-[11px] text-muted">
                Jarak putih di sekeliling gambar.
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={buildPdf} disabled={working}>
              {working ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyusun… {progress.done}/{progress.total}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Buat PDF
                </>
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
            PDF siap diunduh
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Stat label="Nama berkas" value={result.name} />
            <Stat label="Ukuran" value={formatBytes(result.size)} />
            <Stat label="Halaman" value={`${result.pages}`} />
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonAnchor href={result.url} download={result.name}>
              <Download className="h-4 w-4" />
              Unduh PDF
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

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <dt className="text-[11px] font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold text-secondary">{value}</dd>
    </div>
  );
}
