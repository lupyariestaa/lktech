import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSubscriber,
  matchesSegment,
  validateBroadcast,
  summarizeSubscribers,
  countSegmentRecipients,
} from "../src/lib/newsletter-pure.ts";

/**
 * Uji logika murni Newsletter & Broadcast (F-N*).
 * Jalankan: `npm run test:newsletter`
 */

test("normalizeSubscriber: valid & lowercase email", () => {
  const s = normalizeSubscriber({
    email: "  Budi@Gmail.com ",
    name: "Budi",
    source: "footer",
    createdAtISO: "2026-01-01T00:00:00Z",
    unsubscribed: false,
  });
  assert.equal(s?.email, "budi@gmail.com");
  assert.equal(s?.name, "Budi");
  assert.equal(s?.source, "footer");
  assert.equal(s?.unsubscribed, false);
});

test("normalizeSubscriber: kosong/tak valid → null", () => {
  assert.equal(normalizeSubscriber(null), null);
  assert.equal(normalizeSubscriber({}), null);
  assert.equal(normalizeSubscriber({ email: "  " }), null);
  assert.equal(normalizeSubscriber({ email: 123 }), null);
});

test("normalizeSubscriber: tangkap unsubscribedAtISO (F-N10)", () => {
  const s = normalizeSubscriber({
    email: "a@b.com",
    unsubscribed: true,
    unsubscribedAtISO: "2026-02-02T00:00:00Z",
  });
  assert.equal(s?.unsubscribed, true);
  assert.equal(s?.unsubscribedAtISO, "2026-02-02T00:00:00Z");
});

test("matchesSegment: semua/beli/belum", () => {
  assert.equal(matchesSegment("semua", false), true);
  assert.equal(matchesSegment("semua", true), true);
  assert.equal(matchesSegment("beli", true), true);
  assert.equal(matchesSegment("beli", false), false);
  assert.equal(matchesSegment("belum", false), true);
  assert.equal(matchesSegment("belum", true), false);
});

test("summarizeSubscribers: hitung aktif/berhenti", () => {
  const r = summarizeSubscribers([
    { unsubscribed: false },
    { unsubscribed: true },
    { unsubscribed: false },
  ]);
  assert.deepEqual(r, { total: 3, active: 2, unsubscribed: 1 });
});

test("countSegmentRecipients: hanya aktif & klasifikasi pembeli benar", () => {
  const subs = [
    { email: "buyer1@x.com", unsubscribed: false },
    { email: "buyer2@x.com", unsubscribed: false },
    { email: "nonbuyer@x.com", unsubscribed: false },
    { email: "unsub@x.com", unsubscribed: true }, // diabaikan
  ];
  const buyers = new Set(["buyer1@x.com", "buyer2@x.com"]);
  const counts = countSegmentRecipients(subs, buyers);
  assert.equal(counts.semua, 3); // aktif saja (unsub dikecualikan)
  assert.equal(counts.beli, 2);
  assert.equal(counts.belum, 1);
});

test("countSegmentRecipients: email case-insensitive saat cek pembeli", () => {
  const subs = [{ email: "Buyer@X.com", unsubscribed: false }];
  const buyers = new Set(["buyer@x.com"]);
  assert.equal(countSegmentRecipients(subs, buyers).beli, 1);
});

test("validateBroadcast: subjek/isi minimal", () => {
  assert.equal(validateBroadcast({ subject: "ab", body: "halo" }).ok, false);
  assert.equal(validateBroadcast({ subject: "Promo", body: "ab" }).ok, false);
  const ok = validateBroadcast({ subject: "Promo", body: "Halo semua", segment: "beli" });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.draft.segment, "beli");
});

test("validateBroadcast: segmen tak dikenal → default semua", () => {
  const r = validateBroadcast({ subject: "Promo", body: "Halo", segment: "ngawur" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.draft.segment, "semua");
});

test("validateBroadcast: label tanpa URL & URL tanpa label → diabaikan", () => {
  const a = validateBroadcast({ subject: "Promo", body: "Halo", ctaLabel: "Klik" });
  assert.equal(a.ok, true);
  if (a.ok) assert.equal(a.draft.ctaUrl, undefined);
  const b = validateBroadcast({ subject: "Promo", body: "Halo", ctaUrl: "https://x.com" });
  assert.equal(b.ok, true);
  if (b.ok) assert.equal(b.draft.ctaLabel, undefined);
});

test("validateBroadcast: URL harus http(s) & valid", () => {
  assert.equal(
    validateBroadcast({
      subject: "Promo",
      body: "Halo",
      ctaLabel: "Lihat",
      ctaUrl: "javascript:alert(1)",
    }).ok,
    false,
  );
  assert.equal(
    validateBroadcast({
      subject: "Promo",
      body: "Halo",
      ctaLabel: "Lihat",
      ctaUrl: "bukan-url",
    }).ok,
    false,
  );
  const ok = validateBroadcast({
    subject: "Promo",
    body: "Halo",
    ctaLabel: "Lihat",
    ctaUrl: "https://lktech.vercel.app/promo",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.draft.ctaUrl, "https://lktech.vercel.app/promo");
});
