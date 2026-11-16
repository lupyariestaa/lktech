import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWebpOutputName,
  clampWebpOutputQuality,
  hasExpectedWebpOutput,
  inspectWebpContainer,
  validateWebpDimensions,
  validateWebpFileMeta,
  WEBP_CONVERSION_LIMITS,
  WEBP_OUTPUTS,
} from "../src/lib/tools/webp-conversion-pure.ts";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { encodeBmp24 } from "../src/lib/tools/webp-bmp-encoder.ts";

const ascii = (value: string) => Array.from(value, (char) => char.charCodeAt(0));

function webp(chunks: Array<{ type: string; data: number[] }>): Uint8Array {
  const body: number[] = [...ascii("WEBP")];
  for (const chunk of chunks) {
    body.push(...ascii(chunk.type));
    const length = chunk.data.length;
    body.push(length & 0xff, (length >>> 8) & 0xff, (length >>> 16) & 0xff, (length >>> 24) & 0xff);
    body.push(...chunk.data);
    if (length % 2) body.push(0);
  }
  const size = body.length;
  return new Uint8Array([
    ...ascii("RIFF"),
    size & 0xff,
    (size >>> 8) & 0xff,
    (size >>> 16) & 0xff,
    (size >>> 24) & 0xff,
    ...body,
  ]);
}

const vp8Frame = (width: number, height: number) => [
  0, 0, 0, 0x9d, 0x01, 0x2a,
  width & 0xff, (width >> 8) & 0x3f,
  height & 0xff, (height >> 8) & 0x3f,
];

const vp8xHeader = (width: number, height: number, flags = 0) => [
  flags, 0, 0, 0,
  (width - 1) & 0xff, ((width - 1) >> 8) & 0xff, ((width - 1) >> 16) & 0xff,
  (height - 1) & 0xff, ((height - 1) >> 8) & 0xff, ((height - 1) >> 16) & 0xff,
];

test("WebP parser accepts a static RIFF container and flags animation", () => {
  const still = inspectWebpContainer(webp([{ type: "VP8 ", data: vp8Frame(2, 3) }]));
  assert.deepEqual(still, { ok: true, animated: false, width: 2, height: 3 });

  const animated = inspectWebpContainer(webp([
    { type: "VP8X", data: vp8xHeader(2, 3, 0x02) },
    { type: "ANIM", data: [0, 0, 0, 0, 0, 0] },
    { type: "ANMF", data: Array.from({ length: 16 }, (_, index) => index) },
    { type: "VP8 ", data: vp8Frame(2, 3) },
  ]));
  assert.deepEqual(animated, { ok: true, animated: true, width: 2, height: 3 });
});

test("WebP parser rejects wrong signatures, truncated chunks and invalid RIFF bounds", () => {
  assert.equal(inspectWebpContainer(new Uint8Array(30)).ok, false);
  assert.equal(inspectWebpContainer(webp([{ type: "VP8 ", data: vp8Frame(2, 2) }]).slice(0, -1)).ok, false);
  assert.equal(inspectWebpContainer(webp([{ type: "ANMF", data: [1] }])).ok, false);
  const invalidRiff = webp([{ type: "VP8 ", data: vp8Frame(2, 2) }]);
  invalidRiff[4] += 1;
  assert.equal(inspectWebpContainer(invalidRiff).ok, false);
  assert.equal(inspectWebpContainer(webp([{ type: "JUNK", data: [1] }])).ok, false);
});

test("WebP metadata and decoded dimensions enforce resource limits", () => {
  assert.equal(validateWebpFileMeta({ size: 1 }).ok, true);
  assert.equal(validateWebpFileMeta({ size: WEBP_CONVERSION_LIMITS.maxFileBytes + 1 }).ok, false);
  assert.equal(validateWebpDimensions(2000, 4000).ok, true);
  assert.equal(validateWebpDimensions(4001, 2000).ok, false);
  assert.equal(validateWebpDimensions(8193, 1).ok, false);
  assert.equal(validateWebpDimensions(Number.POSITIVE_INFINITY, 1).ok, false);
});

test("output names are sanitized and qualities clamped", () => {
  assert.equal(buildWebpOutputName("folder\\my photo.webp", "jpeg"), "folder-my-photo.jpg");
  assert.equal(buildWebpOutputName("../../.webp", "avif"), "gambar.avif");
  assert.equal(clampWebpOutputQuality(2), 1);
  assert.equal(clampWebpOutputQuality(Number.NaN), 0.9);
  assert.equal(clampWebpOutputQuality(0), WEBP_CONVERSION_LIMITS.minQuality);
});

test("output format MIME and signatures are verified", () => {
  assert.equal(hasExpectedWebpOutput("png", "image/png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), true);
  assert.equal(hasExpectedWebpOutput("png", "image/png", new Uint8Array([71, 73, 70, 56, 57, 97])), false);
  assert.equal(hasExpectedWebpOutput("jpeg", "image/jpeg", new Uint8Array([255, 216, 255])), true);
  assert.equal(hasExpectedWebpOutput("gif", "image/gif", new Uint8Array(ascii("GIF89a"))), true);
  assert.equal(hasExpectedWebpOutput("bmp", "image/bmp", new Uint8Array(ascii("BM"))), true);
  assert.equal(hasExpectedWebpOutput("bmp", "image/png", new Uint8Array(ascii("BM"))), false);
  const avifHeader = new Uint8Array([
    0, 0, 0, 20,
    ...ascii("ftypavif"),
    0, 0, 0, 0,
    ...ascii("mif1"),
  ]);
  assert.equal(hasExpectedWebpOutput("avif", "image/avif", avifHeader), true);
  assert.deepEqual(Object.keys(WEBP_OUTPUTS), ["png", "jpeg", "gif", "bmp", "avif"]);
});

test("BMP 24-bit encoder writes valid headers, padding, bottom-up rows and white alpha matte", () => {
  const bytes = encodeBmp24(new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 0, 255, 255,
    0, 0, 0, 0,
  ]), 1, 3);
  const view = new DataView(bytes.buffer);
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), "BM");
  assert.equal(view.getUint32(2, true), 66);
  assert.equal(view.getInt32(18, true), 1);
  assert.equal(view.getInt32(22, true), 3);
  assert.equal(view.getUint16(28, true), 24);
  assert.deepEqual(Array.from(bytes.slice(54, 58)), [255, 255, 255, 0]);
  assert.throws(() => encodeBmp24(new Uint8Array(3), 1, 1));
});
