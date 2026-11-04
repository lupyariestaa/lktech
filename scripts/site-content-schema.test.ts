import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SITE_CONTENT_BYTES,
  siteContentSchema,
} from "../src/lib/site-content-schema.ts";

/** Regresi ADM-14: payload konten admin divalidasi sebelum normalisasi. */

test("payload konten minimal yang valid diterima", () => {
  const parsed = siteContentSchema.safeParse({
    faqs: [{ question: "Apakah bisa custom?", answer: "Bisa." }],
    pricing: [{ name: "Starter", features: ["1 halaman"], highlight: true }],
    hero: {
      enabled: true,
      interval: 4,
      effect: "slide",
      browser: [{ url: "https://res.cloudinary.com/demo/a.webp", alt: "A" }],
    },
  });
  assert.equal(parsed.success, true);
});

test("tipe field yang salah ditolak, bukan dinormalisasi diam-diam", () => {
  assert.equal(siteContentSchema.safeParse({ faqs: "bukan array" }).success, false);
  assert.equal(
    siteContentSchema.safeParse({ pricing: [{ name: "X", highlight: "ya" }] })
      .success,
    false,
  );
  assert.equal(
    siteContentSchema.safeParse({ stats: [{ value: Number.NaN, label: "X" }] })
      .success,
    false,
  );
});

test("string terlalu panjang dan item wajib kosong ditolak", () => {
  assert.equal(
    siteContentSchema.safeParse({ faqs: [{ question: "" }] }).success,
    false,
  );
  assert.equal(
    siteContentSchema.safeParse({ faqs: [{ question: "x".repeat(5001) }] })
      .success,
    false,
  );
});

test("pengaturan hero dibatasi interval dan efeknya", () => {
  assert.equal(
    siteContentSchema.safeParse({ hero: { interval: 1 } }).success,
    false,
  );
  assert.equal(
    siteContentSchema.safeParse({ hero: { interval: 16 } }).success,
    false,
  );
  assert.equal(
    siteContentSchema.safeParse({ hero: { effect: "zoom" } }).success,
    false,
  );
});

test("logo teknologi admin dibatasi ke path lokal aman dan warna hex", () => {
  assert.equal(
    siteContentSchema.safeParse({
      technologies: [{ name: "React", logo: "/tech/react.svg", color: "#61DAFB" }],
    }).success,
    true,
  );
  for (const logo of ["https://evil.example/logo.svg", "//evil.example/logo.svg", "/tech/../secret.svg"]) {
    assert.equal(
      siteContentSchema.safeParse({ technologies: [{ name: "React", logo }] }).success,
      false,
    );
  }
  assert.equal(
    siteContentSchema.safeParse({ technologies: [{ name: "React", color: "red" }] }).success,
    false,
  );
  assert.equal(
    siteContentSchema.safeParse({ technologies: [{ name: "x".repeat(61) }] }).success,
    false,
  );
});

test("batas payload berada di bawah batas dokumen Firestore", () => {
  assert.ok(MAX_SITE_CONTENT_BYTES < 1_048_576);
});
