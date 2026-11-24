import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { imageFormatForMime, inspectImageHeader } from "../src/lib/tools/image-header-pure.ts";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { IMAGE_LIMITS, validateImageDimensions } from "../src/lib/tools/image-tool-pure.ts";

const ascii = (value: string) => Array.from(value, (char) => char.charCodeAt(0));

function u32be(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function u32le(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

test("preflight header membaca PNG, GIF, BMP, JPEG, dan WebP tanpa decode", () => {
  const png = new Uint8Array([
    0x89, ...ascii("PNG\r\n\x1a\n"), 0, 0, 0, 13, ...ascii("IHDR"), ...u32be(120), ...u32be(80),
  ]);
  assert.deepEqual(inspectImageHeader(png), { ok: true, format: "png", width: 120, height: 80 });

  const gif = new Uint8Array([...ascii("GIF89a"), 4, 0, 3, 0]);
  assert.deepEqual(inspectImageHeader(gif), { ok: true, format: "gif", width: 4, height: 3 });

  const bmp = new Uint8Array(26);
  bmp.set(ascii("BM"));
  bmp.set(u32le(40), 14);
  bmp.set(u32le(7), 18);
  bmp.set(u32le(5), 22);
  assert.deepEqual(inspectImageHeader(bmp), { ok: true, format: "bmp", width: 7, height: 5 });

  const jpeg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 9, 0, 11, 1, 1, 0, 17,
  ]);
  assert.deepEqual(inspectImageHeader(jpeg), { ok: true, format: "jpeg", width: 11, height: 9 });

  const webp = new Uint8Array([
    ...ascii("RIFF"), 22, 0, 0, 0, ...ascii("WEBPVP8 "), 10, 0, 0, 0,
    0, 0, 0, 0x9d, 0x01, 0x2a, 6, 0, 4, 0,
  ]);
  assert.deepEqual(inspectImageHeader(webp), { ok: true, format: "webp", width: 6, height: 4 });
});

test("preflight header membaca AVIF ispe dan menolak header tidak lengkap", () => {
  const avif = new Uint8Array([
    ...u32be(20), ...ascii("ftypavif"), 0, 0, 0, 0, ...ascii("mif1"),
    ...u32be(20), ...ascii("ispe"), 0, 0, 0, 0, ...u32be(640), ...u32be(480),
  ]);
  assert.deepEqual(inspectImageHeader(avif), { ok: true, format: "avif", width: 640, height: 480 });
  assert.equal(inspectImageHeader(new Uint8Array([0x89, 0x50])).ok, false);
  assert.equal(inspectImageHeader(new Uint8Array([...ascii("GIF89a"), 0, 0, 1, 0])).ok, false);
});

test("batas dimensi input ditolak sebelum decoder gambar dipanggil", () => {
  assert.equal(validateImageDimensions(4000, 2000).ok, true);
  const side = validateImageDimensions(IMAGE_LIMITS.maxInputDimension + 1, 1);
  assert.equal(side.ok, false);
  if (!side.ok) assert.match(side.reason, /8\.192 px/);
  const pixels = validateImageDimensions(4000, 3000);
  assert.equal(pixels.ok, false);
  if (!pixels.ok) assert.match(pixels.reason, /8 megapiksel/);
});

test("MIME yang diterima harus memiliki format header yang sama", () => {
  assert.equal(imageFormatForMime("image/png"), "png");
  assert.equal(imageFormatForMime("IMAGE/WEBP"), "webp");
  assert.equal(imageFormatForMime("image/svg+xml"), null);
  assert.notEqual(imageFormatForMime("image/jpeg"), "png");
});
