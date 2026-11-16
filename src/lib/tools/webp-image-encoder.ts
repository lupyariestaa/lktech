import { encodeBmp24 } from "@/lib/tools/webp-bmp-encoder";
import {
  hasExpectedWebpOutput,
  WEBP_OUTPUTS,
  type WebpOutputFormat,
} from "@/lib/tools/webp-conversion-pure";
import { clampQuality } from "@/lib/tools/image-tool-pure";

let avifModulePromise: Promise<typeof import("@jsquash/avif/encode.js")> | null = null;

/** Encode pixels in the browser and reject MIME/signature mismatches. */
export async function encodeWebpPixels(
  pixels: ImageData,
  format: WebpOutputFormat,
  quality: number,
): Promise<Blob> {
  let blob: Blob;

  switch (format) {
    case "png":
      blob = await canvasBlob(pixels, format);
      break;
    case "jpeg":
      blob = await canvasBlob(pixels, format, quality);
      break;
    case "gif":
      blob = await encodeGif(pixels);
      break;
    case "bmp":
      blob = new Blob([toArrayBuffer(encodeBmp24(pixels.data, pixels.width, pixels.height))], {
        type: WEBP_OUTPUTS.bmp.mime,
      });
      break;
    case "avif":
      blob = await encodeAvif(pixels, quality);
      break;
  }

  if (blob.type.toLowerCase() !== WEBP_OUTPUTS[format].mime) {
    throw new Error(
      `Encoder mengembalikan tipe ${blob.type || "tidak diketahui"}, bukan ${WEBP_OUTPUTS[format].label}. Hasil tidak disimpan.`,
    );
  }

  const header = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  if (!hasExpectedWebpOutput(format, blob.type, header)) {
    throw new Error(
      `Signature hasil tidak cocok dengan format ${WEBP_OUTPUTS[format].label}. Coba format lain atau browser terbaru.`,
    );
  }
  return blob;
}

async function canvasBlob(
  pixels: ImageData,
  format: "png" | "jpeg",
  quality?: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Kanvas gambar tidak tersedia di browser ini.");

  // Explicit white matte for JPEG so transparent WebP pixels never turn black.
  if (format === "jpeg") {
    const opaque = new Uint8ClampedArray(pixels.data.length);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const alpha = pixels.data[index + 3] / 255;
      opaque[index] = Math.round(pixels.data[index] * alpha + 255 * (1 - alpha));
      opaque[index + 1] = Math.round(pixels.data[index + 1] * alpha + 255 * (1 - alpha));
      opaque[index + 2] = Math.round(pixels.data[index + 2] * alpha + 255 * (1 - alpha));
      opaque[index + 3] = 255;
    }
    context.putImageData(new ImageData(opaque, pixels.width, pixels.height), 0, 0);
  } else {
    context.putImageData(pixels, 0, 0);
  }

  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (output) => output ? resolve(output) : reject(new Error("Gagal membuat berkas hasil.")),
        WEBP_OUTPUTS[format].mime,
        format === "jpeg" ? clampQuality(quality ?? 0.9) : undefined,
      );
    });
    return blob;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function encodeGif(pixels: ImageData): Promise<Blob> {
  const gifenc = await import("gifenc");
  const { GIFEncoder, applyPalette, quantize } = gifenc;
  const hasTransparency = hasAlpha(pixels.data);
  const palette = quantize(
    pixels.data,
    256,
    hasTransparency
      ? { format: "rgba4444", oneBitAlpha: 127, clearAlpha: true }
      : { format: "rgb565" },
  );
  const transparentIndex = hasTransparency
    ? palette.findIndex((color: number[]) => (color[3] ?? 255) <= 127)
    : -1;
  const index = applyPalette(
    pixels.data,
    palette,
    hasTransparency ? "rgba4444" : "rgb565",
  );
  const encoder = GIFEncoder();
  encoder.writeFrame(index, pixels.width, pixels.height, {
    palette,
    transparent: transparentIndex >= 0,
    transparentIndex: Math.max(0, transparentIndex),
  });
  encoder.finish();
  return new Blob([toArrayBuffer(encoder.bytes())], { type: WEBP_OUTPUTS.gif.mime });
}

async function encodeAvif(pixels: ImageData, quality: number): Promise<Blob> {
  avifModulePromise ??= import("@jsquash/avif/encode.js").then(async (avif) => {
    // The package's Emscripten loader resolves WASM/workers relative to its JS
    // chunk. Serve these assets from our own origin, not a third-party CDN.
    await avif.init({
      locateFile: (path: string) => new URL(`/avif-codec/${path}`, window.location.origin).toString(),
    });
    return avif;
  }).catch((error: unknown) => {
    avifModulePromise = null;
    throw error;
  });

  const avif = await avifModulePromise;
  const output = await avif.default(pixels, {
    quality: Math.round(clampQuality(quality) * 100),
    qualityAlpha: -1,
    speed: 6,
  });
  return new Blob([output], { type: WEBP_OUTPUTS.avif.mime });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function hasAlpha(data: Uint8ClampedArray): boolean {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
}
