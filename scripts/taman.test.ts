import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateSubmit,
  SUBMIT_LIMITS,
  hasTooManyPending,
  normalizeTamanTestimonial,
  canPublish,
  isPubliclyVisible,
  isValidPastDate,
  MIN_TO_SHOW,
  pickSlots,
  publicPool,
  publicView,
  sanitizeRating,
  shortName,
  shouldShowFrame,
  slotCountFor,
  validateQuote,
} from "../src/lib/taman-logic.ts";


type T = {
  id: string;
  kind: "real" | "sample";
  status: "pending" | "published" | "hidden" | "rejected";
  displayName: string;
  fullName?: string;
  role: string;
  quote: string;
  rating: number;
  dateISO: string;
  animal: "kucing" | "kelinci" | "burung" | "rubah" | "beruang" | "kura-kura" | "kupu-kupu" | "ikan";
  order: number;
  projectSlug?: string;
  productSlug?: string;
  source: "submitted" | "admin" | "review" | "legacy" | "sample";
  sourceRefId?: string;
  ownerUid?: string;
  consent: { given: boolean; givenAtISO?: string };
  createdAtISO: string;
  updatedAtISO: string;
  approvedBy?: string;
};

function t(over: Partial<T> = {}): T {
  return {
    id: "x",
    kind: "real",
    status: "published",
    displayName: "Budi S.",
    role: "Pemilik Toko Kopi",
    quote: "Website saya sekarang jauh lebih rapi dan pelanggan makin banyak.",
    rating: 5,
    dateISO: "2026-09-01",
    animal: "kucing",
    order: 0,
    source: "submitted",
    ownerUid: "uid-rahasia",
    consent: { given: true, givenAtISO: "2026-09-01T00:00:00Z" },
    createdAtISO: "2026-09-01T00:00:00Z",
    updatedAtISO: "2026-09-01T00:00:00Z",
    ...over,
  };
}

/* ---------- shortName (Q4) ---------- */

test("T2 shortName: nama ganda → depan + inisial belakang", () => {
  assert.equal(shortName("Budi Santoso"), "Budi S.");
});

test("T2 shortName: nama tiga kata → depan + inisial kata terakhir", () => {
  assert.equal(shortName("Siti Nur Aisyah"), "Siti A.");
});

test("T2 shortName: nama tunggal dipakai apa adanya", () => {
  assert.equal(shortName("Rani"), "Rani");
});

test("T2 shortName: spasi berlebih dan kosong ditangani", () => {
  assert.equal(shortName("   Ani    Wijaya  "), "Ani W.");
  assert.equal(shortName("   "), "");
});

test("T2 shortName: dipotong ke batas panjang", () => {
  const out = shortName("Abcdefghij Klmnopqrst", 6);
  assert.ok(out.length <= 6);
});

test("T2 shortName: inisial huruf kapital", () => {
  assert.equal(shortName("budi santoso"), "budi S.");
});

/* ---------- Whitelist publik (keamanan D1) ---------- */

test("T2 publicView: tidak mengandung field privat", () => {
  const v = publicView(
    t({ fullName: "Budi Santoso Lengkap", ownerUid: "uid-rahasia" }) as never,
  ) as unknown as Record<string, unknown>;
  for (const k of ["email", "fullName", "ownerUid", "uid", "evidenceNote", "consent", "approvedBy", "sourceRefId"]) {
    assert.equal(k in v, false, `field privat bocor: ${k}`);
  }
});

test("T2 publicView: menyertakan field publik yang diperlukan", () => {
  const v = publicView(t({ projectSlug: "proyek-a" }) as never);
  assert.equal(v.displayName, "Budi S.");
  assert.equal(v.animal, "kucing");
  assert.equal(v.projectSlug, "proyek-a");
  assert.equal("productSlug" in v, false);
});

/* ---------- Visibilitas publik (D2 & moderasi) ---------- */

test("T2 isPubliclyVisible: published + real + consent → tampil", () => {
  assert.equal(isPubliclyVisible(t() as never), true);
});

test("T2 isPubliclyVisible: sample TIDAK pernah tampil publik (D2)", () => {
  assert.equal(isPubliclyVisible(t({ kind: "sample" }) as never), false);
});

test("T2 isPubliclyVisible: pending/hidden/rejected tidak tampil", () => {
  for (const status of ["pending", "hidden", "rejected"] as const) {
    assert.equal(isPubliclyVisible(t({ status }) as never), false, status);
  }
});

test("T2 isPubliclyVisible: tanpa persetujuan tidak tampil", () => {
  assert.equal(isPubliclyVisible(t({ consent: { given: false } }) as never), false);
});

