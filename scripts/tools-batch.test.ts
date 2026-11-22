import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeOutputNames,
  makeUniqueOutputName,
  planBatchAddition,
  summarizeBatch,
  IMAGE_BATCH_LIMITS,
  type BatchCandidate,
  type BatchStatus,
  // @ts-expect-error Node strip-types runner needs explicit extension.
} from "../src/lib/tools/batch-pure.ts";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { IMAGE_LIMITS } from "../src/lib/tools/image-tool-pure.ts";

/** Uji logika murni antrean batch gambar. Jalankan: `npm run test:tools-batch`. */

const ok: BatchCandidate["check"] = { ok: true };
const candidate = (
  key: string,
  size = 1024,
  check: BatchCandidate["check"] = ok,
): BatchCandidate => ({ key, size, check });

test("batas batch selaras dengan batas berkas tool gambar", () => {
  assert.equal(IMAGE_BATCH_LIMITS.maxFileBytes, IMAGE_LIMITS.maxFileBytes);
  assert.ok(IMAGE_BATCH_LIMITS.maxFiles >= 1);
  assert.ok(IMAGE_BATCH_LIMITS.maxTotalBytes >= IMAGE_BATCH_LIMITS.maxFileBytes);
});

test("planBatchAddition menerima kandidat valid sesuai urutan", () => {
  const plan = planBatchAddition({
    existingKeys: [],
    existingBytes: 0,
    candidates: [candidate("a"), candidate("b"), candidate("c")],
    limits: { maxFiles: 3, maxTotalBytes: 10_000 },
  });
  assert.deepEqual(plan.accepted, [0, 1, 2]);
  assert.deepEqual(plan.rejected, []);
});

test("planBatchAddition menolak validasi per berkas dan duplikat", () => {
  const plan = planBatchAddition({
    existingKeys: ["sudah-ada"],
    existingBytes: 100,
    candidates: [
      candidate("baru"),
      candidate("SUDAH-ADA"),
      candidate("rusak", 10, { ok: false, reason: "Format tidak didukung." }),
    ],
    limits: { maxFiles: 10, maxTotalBytes: 10_000 },
  });
  assert.deepEqual(plan.accepted, [0]);
  assert.deepEqual(plan.rejected, [
    { index: 1, reason: "Berkas ini sudah ada dalam antrean." },
    { index: 2, reason: "Format tidak didukung." },
  ]);
});

test("planBatchAddition menegakkan jumlah dan total ukuran", () => {
  const tooMany = planBatchAddition({
    existingKeys: ["a", "b"],
    existingBytes: 0,
    candidates: [candidate("c"), candidate("d")],
    limits: { maxFiles: 3, maxTotalBytes: 10_000 },
  });
  assert.deepEqual(tooMany.accepted, [0]);
  assert.equal(tooMany.rejected[0]?.reason, "Batas 3 berkas per batch tercapai.");

  const tooLarge = planBatchAddition({
    existingKeys: [],
    existingBytes: 0,
    candidates: [candidate("a", 6000), candidate("b", 6000)],
    limits: { maxFiles: 10, maxTotalBytes: 10_000 },
  });
  assert.deepEqual(tooLarge.accepted, [0]);
  assert.match(tooLarge.rejected[0]?.reason ?? "", /Total ukuran melebihi batas/);
});

test("planBatchAddition menghitung ukuran kandidat yang diterima saja", () => {
  const plan = planBatchAddition({
    existingKeys: [],
    existingBytes: 0,
    candidates: [candidate("a", 9000), candidate("b", 2000)],
    limits: { maxFiles: 10, maxTotalBytes: 10_000 },
  });
  assert.deepEqual(plan.accepted, [0]);
  assert.deepEqual(plan.rejected.map((item) => item.index), [1]);
});

test("summarizeBatch menghitung status dan item selesai", () => {
  const statuses: BatchStatus[] = [
    "waiting",
    "processing",
    "success",
    "success",
    "failed",
    "cancelled",
  ];
  assert.deepEqual(summarizeBatch(statuses), {
    total: 6,
    waiting: 1,
    processing: 1,
    success: 2,
    failed: 1,
    cancelled: 1,
    finished: 4,
  });
});

test("makeUniqueOutputName menambahkan sufiks sebelum ekstensi", () => {
  assert.equal(makeUniqueOutputName("foto.webp", []), "foto.webp");
  assert.equal(
    makeUniqueOutputName("foto.webp", ["foto.webp", "foto-2.webp"]),
    "foto-3.webp",
  );
  assert.equal(makeUniqueOutputName("foto.webp", ["FOTO.WEBP"]), "foto-2.webp");
  assert.equal(makeUniqueOutputName("tanpa-ekstensi", ["tanpa-ekstensi"]), "tanpa-ekstensi-2");
  assert.equal(makeUniqueOutputName("   ", []), "gambar");
});

test("dedupeOutputNames menjaga urutan dan unik tanpa peka huruf", () => {
  assert.deepEqual(
    dedupeOutputNames(["a.webp", "A.webp", "a-2.webp", "b.webp"]),
    ["a.webp", "A-2.webp", "a-2-2.webp", "b.webp"],
  );
});
