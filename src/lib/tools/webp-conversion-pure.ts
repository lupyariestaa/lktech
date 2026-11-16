/** Pure validation and naming helpers for the WebP conversion tool. */

export const WEBP_CONVERSION_LIMITS = {
  maxFileBytes: 15 * 1024 * 1024,
  maxPixels: 8_000_000,
  maxDimension: 8192,
  minQuality: 0.1,
  maxQuality: 1,
} as const;

export const WEBP_OUTPUTS = {
  png: { label: "PNG", mime: "image/png", extension: "png" },
  jpeg: { label: "JPG", mime: "image/jpeg", extension: "jpg" },
  gif: { label: "GIF", mime: "image/gif", extension: "gif" },
  bmp: { label: "BMP", mime: "image/bmp", extension: "bmp" },
  avif: { label: "AVIF", mime: "image/avif", extension: "avif" },
} as const;

export type WebpOutputFormat = keyof typeof WEBP_OUTPUTS;

export type WebpContainerResult =
  | { ok: true; animated: boolean; width: number; height: number }
  | { ok: false; reason: string };

export function validateWebpFileMeta(file: {
  size?: number;
}): { ok: true } | { ok: false; reason: string } {
  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: "Berkas kosong atau tidak dapat dibaca." };
  }
  if (size > WEBP_CONVERSION_LIMITS.maxFileBytes) {
    return {
      ok: false,
      reason: "Ukuran WebP melebihi batas 15 MB.",
    };
  }
  return { ok: true };
}

/** Check RIFF bounds, chunk lengths/padding, image chunks and animation flags. */
export function inspectWebpContainer(bytes: Uint8Array): WebpContainerResult {
  if (bytes.byteLength < 20) {
    return { ok: false, reason: "Berkas terlalu pendek untuk menjadi WebP yang valid." };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    readAscii(bytes, 0, 4) !== "RIFF" ||
    readAscii(bytes, 8, 4) !== "WEBP"
  ) {
    return { ok: false, reason: "Berkas ini bukan WebP yang valid." };
  }

  const riffSize = view.getUint32(4, true);
  const riffEnd = riffSize + 8;
  if (riffSize < 12 || riffEnd !== bytes.byteLength) {
    return { ok: false, reason: "Panjang container WebP tidak valid atau berkas terpotong." };
  }

  let offset = 12;
  let animated = false;
  let hasImageData = false;
  let width = 0;
  let height = 0;
  let chunkCount = 0;

  while (offset < riffEnd) {
    if (riffEnd - offset < 8) {
      return { ok: false, reason: "Struktur chunk WebP tidak lengkap." };
    }

    const type = readAscii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + size;
    const nextOffset = payloadEnd + (size % 2);
    if (payloadEnd > riffEnd || nextOffset > riffEnd) {
      return { ok: false, reason: "Panjang chunk WebP tidak valid atau berkas terpotong." };
    }

    if (type === "VP8X") {
      if (size < 10) {
        return { ok: false, reason: "Header ekstensi WebP tidak lengkap." };
      }
      // The animation flag is bit 1 in the VP8X feature flags byte.
      if ((bytes[payloadStart] & 0x02) !== 0) animated = true;
      width = readUint24LE(bytes, payloadStart + 4) + 1;
      height = readUint24LE(bytes, payloadStart + 7) + 1;
    } else if (type === "ANIM" || type === "ANMF") {
      animated = true;
      if (type === "ANMF") {
        if (size < 16) {
          return { ok: false, reason: "Frame animasi WebP tidak lengkap." };
        }
        hasImageData = true;
      }
    } else if (type === "VP8 " || type === "VP8L") {
      hasImageData = true;
      const dimensions = readBitstreamDimensions(bytes, payloadStart, size, type);
      if (!dimensions) {
        return { ok: false, reason: "Header data gambar WebP tidak valid." };
      }
      if (width === 0 || height === 0) {
        width = dimensions.width;
        height = dimensions.height;
      }
    }

    chunkCount += 1;
    offset = nextOffset;
  }

  if (offset !== riffEnd || chunkCount === 0 || !hasImageData) {
    return { ok: false, reason: "Container WebP tidak berisi data gambar yang valid." };
  }

  if (!width || !height) {
    return { ok: false, reason: "Dimensi gambar WebP tidak dapat dibaca." };
  }
  return { ok: true, animated, width, height };
}