test("T2 publicPool: hanya lolos filter, urut order, tanpa field privat", () => {
  const pool = publicPool([
    t({ id: "b", order: 2 }),
    t({ id: "a", order: 1 }),
    t({ id: "s", kind: "sample", order: 0 }),
    t({ id: "p", status: "pending", order: 0 }),
  ] as never);
  assert.deepEqual(pool.map((p) => p.id), ["a", "b"]);
  assert.equal("ownerUid" in pool[0], false);
});

/* ---------- Slot per device (Q5) ---------- */

test("T2 slotCountFor: mobile 4, tablet 6, desktop 8", () => {
  assert.equal(slotCountFor(375), 4);
  assert.equal(slotCountFor(639), 4);
  assert.equal(slotCountFor(640), 6);
  assert.equal(slotCountFor(1023), 6);
  assert.equal(slotCountFor(1024), 8);
  assert.equal(slotCountFor(1920), 8);
});

test("T2 shouldShowFrame: tampil bila ≥ minimum (Q6)", () => {
  assert.equal(MIN_TO_SHOW, 3);
  assert.equal(shouldShowFrame(2), false);
  assert.equal(shouldShowFrame(3), true);
});

/* ---------- Gacha (§3.3) ---------- */

/** RNG deterministik (LCG) untuk pengujian. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const POOL = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}` }));

test("T2 pickSlots: pool ≤ slot → semua, tanpa acak", () => {
  const r = pickSlots(POOL.slice(0, 3), 4, [], seeded(1));
  assert.deepEqual(r.map((x) => x.id), ["t0", "t1", "t2"]);
});

test("T2 pickSlots: hasil tanpa duplikat & sesuai jumlah slot", () => {
  const r = pickSlots(POOL, 4, [], seeded(7));
  assert.equal(r.length, 4);
  assert.equal(new Set(r.map((x) => x.id)).size, 4);
});

test("T2 pickSlots: deterministik dengan RNG yang sama", () => {
  const a = pickSlots(POOL, 6, ["t0"], seeded(42)).map((x) => x.id);
  const b = pickSlots(POOL, 6, ["t0"], seeded(42)).map((x) => x.id);
  assert.deepEqual(a, b);
});

test("T2 pickSlots: set baru tidak identik dengan set sebelumnya bila pool cukup", () => {
  const recent = ["t0", "t1", "t2", "t3"];
  for (let seed = 1; seed <= 25; seed++) {
    const r = pickSlots(POOL, 4, recent, seeded(seed)).map((x) => x.id);
    assert.equal(
      r.every((id) => recent.includes(id)),
      false,
      `seed ${seed} menghasilkan set identik`,
    );
  }
});

test("T2 pickSlots: testimoni recent bisa tetap muncul (bobot kecil, bukan dilarang)", () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) {
    for (const x of pickSlots(POOL, 4, ["t0"], seeded(seed))) seen.add(x.id);
  }
  assert.equal(seen.has("t0"), true);
});

test("T2 pickSlots: slot 0 atau pool kosong → kosong", () => {
  assert.deepEqual(pickSlots(POOL, 0, [], seeded(1)), []);
  assert.deepEqual(pickSlots([], 4, [], seeded(1)), []);
});

/* ---------- Aturan publish (§6.1, Q19) ---------- */

test("T2 canPublish: tanpa persetujuan → ditolak", () => {
  const r = canPublish({ kind: "real", consent: { given: false } }, "bukti");
  assert.equal(r.ok, false);
});

test("T2 canPublish: persetujuan ada tapi tanpa catatan bukti → ditolak", () => {
  assert.equal(canPublish({ kind: "real", consent: { given: true } }, undefined).ok, false);
  assert.equal(canPublish({ kind: "real", consent: { given: true } }, "  ").ok, false);
});

test("T2 canPublish: persetujuan + bukti → diizinkan", () => {
  assert.equal(canPublish({ kind: "real", consent: { given: true } }, "Email tgl 1 Sep").ok, true);
});

test("T2 canPublish: sample tidak diuji persetujuan (lokal/pratinjau saja, D2)", () => {
  assert.equal(canPublish({ kind: "sample", consent: { given: false } }, undefined).ok, true);
});

/* ---------- Input ---------- */

test("T2 sanitizeRating: bulat 1..5, selain itu null", () => {
  assert.equal(sanitizeRating(4.6), 5);
  assert.equal(sanitizeRating(1), 1);
  assert.equal(sanitizeRating(0), null);
  assert.equal(sanitizeRating(6), null);
  assert.equal(sanitizeRating("5"), null);
  assert.equal(sanitizeRating(Number.NaN), null);
});

test("T2 validateQuote: batas min/max dan pemangkasan", () => {
  assert.equal(validateQuote("  pendek  ", 20, 400).ok, false);
  const ok = validateQuote("   Ini pesan yang cukup panjang untuk diterima.   ", 20, 400);
  assert.equal(ok.ok && ok.value, "Ini pesan yang cukup panjang untuk diterima.");
  assert.equal(validateQuote("x".repeat(401), 20, 400).ok, false);
});

