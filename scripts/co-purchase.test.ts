import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CO_PURCHASE_MIN,
  coPurchasePairs,
  isCoPurchaseStatus,
  rankCoPurchases,
} from "../src/lib/co-purchase.ts";

test("BR-1 coPurchasePairs: pasangan dihitung dua arah per pesanan", () => {
  const map = coPurchasePairs([["a", "b"]]);
  assert.equal(map.get("a")?.get("b"), 1);
  assert.equal(map.get("b")?.get("a"), 1);
});

test("BR-1 coPurchasePairs: slug duplikat dalam satu pesanan hanya dihitung sekali (K3)", () => {
  const map = coPurchasePairs([["a", "a", "b"]]);
  assert.equal(map.get("a")?.get("b"), 1);
  assert.equal(map.get("a")?.get("a"), undefined);
});

test("BR-1 coPurchasePairs: akumulasi lintas pesanan", () => {
  const map = coPurchasePairs([["a", "b"], ["a", "b", "c"], ["a", "c"]]);
  assert.equal(map.get("a")?.get("b"), 2);
  assert.equal(map.get("a")?.get("c"), 2);
  assert.equal(map.get("b")?.get("c"), 1);
});

test("BR-1 coPurchasePairs: slug kosong/bukan string diabaikan", () => {
  const map = coPurchasePairs([["a", "", "b"]]);
  assert.equal(map.get("a")?.get("b"), 1);
  assert.equal(map.has(""), false);
});

test("BR-1 rankCoPurchases: diurutkan menurun berdasarkan jumlah", () => {
  const map = coPurchasePairs([
    ["a", "b"], ["a", "b"], ["a", "c"], ["a", "c"], ["a", "c"],
  ]);
  assert.deepEqual(rankCoPurchases("a", map, 2), ["c", "b"]);
});

test("BR-5 rankCoPurchases: di bawah ambang tidak ditampilkan (K4)", () => {
  const map = coPurchasePairs([["a", "b"]]);
  assert.equal(CO_PURCHASE_MIN, 2);
  assert.deepEqual(rankCoPurchases("a", map), []);
});

test("BR-5 rankCoPurchases: produk sendiri tidak pernah ikut", () => {
  const map = coPurchasePairs([["a", "a"], ["a", "a"]]);
  assert.deepEqual(rankCoPurchases("a", map), []);
});

test("BR-5 rankCoPurchases: seri jumlah diurutkan abjad (deterministik)", () => {
  const map = coPurchasePairs([["a", "z"], ["a", "z"], ["a", "m"], ["a", "m"]]);
  assert.deepEqual(rankCoPurchases("a", map), ["m", "z"]);
});

test("BR-5 rankCoPurchases: produk tanpa riwayat → kosong", () => {
  assert.deepEqual(rankCoPurchases("x", coPurchasePairs([["a", "b"]])), []);
});

test("BR-5 isCoPurchaseStatus: hanya dibayar/diproses/selesai (K2)", () => {
  assert.equal(isCoPurchaseStatus("dibayar"), true);
  assert.equal(isCoPurchaseStatus("diproses"), true);
  assert.equal(isCoPurchaseStatus("selesai"), true);
  assert.equal(isCoPurchaseStatus("dibatalkan"), false);
  assert.equal(isCoPurchaseStatus("kedaluwarsa"), false);
  assert.equal(isCoPurchaseStatus("menunggu_bayar"), false);
  assert.equal(isCoPurchaseStatus(undefined), false);
});
