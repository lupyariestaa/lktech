import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { buildZipStore, crc32 } from "../src/lib/tools/zip-store.ts";

/** Uji penulis ZIP store lokal. Jalankan: `npm run test:tools-zip`. */

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

const view = (bytes: Uint8Array) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

test("crc32 cocok dengan vektor uji standar", () => {
  const bytes = new TextEncoder().encode("123456789");
  assert.equal(crc32(bytes), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("buildZipStore menulis local header, data, central directory, dan EOCD", () => {
  const first = new Uint8Array([1, 2, 3, 4]);
  const second = new TextEncoder().encode("webp");
  const zip = buildZipStore(
    [
      { name: "pertama.webp", data: first },
      { name: "kedua.webp", data: second },
    ],
    new Date(2026, 10, 22, 12, 34, 56),
  );
  const data = view(zip);

  assert.equal(ascii(zip, 0, 4), "PK\u0003\u0004");
  assert.equal(data.getUint16(6, true), 0x0800);
  assert.equal(data.getUint16(8, true), 0);
  assert.equal(data.getUint32(14, true), crc32(first));
  assert.equal(data.getUint32(18, true), first.byteLength);
  assert.equal(data.getUint32(22, true), first.byteLength);
  const firstNameLength = data.getUint16(26, true);
  assert.equal(firstNameLength, "pertama.webp".length);
  assert.equal(ascii(zip, 30, firstNameLength), "pertama.webp");
  assert.deepEqual(
    Array.from(zip.subarray(30 + firstNameLength, 30 + firstNameLength + first.byteLength)),
    Array.from(first),
  );

  const centralOffset = zip.findIndex(
    (_, index) =>
      index >= 30 &&
      ascii(zip, index, 4) === "PK\u0001\u0002",
  );
  assert.ok(centralOffset > 0);
  assert.equal(data.getUint16(centralOffset + 10, true), 0);
  assert.equal(data.getUint16(centralOffset + 8, true), 0x0800);
  assert.equal(data.getUint32(centralOffset + 16, true), crc32(first));
  assert.equal(data.getUint32(centralOffset + 20, true), first.byteLength);
  const centralNameLength = data.getUint16(centralOffset + 28, true);
  assert.equal(ascii(zip, centralOffset + 46, centralNameLength), "pertama.webp");
  assert.equal(data.getUint32(centralOffset + 42, true), 0);

  const eocdOffset = zip.byteLength - 22;
  assert.equal(ascii(zip, eocdOffset, 4), "PK\u0005\u0006");
  assert.equal(data.getUint16(eocdOffset + 8, true), 2);
  assert.equal(data.getUint16(eocdOffset + 10, true), 2);
  assert.equal(data.getUint32(eocdOffset + 12, true), zip.byteLength - 22 - centralOffset);
  assert.equal(data.getUint32(eocdOffset + 16, true), centralOffset);
  assert.equal(data.getUint16(eocdOffset + 20, true), 0);
});

test("buildZipStore mempertahankan data kosong dan nama UTF-8", () => {
  const zip = buildZipStore([{ name: "warna-ungu.webp", data: new Uint8Array() }]);
  const data = view(zip);
  assert.equal(data.getUint32(18, true), 0);
  assert.equal(data.getUint32(22, true), 0);
  assert.equal(data.getUint32(14, true), 0);
});

test("buildZipStore menolak arsip kosong, nama tidak aman, dan duplikat", () => {
  assert.throws(() => buildZipStore([]), /Tidak ada hasil/);
  assert.throws(
    () => buildZipStore([{ name: "../rahasia.webp", data: new Uint8Array([1]) }]),
    /tidak aman/,
  );
  assert.throws(
    () => buildZipStore([{ name: "folder/foto.webp", data: new Uint8Array([1]) }]),
    /tidak aman/,
  );
  assert.throws(
    () => buildZipStore([{ name: "\u0000.webp", data: new Uint8Array([1]) }]),
    /tidak aman/,
  );
  assert.throws(
    () =>
      buildZipStore([
        { name: "Foto.webp", data: new Uint8Array([1]) },
        { name: "foto.WEBP", data: new Uint8Array([2]) },
      ]),
    /duplikat/,
  );
});
