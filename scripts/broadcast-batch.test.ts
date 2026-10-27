import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  BROADCAST_MAX_PER_RUN,
  nextBroadcastBatch,
  normalizeBroadcastCursor,
} from "../src/lib/broadcast-batch-pure.ts";

/**
 * Regresi ADM-18: broadcast email tanpa cursor batch → risiko penerima dapat
 * email ganda saat "kirim ulang segmen".
 *
 * Solusi: batch berbasis KURSOR EMAIL. Batch berikutnya HANYA berisi email
 * `> cursor`, sehingga penerima yang sudah diproses tidak pernah dikirim ulang.
 *
 * Uji logika murni + wiring. Ini bukan pengganti E2E terautentikasi.
 * Jalankan: `npm run test:broadcast-batch`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

/* --------------------------- normalizeBroadcastCursor --------------------------- */

test("normalizeBroadcastCursor: menerima email & melowercase/trim", () => {
  assert.equal(normalizeBroadcastCursor("  User@Example.com "), "user@example.com");
  assert.equal(normalizeBroadcastCursor("a@b.co"), "a@b.co");
});

test("normalizeBroadcastCursor: null untuk input tak valid", () => {
  assert.equal(normalizeBroadcastCursor(undefined), null);
  assert.equal(normalizeBroadcastCursor(null), null);
  assert.equal(normalizeBroadcastCursor(""), null);
  assert.equal(normalizeBroadcastCursor("   "), null);
  assert.equal(normalizeBroadcastCursor(42), null);
  assert.equal(normalizeBroadcastCursor("x".repeat(321)), null);
});

/* ------------------------------ nextBroadcastBatch ------------------------------ */

test("nextBroadcastBatch: segmen kecil → satu batch selesai", () => {
  const r = nextBroadcastBatch(["a@x.com", "b@x.com"], null, 200);
  assert.deepEqual(r.batch, ["a@x.com", "b@x.com"]);
  assert.equal(r.done, true);
  assert.equal(r.remaining, 0);
  assert.equal(r.total, 2);
  assert.equal(r.nextCursor, "b@x.com");
});

test("nextBroadcastBatch: batasi ke batchSize & laporkan sisa", () => {
  const emails = ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"];
  const r = nextBroadcastBatch(emails, null, 2);
  assert.deepEqual(r.batch, ["a@x.com", "b@x.com"]);
  assert.equal(r.done, false);
  assert.equal(r.remaining, 3);
  assert.equal(r.total, 5);
  assert.equal(r.nextCursor, "b@x.com");
});

test("nextBroadcastBatch: lanjutan hanya email > kursor (tanpa tumpang tindih)", () => {
  const emails = ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"];
  const first = nextBroadcastBatch(emails, null, 2);
  const second = nextBroadcastBatch(emails, first.nextCursor, 2);
  assert.deepEqual(second.batch, ["c@x.com", "d@x.com"]);
  assert.equal(second.done, false);
  assert.equal(second.remaining, 1);

  const third = nextBroadcastBatch(emails, second.nextCursor, 2);
  assert.deepEqual(third.batch, ["e@x.com"]);
  assert.equal(third.done, true);
  assert.equal(third.remaining, 0);
});

test("nextBroadcastBatch: kursor di ujung → batch kosong & selesai (idempoten)", () => {
  const r = nextBroadcastBatch(["a@x.com", "b@x.com"], "b@x.com", 200);
  assert.deepEqual(r.batch, []);
  assert.equal(r.done, true);
  assert.equal(r.remaining, 0);
  assert.equal(r.nextCursor, "b@x.com");
});

test("nextBroadcastBatch: menambah penerima baru TIDAK mengirim ulang yang lama", () => {
  // Batch 1 sudah mengirim a..b. Lalu muncul penerima baru (z) & subscriber lama.
  const grown = ["a@x.com", "b@x.com", "c@x.com", "z@x.com"];
  const r = nextBroadcastBatch(grown, "b@x.com", 200);
  assert.deepEqual(r.batch, ["c@x.com", "z@x.com"]);
  assert.ok(!r.batch.includes("a@x.com"));
  assert.ok(!r.batch.includes("b@x.com"));
});

