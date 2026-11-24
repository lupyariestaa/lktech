/**
 * Pembaca dimensi header gambar tanpa DOM atau decoder browser.
 *
 * Ini bukan validasi penuh format. Tujuannya adalah menolak dimensi yang
 * berbahaya sebelum browser diminta mendekode dan mengalokasikan pikselnya.
 */

export type ImageHeaderFormat = "png" | "jpeg" | "gif" | "bmp" | "webp" | "avif";

export type ImageHeaderResult =
  | { ok: true; format: ImageHeaderFormat; width: number; height: number }
  | { ok: false; reason: string };

/** Petakan MIME input yang didukung ke format signature-nya. */
export function imageFormatForMime(type: string): ImageHeaderFormat | null {
  switch (type.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpeg";
    case "image/gif":
      return "gif";
    case "image/bmp":
      return "bmp";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return null;
  }
}

const ascii = (bytes: Uint8Array, offset: number, value: string): boolean => {
  if (offset < 0 || offset + value.length > bytes.byteLength) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
};

const u16be = (bytes: Uint8Array, offset: number) =>
  (bytes[offset] << 8) | bytes[offset + 1];
const u16le = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8);
const u24le = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
const u32be = (bytes: Uint8Array, offset: number) =>
  bytes[offset] * 0x1000000 + bytes[offset + 1] * 0x10000 + bytes[offset + 2] * 0x100 + bytes[offset + 3];
const u32le = (bytes: Uint8Array, offset: number) =>
  bytes[offset] + bytes[offset + 1] * 0x100 + bytes[offset + 2] * 0x10000 + bytes[offset + 3] * 0x1000000;

function result(format: ImageHeaderFormat, width: number, height: number): ImageHeaderResult {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    return { ok: false, reason: "Header gambar memiliki dimensi tidak valid." };
  }
  return { ok: true, format, width, height };
}

/** Ambil format dan dimensi dari awalan berkas. Tidak pernah mendekode piksel. */
export function inspectImageHeader(bytes: Uint8Array): ImageHeaderResult {
  if (ascii(bytes, 0, "\x89PNG\r\n\x1a\n")) return inspectPng(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return inspectJpeg(bytes);
  if (ascii(bytes, 0, "GIF87a") || ascii(bytes, 0, "GIF89a")) return inspectGif(bytes);
  if (ascii(bytes, 0, "BM")) return inspectBmp(bytes);
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return inspectWebp(bytes);
  if (isAvif(bytes)) return inspectAvif(bytes);
  return { ok: false, reason: "Header gambar tidak dikenali atau tidak lengkap." };
}

function inspectPng(bytes: Uint8Array): ImageHeaderResult {
  if (bytes.byteLength < 24 || !ascii(bytes, 12, "IHDR")) {
    return { ok: false, reason: "Header PNG tidak lengkap." };
  }
  return result("png", u32be(bytes, 16), u32be(bytes, 20));
}

function inspectGif(bytes: Uint8Array): ImageHeaderResult {
  if (bytes.byteLength < 10) return { ok: false, reason: "Header GIF tidak lengkap." };
  return result("gif", u16le(bytes, 6), u16le(bytes, 8));
}

function inspectBmp(bytes: Uint8Array): ImageHeaderResult {
  if (bytes.byteLength < 26) return { ok: false, reason: "Header BMP tidak lengkap." };
  const dibSize = u32le(bytes, 14);
  if (dibSize === 12) return result("bmp", u16le(bytes, 18), u16le(bytes, 20));
  if (dibSize < 40 || bytes.byteLength < 26) {
    return { ok: false, reason: "Header BMP tidak didukung atau tidak lengkap." };
  }
  const width = u32le(bytes, 18);
  const signedHeight = u32le(bytes, 22);
  // Tinggi BMP boleh negatif (top-down); hindari Math.abs INT32_MIN.
  const height = signedHeight > 0x7fffffff ? 0x100000000 - signedHeight : signedHeight;
  return result("bmp", width, height);
}

function inspectJpeg(bytes: Uint8Array): ImageHeaderResult {
  let offset = 2;
  while (offset + 4 <= bytes.byteLength) {
    while (bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.byteLength) break;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.byteLength) break;
    const length = u16be(bytes, offset);
    if (length < 2 || offset + length > bytes.byteLength) break;
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)
    ) {
      if (length < 7) return { ok: false, reason: "Header JPEG tidak valid." };
      return result("jpeg", u16be(bytes, offset + 5), u16be(bytes, offset + 3));
    }
    offset += length;
  }
  return { ok: false, reason: "Dimensi JPEG tidak ditemukan dalam header yang dibaca." };
}

function inspectWebp(bytes: Uint8Array): ImageHeaderResult {
  if (bytes.byteLength < 20) return { ok: false, reason: "Header WebP tidak lengkap." };
  const riffLength = u32le(bytes, 4);
  if (riffLength < 12) return { ok: false, reason: "Panjang container WebP tidak valid." };
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const type = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const length = u32le(bytes, offset + 4);
    const data = offset + 8;
    if (length > bytes.byteLength - data) break;
    if (type === "VP8X" && length >= 10) {
      return result("webp", 1 + u24le(bytes, data + 4), 1 + u24le(bytes, data + 7));
    }
    if (type === "VP8L" && length >= 5 && bytes[data] === 0x2f) {
      return result(
        "webp",
        1 + bytes[data + 1] + ((bytes[data + 2] & 0x3f) << 8),
        1 + ((bytes[data + 2] >> 6) | (bytes[data + 3] << 2) | ((bytes[data + 4] & 0x0f) << 10)),
      );
    }
    if (type === "VP8 " && length >= 10 && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
      return result("webp", u16le(bytes, data + 6) & 0x3fff, u16le(bytes, data + 8) & 0x3fff);
    }
    offset = data + length + (length % 2);
  }
  return { ok: false, reason: "Dimensi WebP tidak ditemukan dalam header yang dibaca." };
}

function isAvif(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 16 || !ascii(bytes, 4, "ftyp")) return false;
  const size = u32be(bytes, 0);
  if (size < 16 || size > bytes.byteLength) return false;
  for (let offset = 8; offset + 4 <= size; offset += 4) {
    if (ascii(bytes, offset, "avif") || ascii(bytes, offset, "avis")) return true;
  }
  return false;
}

function inspectAvif(bytes: Uint8Array): ImageHeaderResult {
  // `ispe` berisi FullBox 4 byte lalu width/height uint32 big-endian.
  for (let offset = 4; offset + 16 <= bytes.byteLength; offset += 1) {
    if (!ascii(bytes, offset, "ispe")) continue;
    const start = offset - 4;
    const size = u32be(bytes, start);
    if (size < 20 || start + size > bytes.byteLength) continue;
    return result("avif", u32be(bytes, offset + 8), u32be(bytes, offset + 12));
  }
  return { ok: false, reason: "Dimensi AVIF tidak ditemukan dalam header yang dibaca." };
}
