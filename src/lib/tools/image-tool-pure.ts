/**
 * LOGIKA MURNI tool gambar: Gambar ke WebP (F2b) & Gambar ke PDF (F2c).
 *
 * Bebas impor runtime (tanpa alias `@/`) agar diuji Node lewat
 * `--experimental-strip-types`. Fungsi di sini tidak menyentuh DOM — dekode
 * & kanvas dilakukan di komponen klien; modul ini hanya menghitung validasi,
 * ukuran, nama berkas, dan geometri halaman PDF.
 */

/** Batas operasional tool gambar (jujur & dapat diubah di satu tempat). */
export const IMAGE_LIMITS = {
  /** Ukuran maksimum per berkas gambar. */
  maxFileBytes: 15 * 1024 * 1024,
  /** Jumlah maksimum gambar untuk satu PDF. */
  maxPdfImages: 20,
  /** Dimensi sisi terpanjang hasil (px). */
  maxOutputDimension: 4096,
  /** Batas sisi input sebelum browser menjalankan decoder gambar. */
  maxInputDimension: 8192,
  /** Batas piksel input sebelum browser menjalankan decoder gambar. */
  maxInputPixels: 8_000_000,
  minQuality: 0.1,
  maxQuality: 1,
} as const;

/** Tipe MIME gambar yang kami terima (validasi akhir tetap lewat decode). */
export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
] as const;

/** Atribut `accept` untuk `<input type="file">`. */
export const IMAGE_ACCEPT_ATTR = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".avif",
  "image/*",
].join(",");

/** Titik (pt) per milimeter (1 mm = 72/25.4 pt). */
export const MM_TO_PT = 72 / 25.4;

/** Ukuran halaman PDF bawaan (pt), orientasi portrait. */
export const PDF_PAGE_PRESETS = {
  a4: { label: "A4", width: 595.28, height: 841.89 },
  letter: { label: "Letter", width: 612, height: 792 },
} as const;

export type PdfPagePreset = keyof typeof PDF_PAGE_PRESETS;

// ===== Format & angka =====

/** Ubah titik desimal jadi koma (gaya angka Indonesia) tanpa ICU. */
function idNumber(n: number): string {
  return String(n).replace(".", ",");
}

/** Format ukuran byte menjadi string ringkas (mis. `1,5 MB`). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${idNumber(rounded)} ${units[i]}`;
}

/** Batasi kualitas ke `[0.1, 1]`; non-finite → default 0.8. */
export function clampQuality(q: number): number {
  if (!Number.isFinite(q)) return 0.8;
  return Math.min(IMAGE_LIMITS.maxQuality, Math.max(IMAGE_LIMITS.minQuality, q));
}

// ===== Validasi masuk =====

export type FileMeta = { name?: string; type?: string; size?: number };
export type ValidationResult = { ok: true } | { ok: false; reason: string };

/** Validasi dimensi deklaratif sebelum decoder/canvas mengalokasikan piksel. */
export function validateImageDimensions(
  width: number,
  height: number,
  limits: {
    maxDimension?: number;
    maxPixels?: number;
  } = {},
): ValidationResult {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    return { ok: false, reason: "Dimensi gambar tidak valid." };
  }
  const maxDimension = limits.maxDimension ?? IMAGE_LIMITS.maxInputDimension;
  const maxPixels = limits.maxPixels ?? IMAGE_LIMITS.maxInputPixels;
  if (width > maxDimension || height > maxDimension) {
    return {
      ok: false,
      reason: `Sisi gambar tidak boleh melebihi ${maxDimension.toLocaleString("id-ID")} px.`,
    };
  }
  if (width * height > maxPixels) {
    return {
      ok: false,
      reason: `Gambar melebihi batas ${formatPixels(maxPixels)} agar pemrosesan tetap stabil.`,
    };
  }
  return { ok: true };
}

function formatPixels(value: number): string {
  return value % 1_000_000 === 0 ? `${value / 1_000_000} megapiksel` : `${value} piksel`;
}

/** Apakah tipe MIME termasuk gambar yang kami dukung. */
export function isAcceptedImageType(type: string): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Validasi awal berkas (tipe deklarasi + ukuran). Tipe sebenarnya tetap
 * diverifikasi lewat proses decode, jadi MIME palsu tidak akan lolos.
 */
export function validateImageFile(
  file: FileMeta,
  opts: { maxBytes?: number } = {},
): ValidationResult {
  const maxBytes = opts.maxBytes ?? IMAGE_LIMITS.maxFileBytes;
  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: "Berkas kosong atau tidak dapat dibaca." };
  }
  if (size > maxBytes) {
    return {
      ok: false,
      reason: `Ukuran ${formatBytes(size)} melebihi batas ${formatBytes(maxBytes)}.`,
    };
  }
  if (!isAcceptedImageType((file.type ?? "").toLowerCase())) {
    return {
      ok: false,
      reason: "Format tidak didukung. Gunakan PNG, JPG, WebP, GIF, BMP, atau AVIF.",
    };
  }
  return { ok: true };
}

// ===== Nama berkas =====

