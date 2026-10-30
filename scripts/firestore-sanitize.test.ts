import { test } from "node:test";
import assert from "node:assert/strict";
import { stripUndefined } from "../src/lib/firestore-sanitize-pure.ts";

/**
 * Uji sanitasi nilai sebelum ditulis ke Firestore.
 *
 * Regresi yang dijaga: `normalizeOrderPayment()` mengembalikan kunci opsional
 * bernilai `undefined`, lalu `markOrderPaid`/`markOrderExpired` menyebarnya ke
 * `tx.update()` → Firestore menolak SELURUH transaksi. Helper ini harus
 * membuang `undefined` tanpa menyentuh sentinel Firestore.
 *
 * Jalankan: `npm run test:sanitize`
 */

test("stripUndefined: membuang kunci objek bernilai undefined", () => {
  const input = { a: 1, b: undefined, c: "x", d: undefined };
  assert.deepEqual(stripUndefined(input), { a: 1, c: "x" });
});

test("stripUndefined: rekursif pada objek bersarang", () => {
  const input = {
    payment: {
      provider: "mayar",
      status: "dibayar",
      manual: undefined,
      method: undefined,
      amount: 180000,
    },
  };
  assert.deepEqual(stripUndefined(input), {
    payment: { provider: "mayar", status: "dibayar", amount: 180000 },
  });
});

test("stripUndefined: membuang elemen array bernilai undefined", () => {
  assert.deepEqual(stripUndefined([1, undefined, 2, undefined]), [1, 2]);
  assert.deepEqual(
    stripUndefined([{ a: undefined, b: 1 }, undefined, { c: undefined }]),
    [{ b: 1 }, {}],
  );
});

test("stripUndefined: nilai falsy selain undefined TETAP dipertahankan", () => {
  const input = { zero: 0, empty: "", no: false, nil: null };
  assert.deepEqual(stripUndefined(input), {
    zero: 0,
    empty: "",
    no: false,
    nil: null,
  });
});

test("stripUndefined: tidak mengubah objek non-plain (sentinel/kelas)", () => {
  class Sentinel {
    kind: string;
    constructor(kind: string) {
      this.kind = kind;
    }
  }
  const sentinel = new Sentinel("delete");
  const date = new Date("2026-10-30T00:00:00.000Z");
  const result = stripUndefined({ sentinel, date });
  assert.equal(result.sentinel, sentinel);
  assert.equal(result.date, date);
});

test("stripUndefined: objek tanpa undefined dikembalikan setara", () => {
  const input = { a: 1, nested: { b: [1, 2, 3] } };
  assert.deepEqual(stripUndefined(input), input);
});

test("stripUndefined: kasus markOrderPaid (servicePayment undefined)", () => {
  const update = {
    status: "dibayar",
    payment: {
      provider: "mayar",
      status: "dibayar",
      manual: undefined,
      method: undefined,
      paidAt: "2026-10-30T01:00:00.000Z",
      amount: 180000,
    },
    servicePayment: undefined,
    updatedAtISO: "2026-10-30T01:00:00.000Z",
    updatedBy: "system:markOrderPaid",
  };
  const cleaned = stripUndefined(update);
  assert.deepEqual(cleaned, {
    status: "dibayar",
    payment: {
      provider: "mayar",
      status: "dibayar",
      paidAt: "2026-10-30T01:00:00.000Z",
      amount: 180000,
    },
    updatedAtISO: "2026-10-30T01:00:00.000Z",
    updatedBy: "system:markOrderPaid",
  });
  assert.equal("servicePayment" in cleaned, false);
  assert.equal("manual" in cleaned.payment, false);
});

test("stripUndefined: nilai primitif dikembalikan apa adanya", () => {
  assert.equal(stripUndefined(undefined), undefined);
  assert.equal(stripUndefined(null), null);
  assert.equal(stripUndefined(0), 0);
  assert.equal(stripUndefined(""), "");
  assert.equal(stripUndefined(false), false);
});