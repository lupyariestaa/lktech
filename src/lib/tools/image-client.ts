/**
 * Helper browser untuk tool gambar (bukan `*-pure`: menyentuh DOM).
 * Hanya diimpor oleh komponen klien; tidak diuji lewat Node.
 */

import {
  imageFormatForMime,
  inspectImageHeader,
  type ImageHeaderResult,
} from "@/lib/tools/image-header-pure";
import { validateImageDimensions } from "@/lib/tools/image-tool-pure";

export type DecodedImage = {
  /** Sumber yang bisa langsung dipakai `ctx.drawImage`. */
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Lepaskan sumber daya (bitmap/object URL). */
  release: () => void;
};

/** Metadata dibaca secukupnya; tidak ada piksel yang didekode pada tahap ini. */
export const IMAGE_HEADER_READ_BYTES = 256 * 1024;

export type ImagePreflight = Extract<ImageHeaderResult, { ok: true }>;

/**
 * Periksa signature dan dimensi deklaratif sebelum `createImageBitmap`/`img`.
 * Batas pembacaan menjaga preflight tetap ringan meskipun ukuran file diizinkan.
 */
export async function preflightImageFile(file: File): Promise<ImagePreflight> {
  const bytes = new Uint8Array(await file.slice(0, IMAGE_HEADER_READ_BYTES).arrayBuffer());
  const header = inspectImageHeader(bytes);
  if (!header.ok) throw new Error(header.reason);
  const expectedFormat = imageFormatForMime(file.type);
  if (expectedFormat && expectedFormat !== header.format) {
    throw new Error("Signature gambar tidak cocok dengan tipe berkas yang dipilih.");
  }
  const dimensions = validateImageDimensions(header.width, header.height);
  if (!dimensions.ok) throw new Error(dimensions.reason);
  return header;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
    img.src = url;
  });
}

/**
 * Dekode berkas gambar. Utamakan `createImageBitmap` (efisien); jika tidak
 * tersedia, jatuh ke elemen `<img>` dengan object URL.
 */
export async function decodeImageFile(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.(),
      };
    } catch {
      /* jatuh ke fallback elemen img */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Buat elemen kanvas dengan ukuran minimal 1 px. */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** `canvas.toBlob` sebagai Promise (menolak bila blob null). */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal membuat berkas hasil."));
      },
      type,
      quality,
    );
  });
}

/** Apakah browser dapat meng-encode tipe gambar tertentu (mis. WebP). */
export function canEncodeImageType(type: string): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL(type).startsWith(`data:${type}`);
  } catch {
    return false;
  }
}
