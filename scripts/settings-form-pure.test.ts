import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isoToLocalInput,
  localInputToIso,
  validateSettingsForm,
  validateEmail,
  validateWhatsapp,
  validateUrl,
  isFormValid,
} from "../src/lib/settings-form-pure.ts";

/**
 * Uji logika form Pengaturan murni (fase P2: gap G10/G11).
 * Jalankan: `npm run test:settings-form`
 */

/* ---- G10: datetime-local ↔ ISO round-trip (zona lokal konsisten) ---- */

test("isoToLocalInput: kosong / invalid", () => {
  assert.equal(isoToLocalInput(""), "");
  assert.equal(isoToLocalInput(undefined), "");
  assert.equal(isoToLocalInput("bukan-tanggal"), "");
});

test("localInputToIso: kosong / invalid", () => {
  assert.equal(localInputToIso(""), "");
  assert.equal(localInputToIso("abc"), "");
});

test("datetime round-trip: ISO → lokal → ISO konsisten", () => {
  // Waktu lokal yang valid (bukan mengandalkan zona tetap).
  const local = "2026-11-20T14:30";
  const iso = localInputToIso(local);
  assert.notEqual(iso, "");
  const back = isoToLocalInput(iso);
  assert.equal(back, local); // round-trip tak bergeser
});

/* ---- G11: validasi per-field ---- */

test("validateEmail", () => {
  assert.equal(validateEmail("a@b.com"), null);
  assert.equal(validateEmail(""), null); // opsional
  assert.notEqual(validateEmail(""), "Email wajib diisi.");
  assert.equal(validateEmail("", true), "Email wajib diisi.");
  assert.equal(validateEmail("salah"), "Format email tidak valid (contoh: nama@email.com).");
});

test("validateWhatsapp: lokal & internasional", () => {
  assert.equal(validateWhatsapp("08123456789"), null);
  assert.equal(validateWhatsapp("628123456789"), null);
  assert.equal(validateWhatsapp("+62 812-3456-789"), null);
  assert.equal(validateWhatsapp(""), null); // opsional
  assert.notEqual(validateWhatsapp("123"), null); // terlalu pendek
});

test("validateUrl", () => {
  assert.equal(validateUrl("https://x.id/a"), null);
  assert.equal(validateUrl("http://x.id"), null);
  assert.equal(validateUrl(""), null); // opsional
  assert.notEqual(validateUrl("x.id"), null);
});

test("validateSettingsForm: form valid → tanpa error", () => {
  const errs = validateSettingsForm({
    email: "a@b.com",
    whatsapp: "08123456789",
    socials: [{ label: "Instagram", href: "https://instagram.com/lktech" }],
  });
  assert.equal(isFormValid(errs), true);
});

test("validateSettingsForm: error email & sosial ditandai per-field", () => {
  const errs = validateSettingsForm({
    email: "bukan-email",
    whatsapp: "",
    socials: [{ label: "", href: "bukan-url" }],
  });
  assert.ok(errs.email);
  assert.ok(errs["socials.0.label"]);
  assert.ok(errs["socials.0.href"]);
});

test("validateSettingsForm: baris sosial kosong diabaikan", () => {
  const errs = validateSettingsForm({
    email: "a@b.com",
    whatsapp: "",
    socials: [{ label: "", href: "" }],
  });
  assert.equal(isFormValid(errs), true);
});

test("validateSettingsForm: maintenance (imageUrl, contactEmail) & seo.ogImage", () => {
  const errs = validateSettingsForm({
    email: "a@b.com",
    whatsapp: "",
    socials: [],
    seo: { ogImage: "bukan-url" },
    maintenance: { imageUrl: "x", contactEmail: "salah" },
  });
  assert.ok(errs["seo.ogImage"]);
  assert.ok(errs["maintenance.imageUrl"]);
  assert.ok(errs["maintenance.contactEmail"]);
});
