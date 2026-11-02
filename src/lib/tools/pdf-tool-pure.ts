/**
 * LOGIKA MURNI tool PDF ke Gambar (F2e).
 *
 * Bebas impor runtime (tanpa alias `@/`) agar diuji Node lewat
 * `--experimental-strip-types`. Standalone dengan sengaja: helper kecil
 * (`formatBytes`, sanitasi nama) diduplikasi dari tool gambar agar modul ini
 * tetap dapat diuji lewat Node tanpa impor lintas-modul ber-ekstensi.
 */

export const PDF_LIMITS = {
  /** Ukuran PDF maksimum. */
  maxFileBytes: 25 * 1024 * 1024,
  /** Jumlah halaman maksimum yang dirender sekali jalan. */
  maxPages: 30,
  /** Dimensi sisi terpanjang gambar hasil (px). */
  maxOutputDimension: 4096,
  minRenderScale: 0.5,
  maxRenderScale: 3,
} as const;

export type PdfFileMeta = { name?: string; type?: string; size?: number };
export type PdfValidation = { ok: true } | { ok: false; reason: string };

function localFormatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")} ${units[i]}`;
}

/** Apakah berkas PDF (tipe MIME atau ekstensi `.pdf`). */
export function isPdfType(type: string, name?: string): boolean {
  const t = (type ?? "").toLowerCase();
  if (t === "application/pdf") return true;
  if (!t) return /\.pdf$/i.test(name ?? "");
  return false;
}

/** Validasi awal berkas PDF (tipe deklarasi + ukuran). */
export function validatePdfFile(
  file: PdfFileMeta,
  opts: { maxBytes?: number } = {},
): PdfValidation {
  const maxBytes = opts.maxBytes ?? PDF_LIMITS.maxFileBytes;
  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: "Berkas kosong atau tidak dapat dibaca." };
  }
  if (size > maxBytes) {
    return {
      ok: false,
      reason: `Ukuran ${localFormatBytes(size)} melebihi batas ${localFormatBytes(maxBytes)}.`,
    };
  }
  if (!isPdfType(file.type ?? "", file.name)) {
    return { ok: false, reason: "Berkas harus berformat PDF." };
  }
  return { ok: true };
}

/** Skala render yang diizinkan (0.5–3); non-finite → 1. */
export function clampRenderScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(PDF_LIMITS.maxRenderScale, Math.max(PDF_LIMITS.minRenderScale, scale));
}

/**
 * Ukuran render halaman: skala yang diinginkan dibatasi juga agar sisi
 * terpanjang tidak melebihi `maxDim`.
 */
export function computePageRenderSize(
  pageWidthPt: number,
  pageHeightPt: number,
  desiredScale: number,
  maxDim: number = PDF_LIMITS.maxOutputDimension,
): { scale: number; width: number; height: number; capped: boolean } {
  const w = Math.max(1, Number.isFinite(pageWidthPt) ? pageWidthPt : 1);
  const h = Math.max(1, Number.isFinite(pageHeightPt) ? pageHeightPt : 1);
  const wanted = clampRenderScale(desiredScale);
  const longest = Math.max(w, h);
  const maxScale =
    Number.isFinite(maxDim) && maxDim > 0 ? maxDim / longest : wanted;
  const scale = Math.max(0.1, Math.min(wanted, maxScale));
  return {
    scale,
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    capped: scale < wanted - 1e-9,
  };
}

export type PageRangeResult =
  | { ok: true; pages: number[] }
  | { ok: false; error: string };

/**
 * Urai pemilihan halaman ("1-3, 5, 8-"). Kosong → semua halaman.
 * Mendukung bentuk terbuka `-4` (1–4) dan `8-` (8–akhir). Hanya halaman dalam
 * rentang 1..total yang dipertahankan, diurutkan, dan unik.
 */
export function parsePageRange(input: string, totalPages: number): PageRangeResult {
  const total = Math.max(0, Math.floor(Number.isFinite(totalPages) ? totalPages : 0));
  const raw = (input ?? "").trim();
  if (raw === "") {
    return { ok: true, pages: Array.from({ length: total }, (_, i) => i + 1) };
  }

  const selected = new Set<number>();
  for (const token of raw.split(/[,\s]+/).filter(Boolean)) {
    if (token.includes("-")) {
      const [startRaw, endRaw] = token.split("-", 2);
      const start = startRaw === "" ? 1 : Number(startRaw);
      const end = endRaw === "" ? total : Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return { ok: false, error: `Rentang halaman tidak valid: "${token}".` };
      }
      const lo = Math.max(1, Math.min(start, end));
      const hi = Math.min(total, Math.max(start, end));
      for (let p = lo; p <= hi; p += 1) selected.add(p);
    } else {
      const page = Number(token);
      if (!Number.isInteger(page)) {
        return { ok: false, error: `Nomor halaman tidak valid: "${token}".` };
      }
      if (page >= 1 && page <= total) selected.add(page);
    }
  }

  const pages = [...selected].sort((a, b) => a - b);
  if (pages.length === 0) {
    return { ok: false, error: "Tidak ada halaman yang dipilih pada rentang ini." };
  }
  return { ok: true, pages };
}

/** Nama berkas gambar hasil: `<nama>-hal-01.png` (nol di depan sesuai total). */
export function buildPageImageName(
  pdfName: string,
  page: number,
  totalPages: number,
  ext: string,
): string {
  const base = (pdfName ?? "")
    .replace(/\.[^./\\]+$/, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .trim()
    .slice(0, 60) || "dokumen";
  const pad = String(Math.max(1, Math.floor(totalPages))).length;
  return `${base}-hal-${String(page).padStart(pad, "0")}.${ext}`;
}