test("T2 isValidPastDate: tidak di masa depan, format valid", () => {
  const now = Date.parse("2026-10-10T00:00:00Z");
  assert.equal(isValidPastDate("2026-10-01", now), true);
  assert.equal(isValidPastDate("2026-12-01", now), false);
  assert.equal(isValidPastDate("bukan-tanggal", now), false);
});

/* ---------- Normalisasi data lama (§11, migrasi) ---------- */

test("T2 normalizeTamanTestimonial: data tanpa field baru tetap valid (default aman)", () => {
  const n = normalizeTamanTestimonial("lama-1", { displayName: "Ani W.", quote: "q", rating: 9 });
  assert.equal(n.kind, "real");
  assert.equal(n.status, "pending");
  assert.equal(n.rating, 5);
  assert.equal(n.animal, "kucing");
  assert.equal(n.consent.given, false);
});

test("T2 normalizeTamanTestimonial: hewan & status tak dikenal → default", () => {
  const n = normalizeTamanTestimonial("x", { animal: "naga", status: "entah", kind: "lain" });
  assert.equal(n.animal, "kucing");
  assert.equal(n.status, "pending");
  assert.equal(n.kind, "real");
});

/* ---------- T4: validasi kirim testimoni ---------- */

const NOW = Date.parse("2026-10-10T00:00:00Z");
const GOOD = {
  displayName: "Budi Santoso",
  role: "Pemilik Toko Kopi",
  quote: "Website saya sekarang rapi dan pelanggan makin banyak datang.",
  rating: 5,
  dateISO: "2026-09-15",
  consent: true,
};

test("T4 validateSubmit: input benar → nama disingkat & nilai dinormalisasi", () => {
  const r = validateSubmit(GOOD, NOW, "Fallback");
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.displayName, "Budi S.");
    assert.equal(r.value.rating, 5);
    assert.equal(r.value.dateISO, "2026-09-15");
  }
});

test("T4 validateSubmit: tanpa persetujuan → ditolak (Q19)", () => {
  assert.equal(validateSubmit({ ...GOOD, consent: false }, NOW, "x").ok, false);
  assert.equal(validateSubmit({ ...GOOD, consent: undefined }, NOW, "x").ok, false);
});

test("T4 validateSubmit: nama kosong memakai nama akun Google", () => {
  const r = validateSubmit({ ...GOOD, displayName: "  " }, NOW, "Ani Wijaya");
  assert.equal(r.ok && r.value.displayName, "Ani W.");
});

test("T4 validateSubmit: peran wajib dan dibatasi", () => {
  assert.equal(validateSubmit({ ...GOOD, role: "" }, NOW, "x").ok, false);
  assert.equal(validateSubmit({ ...GOOD, role: "x".repeat(121) }, NOW, "x").ok, false);
});

test("T4 validateSubmit: quote di luar batas ditolak", () => {
  assert.equal(validateSubmit({ ...GOOD, quote: "pendek" }, NOW, "x").ok, false);
  assert.equal(validateSubmit({ ...GOOD, quote: "x".repeat(401) }, NOW, "x").ok, false);
});

test("T4 validateSubmit: rating di luar 1..5 ditolak", () => {
  assert.equal(validateSubmit({ ...GOOD, rating: 0 }, NOW, "x").ok, false);
  assert.equal(validateSubmit({ ...GOOD, rating: 6 }, NOW, "x").ok, false);
});

test("T4 validateSubmit: tanggal masa depan ditolak", () => {
  assert.equal(validateSubmit({ ...GOOD, dateISO: "2027-01-01" }, NOW, "x").ok, false);
});

test("T4 validateSubmit: tanggal kosong → hari ini (ISO tanggal)", () => {
  const r = validateSubmit({ ...GOOD, dateISO: undefined }, NOW, "x");
  assert.equal(r.ok && r.value.dateISO, "2026-10-10");
});

test("T4 validateSubmit: tautan proyek/produk harus slug valid", () => {
  assert.equal(validateSubmit({ ...GOOD, projectSlug: "proyek-ok" }, NOW, "x").ok, true);
  assert.equal(validateSubmit({ ...GOOD, projectSlug: "../etc" }, NOW, "x").ok, false);
  assert.equal(validateSubmit({ ...GOOD, productSlug: "Bad Slug" }, NOW, "x").ok, false);
});

test("T4 validateSubmit: tautan opsional tidak wajib", () => {
  const r = validateSubmit(GOOD, NOW, "x");
  assert.equal(r.ok && "projectSlug" in r.value, false);
});

test("T4 SUBMIT_LIMITS & hasTooManyPending: maks 1 pending aktif", () => {
  assert.equal(SUBMIT_LIMITS.pendingPerUser, 1);
  assert.equal(hasTooManyPending(0), false);
  assert.equal(hasTooManyPending(1), true);
});