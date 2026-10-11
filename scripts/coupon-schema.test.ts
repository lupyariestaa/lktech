import { test } from "node:test";
import assert from "node:assert/strict";
import {
  couponCreateSchema,
  couponUpdateSchema,
} from "../src/lib/api-schemas.ts";

/**
 * Uji schema kupon (server) menerima field C1 (upgrade UI dialog) — memastikan
 * field lanjutan TIDAK dibuang zod.
 * Jalankan: `npm run test:coupon-schema`
 */

function base(partial: Record<string, unknown> = {}) {
  return { code: "PROMO10", type: "percent", value: 10, minSpend: 0, ...partial };
}

test("schema: menerima tipe tiered + tiers", () => {
  const r = couponCreateSchema.safeParse(
    base({ type: "tiered", value: 0, tiers: [{ minSpend: 100_000, value: 10 }] }),
  );
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.type, "tiered");
    assert.equal(r.data.tiers?.length, 1);
  }
});

test("schema: menerima field lanjutan (campaign/audience/singleUse/perDayLimit/assignedEmail)", () => {
  const r = couponCreateSchema.safeParse(
    base({
      campaign: "Ramadan 2026",
      audience: "baru",
      singleUse: true,
      perDayLimit: 50,
      assignedEmail: "BUDI@Mail.com",
      stackable: true,
    }),
  );
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.campaign, "Ramadan 2026");
    assert.equal(r.data.audience, "baru");
    assert.equal(r.data.singleUse, true);
    assert.equal(r.data.perDayLimit, 50);
    // assignedEmail dinormalisasi lowercase.
    assert.equal(r.data.assignedEmail, "budi@mail.com");
    assert.equal(r.data.stackable, true);
  }
});

test("schema: menolak audience tak dikenal", () => {
  assert.equal(couponCreateSchema.safeParse(base({ audience: "vip" })).success, false);
});

test("schema: menolak tipe tak dikenal", () => {
  assert.equal(couponCreateSchema.safeParse(base({ type: "gratis" })).success, false);
});

test("schema: tiered tanpa tiers tetap valid (divalidasi klien)", () => {
  assert.equal(couponCreateSchema.safeParse(base({ type: "tiered", value: 0 })).success, true);
});

test("schema: update menerima campuran field parsial", () => {
  const r = couponUpdateSchema.safeParse({ campaign: "Lebaran", singleUse: true });
  assert.equal(r.success, true);
});

test("schema: tanggal mulai harus < berakhir", () => {
  const bad = couponCreateSchema.safeParse(
    base({ startsAt: "2026-02-01T00:00:00Z", endsAt: "2026-01-01T00:00:00Z" }),
  );
  assert.equal(bad.success, false);
});