/** Bersihkan nama dasar berkas agar aman dipakai lintas sistem. */
export function sanitizeBaseName(name: string, fallback = "gambar"): string {
  const base = (name ?? "").replace(/\.[^./\\]+$/, "");
  const cleaned = base
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

/** Nama keluaran: `<nama-dasar>.<ext>`. */
export function buildOutputName(name: string, ext: string, fallback?: string): string {
  return `${sanitizeBaseName(name, fallback)}.${ext}`;
}

// ===== Ukuran & geometri =====

export type FitMode = "contain" | "cover";

/**
 * Hitung kanvas target dan posisi gambar sumber setelah scaling.
 *
 * - `contain`: gambar muat penuh (mungkin ada ruang kosong → isi warna latar).
 * - `cover`:   kanvas penuh terisi (gambar dipotong sisi yang kelebihan).
 *
 * Tidak pernah melakukan upscale: bila gambar sudah lebih kecil dari kanvas,
 * skalanya dibatasi 1.
 *
 * Mengembalikan koordinat sumber (`sx/sy/sw/sh`) untuk drawImage 9-param serta
 * koordinat tujuan (`dx/dy/dw/dh`) pada kanvas berukuran `canvasW × canvasH`.
 */
export function computeFitGeometry(
  srcW: number,
  srcH: number,
  canvasW: number,
  canvasH: number,
  mode: FitMode,
): {
  canvasW: number;
  canvasH: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
} {
  const iw = Math.max(1, Math.round(srcW));
  const ih = Math.max(1, Math.round(srcH));
  const cw = Math.max(1, Math.round(canvasW));
  const ch = Math.max(1, Math.round(canvasH));

  if (mode === "cover") {
    const scale = Math.min(iw / cw, ih / ch);
    const sw = Math.round(cw * scale);
    const sh = Math.round(ch * scale);
    const sx = Math.round((iw - sw) / 2);
    const sy = Math.round((ih - sh) / 2);
    return { canvasW: cw, canvasH: ch, sx, sy, sw, sh, dx: 0, dy: 0, dw: cw, dh: ch };
  }

  // contain
  const scaleX = cw / iw;
  const scaleY = ch / ih;
  const scale = Math.min(scaleX, scaleY, 1);
  const dw = Math.max(1, Math.round(iw * scale));
  const dh = Math.max(1, Math.round(ih * scale));
  const dx = Math.round((cw - dw) / 2);
  const dy = Math.round((ch - dh) / 2);
  return { canvasW: cw, canvasH: ch, sx: 0, sy: 0, sw: iw, sh: ih, dx, dy, dw, dh };
}

/**
 * Hitung ukuran kanvas output: bounded oleh `maxDim`, lalu disesuaikan
 * rasio aspek target. Bila tidak ada `targetRatio`, kanvas = ukuran sumber
 * (sama dengan `computeTargetSize`).
 */
export function computeCanvasSize(
  srcW: number,
  srcH: number,
  maxDim: number,
  targetRatio?: number,
): { width: number; height: number } {
  const iw = Math.max(1, Math.round(srcW));
  const ih = Math.max(1, Math.round(srcH));
  if (!Number.isFinite(targetRatio) || targetRatio! <= 0) {
    const r = computeTargetSize(iw, ih, maxDim);
    return { width: r.width, height: r.height };
  }
  const ratio = targetRatio!;
  const longest = Math.max(iw, ih);
  const scale = Math.min(1, maxDim / longest);
  const scaledW = Math.max(1, Math.round(iw * scale));
  const scaledH = Math.max(1, Math.round(ih * scale));
  if (ratio >= 1) {
    const h = Math.max(1, Math.round(scaledW / ratio));
    return { width: scaledW, height: Math.min(h, maxDim) };
  }
  const w = Math.max(1, Math.round(scaledH * ratio));
  return { width: Math.min(w, maxDim), height: scaledH };
}

/** Validasi warna latar hex (#rgb, #rrggbb, #rgba, #rrggbbaa). */
export function isValidHexColor(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex);
}

/** Hitung ukuran target setelah dibatasi `maxDim` pada sisi terpanjang. */
export function computeTargetSize(
  width: number,
  height: number,
  maxDim: number = IMAGE_LIMITS.maxOutputDimension,
): { width: number; height: number; scaled: boolean } {
  const w = Math.max(1, Math.round(Number.isFinite(width) ? width : 0));
  const h = Math.max(1, Math.round(Number.isFinite(height) ? height : 0));
  if (!Number.isFinite(maxDim) || maxDim <= 0) {
    return { width: w, height: h, scaled: false };
  }
  const longest = Math.max(w, h);
  if (longest <= maxDim) return { width: w, height: h, scaled: false };
  const scale = maxDim / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scaled: true,
  };
}

/**
 * Geometri penempatan gambar di halaman PDF: skala agar muat (contain) dengan
 * margin, lalu dipusatkan. Mengembalikan `width`/`height`/`x`/`y` dalam pt.
 */
export function fitImageOnPage(
  imgWidth: number,
  imgHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin = 0,
): { width: number; height: number; x: number; y: number; scale: number } {
  const iw = Math.max(1, Number.isFinite(imgWidth) ? imgWidth : 1);
  const ih = Math.max(1, Number.isFinite(imgHeight) ? imgHeight : 1);
  const m = Math.max(0, Number.isFinite(margin) ? margin : 0);
  const availW = Math.max(1, pageWidth - m * 2);
  const availH = Math.max(1, pageHeight - m * 2);
  const scale = Math.min(availW / iw, availH / ih);
  const width = iw * scale;
  const height = ih * scale;
  return {
    width,
    height,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    scale,
  };
}

/** Halaman khusus "sesuai gambar": ukuran halaman = ukuran gambar. */
export function pageSizeForImage(
  imgWidth: number,
  imgHeight: number,
): { width: number; height: number } {
  return {
    width: Math.max(1, Number.isFinite(imgWidth) ? imgWidth : 1),
    height: Math.max(1, Number.isFinite(imgHeight) ? imgHeight : 1),
  };
}