test("nextBroadcastBatch: daftar tak terurut tetap menghasilkan kursor yang benar", () => {
  const r = nextBroadcastBatch(["c@x.com", "a@x.com", "b@x.com"], null, 2);
  assert.deepEqual(r.batch, ["a@x.com", "b@x.com"]);
  assert.equal(r.nextCursor, "b@x.com");
});

test("nextBroadcastBatch: ukuran batch tak valid jatuh ke default", () => {
  const r = nextBroadcastBatch(["a@x.com"], null, 0);
  assert.deepEqual(r.batch, ["a@x.com"]);
  assert.equal(r.done, true);
  assert.equal(BROADCAST_MAX_PER_RUN, 200);
});

/* ----------------------------------- Wiring ------------------------------------ */

test("ADM-18: email-broadcast tidak lagi memotong daftar sendiri (satu sumber)", () => {
  const src = read("src/lib/email-broadcast.ts");
  assert.match(src, /import \{ BROADCAST_MAX_PER_RUN \} from "@\/lib\/broadcast-batch-pure"/);
  assert.match(src, /export \{ BROADCAST_MAX_PER_RUN \}/);
  // Pemotongan dilakukan route via kursor, bukan di sini.
  assert.doesNotMatch(src, /slice\(0, BROADCAST_MAX_PER_RUN\)/);
});

test("ADM-18: route memakai jendela kursor & mengembalikan cursor/done/remaining", () => {
  const src = read("src/app/api/admin/broadcast/route.ts");
  assert.match(src, /nextBroadcastBatch,?\s|nextBroadcastBatch\(/);
  assert.match(src, /normalizeBroadcastCursor\(body\.cursor\)/);
  assert.match(src, /const chunk = nextBroadcastBatch\(recipients, cursor, BROADCAST_MAX_PER_RUN\)/);
  assert.match(src, /recipients: chunk\.batch/);
  assert.match(src, /reserveBroadcastQuota\(chunk\.batch\.length\)/);
  assert.match(src, /cursor: chunk\.nextCursor/);
  assert.match(src, /remaining: chunk\.remaining/);
  assert.match(src, /done: chunk\.done/);
  // Bucket rate-limit terpisah untuk kelanjutan batch.
  assert.match(src, /broadcast-\$\{isContinuation \? "continue" : action\}/);
});

test("ADM-18: segmen diurutkan agar kursor stabil (anti-duplikat)", () => {
  const src = read("src/lib/newsletter.ts");
  assert.match(src, /Array\.from\(new Set\(emails\)\)\.sort\(/);
});

test("ADM-18: klien mengirim cursor & UI menawarkan 'Lanjutkan'", () => {
  const api = read("src/lib/admin-broadcast-api.ts");
  assert.match(api, /cursor\?: string \| null/);
  assert.match(api, /done\?: boolean/);

  const ui = read("src/components/admin/broadcast/broadcast-composer.tsx");
  assert.match(ui, /const \[cursor, setCursor\] = useState<string \| null>\(null\)/);
  assert.match(ui, /const \[remaining, setRemaining\] = useState\(0\)/);
  assert.match(ui, /cursor,/);
  assert.match(ui, /res\.done !== false/);
  assert.match(ui, /setCursor\(res\.cursor \?\? null\)/);
  assert.match(ui, /setRemaining\(res\.remaining \?\? 0\)/);
  assert.match(ui, /Lanjutkan \(sisa \$\{remaining\}\)/);

  const idem = read("src/lib/broadcast-idempotency.ts");
  assert.match(idem, /cursor\?: string \| null/);
  assert.match(idem, /done\?: boolean/);
});
