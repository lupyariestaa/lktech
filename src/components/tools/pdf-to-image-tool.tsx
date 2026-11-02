"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { ImageDropzone } from "@/components/tools/image-dropzone";
import { Button, ButtonAnchor } from "@/components/ui/button";
import { formatBytes } from "@/lib/tools/image-tool-pure";
import {
  PDF_LIMITS,
  buildPageImageName,
  computePageRenderSize,
  parsePageRange,
  validatePdfFile,
} from "@/lib/tools/pdf-tool-pure";
import { canvasToBlob, createCanvas } from "@/lib/tools/image-client";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Status = "idle" | "working" | "done" | "error";
type ImageFormat = "png" | "jpeg";

type Result = {
  page: number;
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
};

const SCALE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: "72 dpi (1×)" },
  { value: 1.5, label: "108 dpi (1,5×)" },
  { value: 2, label: "144 dpi (2×, disarankan)" },
  { value: 3, label: "216 dpi (3×)" },
];

const ACCEPT = "application/pdf,.pdf";

/** Tool PDF ke Gambar — render halaman PDF jadi PNG/JPG, lokal di browser. */
export function PdfToImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [scale, setScale] = useState(2);
  const [rangeInput, setRangeInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Result[]>([]);

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const urlsRef = useRef<Set<string>>(new Set());

  useEffect(
    () => () => {
      for (const url of urlsRef.current) URL.revokeObjectURL(url);
      urlsRef.current.clear();
      docRef.current?.loadingTask.destroy().catch(() => {});
      docRef.current = null;
    },
    [],
  );

  const clearResults = () => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current.clear();
    setResults([]);
  };

  const reset = () => {
    clearResults();
    docRef.current?.loadingTask.destroy().catch(() => {});
    docRef.current = null;
    setFile(null);
    setPageCount(0);
    setRangeInput("");
    setError(null);
    setNotice(null);
    setStatus("idle");
    setProgress({ done: 0, total: 0 });
  };

  const onFiles = async (files: FileList | File[]) => {
    const picked = Array.from(files)[0];
    if (!picked) return;

    const check = validatePdfFile(picked);
    if (!check.ok) {
      reset();
      setError(check.reason);
      setStatus("error");
      return;
    }

    clearResults();
    docRef.current?.loadingTask.destroy().catch(() => {});
    docRef.current = null;
    setFile(null);
    setPageCount(0);
    setError(null);
    setNotice(null);
    setStatus("working");

    try {
      const buffer = await picked.arrayBuffer();
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({
        data: buffer,
        cMapUrl: "/pdfjs/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/pdfjs/standard_fonts/",
        wasmUrl: "/pdfjs/wasm/",
        iccUrl: "/pdfjs/iccs/",
      }).promise;

      docRef.current = doc;
      setFile(picked);
      setPageCount(doc.numPages);
      setRangeInput("");
      setStatus("idle");
      if (doc.numPages > PDF_LIMITS.maxPages) {
        setNotice(
          `PDF ini punya ${doc.numPages} halaman. Sekali proses dibatasi ${PDF_LIMITS.maxPages} halaman — pilih rentang halaman untuk bagian lainnya.`,
        );
      }
    } catch (e) {
      setError(describeError(e));
      setStatus("error");
    }
  };

  const render = async () => {
    const doc = docRef.current;
    if (!doc || !file) return;

    const parsed = parsePageRange(rangeInput, doc.numPages);
    if (!parsed.ok) {
      setError(parsed.error);
      setStatus("error");
      return;
    }

    let pages = parsed.pages;
    let truncated = false;
    if (pages.length > PDF_LIMITS.maxPages) {
      pages = pages.slice(0, PDF_LIMITS.maxPages);
      truncated = true;
    }

    clearResults();
    setError(null);
    setStatus("working");
    setNotice(
      truncated
        ? `Rentang berisi ${parsed.pages.length} halaman; hanya ${PDF_LIMITS.maxPages} halaman pertama yang diproses.`
        : null,
    );
    setProgress({ done: 0, total: pages.length });

    try {
      const batch: Result[] = [];
      let done = 0;
      for (const pageNumber of pages) {
        const page = await doc.getPage(pageNumber);
        try {
          const base = page.getViewport({ scale: 1 });
          const size = computePageRenderSize(base.width, base.height, scale);
          const viewport = page.getViewport({ scale: size.scale });
          const canvas = createCanvas(viewport.width, viewport.height);
          await page.render({ canvas, viewport, background: "#ffffff" }).promise;

          const blob = await canvasToBlob(
            canvas,
            format === "jpeg" ? "image/jpeg" : "image/png",
            format === "jpeg" ? 0.92 : undefined,
          );
          const url = URL.createObjectURL(blob);
          urlsRef.current.add(url);
          batch.push({
            page: pageNumber,
            url,
            name: buildPageImageName(
              file.name,
              pageNumber,
              doc.numPages,
              format === "jpeg" ? "jpg" : "png",
            ),
            size: blob.size,
            width: canvas.width,
            height: canvas.height,
          });
        } finally {
          page.cleanup();
        }
        done += 1;
        setProgress({ done, total: pages.length });
        setResults([...batch]);
      }
      setStatus("done");
    } catch (e) {
      setError(describeError(e));
      setStatus("error");
    }
  };

  const working = status === "working";

  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {status === "working"
          ? progress.total > 0
            ? `Merender halaman ${progress.done} dari ${progress.total}.`
            : "Membaca berkas PDF."
          : status === "done"
            ? `${results.length} gambar siap diunduh.`
            : status === "error"
              ? `Gagal: ${error ?? "kesalahan tidak diketahui"}`
              : ""}
      </p>

      {!file ? (
        <ImageDropzone
          onFiles={onFiles}
          accept={ACCEPT}
          disabled={working}
          label="Pilih berkas PDF"
          hint={`Maks ${formatBytes(PDF_LIMITS.maxFileBytes)}, ${PDF_LIMITS.maxPages} halaman per proses.`}
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-secondary">{file.name}</p>
                <p className="text-xs text-muted">
                  {formatBytes(file.size)} · {pageCount} halaman
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={working}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Ganti berkas
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
              <span className="text-xs font-semibold text-secondary">Format</span>
              <select
                value={format}
                disabled={working}
                onChange={(e) => setFormat(e.target.value as ImageFormat)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPG</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
              <span className="text-xs font-semibold text-secondary">Resolusi</span>
              <select
                value={scale}
                disabled={working}
                onChange={(e) => setScale(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              >
                {SCALE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4">
              <span className="text-xs font-semibold text-secondary">Halaman</span>
              <input
                type="text"
                value={rangeInput}
                disabled={working}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="semua (mis. 1-3,5)"
                spellCheck={false}
                autoComplete="off"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={render} disabled={working}>
              {working ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Merender… {progress.done}/{progress.total}
                </>
              ) : (
                "Render ke gambar"
              )}
            </Button>
          </div>
        </div>
      )}

      {notice && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {results.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <Check className="h-4 w-4" />
            {results.length} gambar siap diunduh
          </div>
          <p className="mt-1 text-xs text-muted">
            Unduh satu per satu. Browser umumnya memblokir unduhan massal otomatis.
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <li
                key={r.page}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200"
              >
                <span className="grid h-44 place-items-center overflow-hidden bg-surface">
                  {/* Object URL lokal. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.url}
                    alt={`Pratinjau halaman ${r.page}`}
                    className="max-h-44 w-full object-contain"
                  />
                </span>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-secondary">Hal. {r.page}</p>
                    <p className="text-[11px] text-muted">
                      {r.width} × {r.height} px · {formatBytes(r.size)}
                    </p>
                  </div>
                  <ButtonAnchor
                    href={r.url}
                    download={r.name}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    <Download className="h-4 w-4" />
                  </ButtonAnchor>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Terjemahkan error pdf.js menjadi pesan yang jujur & dapat ditindaklanjuti. */
function describeError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  if (name === "PasswordException") {
    return "PDF ini dilindungi kata sandi. Buka proteksinya dulu, lalu coba lagi.";
  }
  if (name === "InvalidPDFException") {
    return "Berkas ini bukan PDF yang valid atau rusak.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan saat merender PDF.";
}