function readBitstreamDimensions(
  bytes: Uint8Array,
  offset: number,
  length: number,
  type: "VP8 " | "VP8L",
): { width: number; height: number } | null {
  if (type === "VP8L") {
    if (length < 5 || bytes[offset] !== 0x2f) return null;
    const bits1 = bytes[offset + 1];
    const bits2 = bytes[offset + 2];
    const bits3 = bytes[offset + 3];
    const bits4 = bytes[offset + 4];
    return {
      width: 1 + bits1 + ((bits2 & 0x3f) << 8),
      height: 1 + ((bits2 >> 6) | (bits3 << 2) | ((bits4 & 0x0f) << 10)),
    };
  }
  if (
    length < 10 ||
    bytes[offset + 3] !== 0x9d ||
    bytes[offset + 4] !== 0x01 ||
    bytes[offset + 5] !== 0x2a
  ) {
    return null;
  }
  return {
    width: (bytes[offset + 6] | (bytes[offset + 7] << 8)) & 0x3fff,
    height: (bytes[offset + 8] | (bytes[offset + 9] << 8)) & 0x3fff,
  };
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

export function validateWebpDimensions(
  width: number,
  height: number,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    return { ok: false, reason: "Dimensi gambar tidak valid." };
  }
  if (
    width > WEBP_CONVERSION_LIMITS.maxDimension ||
    height > WEBP_CONVERSION_LIMITS.maxDimension
  ) {
    return {
      ok: false,
      reason: `Sisi gambar tidak boleh melebihi ${WEBP_CONVERSION_LIMITS.maxDimension.toLocaleString("id-ID")} px.`,
    };
  }
  if (width * height > WEBP_CONVERSION_LIMITS.maxPixels) {
    return {
      ok: false,
      reason: "Gambar melebihi batas 8 megapiksel agar pemrosesan tetap stabil.",
    };
  }
  return { ok: true };
}

export function clampWebpOutputQuality(value: number): number {
  if (!Number.isFinite(value)) return 0.9;
  return Math.min(
    WEBP_CONVERSION_LIMITS.maxQuality,
    Math.max(WEBP_CONVERSION_LIMITS.minQuality, value),
  );
}

export function buildWebpOutputName(
  inputName: string,
  format: WebpOutputFormat,
): string {
  const base = (inputName ?? "")
    .replace(/\.[^./\\]+$/, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${base || "gambar"}.${WEBP_OUTPUTS[format].extension}`;
}

export function hasOutputSignature(
  format: WebpOutputFormat,
  bytes: Uint8Array,
): boolean {
  switch (format) {
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "gif":
      return readAscii(bytes, 0, 6) === "GIF87a" || readAscii(bytes, 0, 6) === "GIF89a";
    case "bmp":
      return readAscii(bytes, 0, 2) === "BM";
    case "avif":
      return hasAvifFileTypeBrand(bytes);
  }
}

export function hasExpectedWebpOutput(
  format: WebpOutputFormat,
  mimeType: string,
  bytes: Uint8Array,
): boolean {
  return mimeType.toLowerCase() === WEBP_OUTPUTS[format].mime && hasOutputSignature(format, bytes);
}

function hasAvifFileTypeBrand(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 16 || readAscii(bytes, 4, 4) !== "ftyp") return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxSize = view.getUint32(0, false);
  if (boxSize < 16 || boxSize > bytes.byteLength) return false;
  for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
    const brand = readAscii(bytes, offset, 4);
    if (brand === "avif" || brand === "avis") return true;
  }
  return false;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || length < 0 || offset + length > bytes.byteLength) return "";
  let value = "";
  for (let index = offset; index < offset + length; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}
