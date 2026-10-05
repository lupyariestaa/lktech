import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLeadScore,
  scoreTier,
  statusToStage,
  stageToStatus,
  isPipelineStage,
  normalizeScore,
} from "../src/lib/lead-scoring-pure.ts";

/**
 * Uji lead scoring & pemetaan pipeline (Tema 3.2, FASE L1).
 * Jalankan: `npm run test:leads`
 */

test("computeLeadScore: lead lengkap berkualitas → skor tinggi", () => {
  const score = computeLeadScore({
    email: "budi@example.com",
    phone: "081234567890",
    service: "Pembuatan Website",
    message: "Saya butuh website company profile untuk UMKM saya, mohon info paket dan estimasi waktu pengerjaan yang tersedia.",
    stage: "proposal",
  });
  assert.ok(score >= 70, `skor ${score} harus >= 70`);
  assert.ok(score <= 100);
});

test("computeLeadScore: lead minim → skor rendah", () => {
  const score = computeLeadScore({ email: "", phone: "", service: "lainnya", message: "halo" });
  assert.ok(score < 40, `skor ${score} harus < 40`);
});

test("computeLeadScore: selalu 0..100", () => {
  for (const s of [
    {},
    { message: "x".repeat(2000) },
    { email: "a@b.co", phone: "6281234567890", service: "Aplikasi Mobile", message: "y".repeat(500), stage: "proposal" },
  ]) {
    const score = computeLeadScore(s as never);
    assert.ok(score >= 0 && score <= 100, `skor ${score} di luar 0..100`);
  }
});

test("computeLeadScore: email/telepon menambah skor", () => {
  const base = computeLeadScore({ service: "lainnya", message: "x" });
  const withContact = computeLeadScore({
    email: "a@b.co",
    phone: "6281234567890",
    service: "lainnya",
    message: "x",
  });
  assert.ok(withContact > base);
});

test("scoreTier: pembagian hot/warm/cold", () => {
  assert.equal(scoreTier(85), "hot");
  assert.equal(scoreTier(70), "hot");
  assert.equal(scoreTier(55), "warm");
  assert.equal(scoreTier(40), "warm");
  assert.equal(scoreTier(20), "cold");
});

test("statusToStage: pemetaan status lama → stage", () => {
  assert.equal(statusToStage("baru"), "baru");
  assert.equal(statusToStage("diproses"), "dihubungi");
  assert.equal(statusToStage("selesai"), "menang");
  assert.equal(statusToStage("arsip"), "kalah");
  assert.equal(statusToStage("entah"), "baru");
});

test("stageToStatus: pemetaan stage → status lama", () => {
  assert.equal(stageToStatus("baru"), "baru");
  assert.equal(stageToStatus("dihubungi"), "diproses");
  assert.equal(stageToStatus("proposal"), "diproses");
  assert.equal(stageToStatus("menang"), "selesai");
  assert.equal(stageToStatus("kalah"), "arsip");
});

test("pemetaan dua arah konsisten (round-trip)", () => {
  for (const s of ["baru", "diproses", "selesai", "arsip"]) {
    assert.equal(stageToStatus(statusToStage(s)), s, `round-trip ${s}`);
  }
});

test("isPipelineStage: validasi", () => {
  assert.equal(isPipelineStage("dihubungi"), true);
  assert.equal(isPipelineStage("menang"), true);
  assert.equal(isPipelineStage("entah"), false);
  assert.equal(isPipelineStage(123), false);
});

test("normalizeScore: jepit 0..100 & bulatkan", () => {
  assert.equal(normalizeScore(72.4), 72);
  assert.equal(normalizeScore(-5), 0);
  assert.equal(normalizeScore(500), 100);
  assert.equal(normalizeScore("x"), undefined);
});
