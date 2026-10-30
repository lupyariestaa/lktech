import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  parseEmailAddress,
  emailDomainOf,
  isResendTestDomain,
  evaluateSendingDomain,
} from "../src/lib/email-domain-pure.ts";

/**
 * Uji diagnostik domain pengirim Resend (F-14).
 * Jalankan: `npm run test:email-domain`
 */

test("parseEmailAddress: format 'Nama <alamat>' dan alamat telanjang", () => {
  assert.equal(parseEmailAddress("LKTech <onboarding@resend.dev>"), "onboarding@resend.dev");
  assert.equal(parseEmailAddress("halo@lktech.id"), "halo@lktech.id");
  assert.equal(parseEmailAddress("  <halo@lktech.id>  "), "halo@lktech.id");
});

test("parseEmailAddress: string tidak valid → null", () => {
  assert.equal(parseEmailAddress(""), null);
  assert.equal(parseEmailAddress("   "), null);
  assert.equal(parseEmailAddress("LKTech"), null);
  assert.equal(parseEmailAddress("bukan@"), null);
  assert.equal(parseEmailAddress("@domain.id"), null);
  assert.equal(parseEmailAddress("a b@domain.id"), null);
});

test("emailDomainOf: mengambil domain huruf kecil", () => {
  assert.equal(emailDomainOf("halo@LKTech.ID"), "lktech.id");
  assert.equal(emailDomainOf("halo@mail.lktech.id"), "mail.lktech.id");
  assert.equal(emailDomainOf(null), null);
  assert.equal(emailDomainOf("tanpa-at"), null);
});

test("isResendTestDomain: resend.dev dan subdomain", () => {
  assert.equal(isResendTestDomain("resend.dev"), true);
  assert.equal(isResendTestDomain("mail.resend.dev"), true);
  assert.equal(isResendTestDomain("lktech.id"), false);
  assert.equal(isResendTestDomain("notresend.dev"), false);
  assert.equal(isResendTestDomain(null), false);
});

test("evaluateSendingDomain: resend.dev → test_only (menang atas status lain)", () => {
  const h = evaluateSendingDomain({
    from: "LKTech <onboarding@resend.dev>",
    domains: [{ name: "resend.dev", status: "verified" }],
    domainsAvailable: true,
  });
  assert.equal(h.verdict, "test_only");
  assert.equal(h.testOnly, true);
  assert.equal(h.fromDomain, "resend.dev");
  assert.match(h.message, /hanya sampai ke alamat pemilik akun/i);
});

test("evaluateSendingDomain: domain terverifikasi → ready", () => {
  const h = evaluateSendingDomain({
    from: "LKTech <halo@LKTech.id>",
    domains: [{ name: "lktech.id", status: "verified" }],
    domainsAvailable: true,
  });
  assert.equal(h.verdict, "ready");
  assert.equal(h.domainName, "lktech.id");
  assert.equal(h.testOnly, false);
});

test("evaluateSendingDomain: domain tak terdaftar → not_found (penyebab 403)", () => {
  const h = evaluateSendingDomain({
    from: "LKTech <halo@lktech.id>",
    domains: [{ name: "lain.id", status: "verified" }],
    domainsAvailable: true,
  });
  assert.equal(h.verdict, "not_found");
  assert.match(h.message, /403/);
  assert.match(h.message, /lain\.id/);
});

test("evaluateSendingDomain: terdaftar tapi belum terverifikasi → pending", () => {
  for (const status of ["pending", "not_started", ""]) {
    const h = evaluateSendingDomain({
      from: "halo@lktech.id",
      domains: [{ name: "lktech.id", status }],
      domainsAvailable: true,
    });
    assert.equal(h.verdict, "pending", status || "(kosong)");
  }
});

test("evaluateSendingDomain: verifikasi gagal → failed", () => {
  const h = evaluateSendingDomain({
    from: "halo@lktech.id",
    domains: [{ name: "lktech.id", status: "failed" }],
    domainsAvailable: true,
  });
  assert.equal(h.verdict, "failed");
  assert.match(h.message, /DNS/);
});

test("evaluateSendingDomain: daftar domain tak tersedia → unknown (bukan not_found)", () => {
  const h = evaluateSendingDomain({
    from: "halo@lktech.id",
    domains: [],
    domainsAvailable: false,
  });
  assert.equal(h.verdict, "unknown");
});

test("evaluateSendingDomain: EMAIL_FROM tidak valid → unknown", () => {
  const h = evaluateSendingDomain({
    from: "LKTech",
    domains: [],
    domainsAvailable: true,
  });
  assert.equal(h.verdict, "unknown");
  assert.match(h.message, /EMAIL_FROM/);
});