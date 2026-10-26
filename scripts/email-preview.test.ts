import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  EMAIL_PREVIEW_STATUSES,
  EMAIL_PREVIEW_TEMPLATE_LABELS,
  EMAIL_PREVIEW_TEMPLATES,
  isEmailPreviewStatus,
  isEmailPreviewTemplate,
} from "../src/lib/email-preview-pure.ts";

/**
 * Uji pratinjau template email pembeli (`EM-P3`) — guard murni + wiring
 * (endpoint dry-run yang TIDAK mengirim email). Jalankan:
 * `npm run test:email-preview`
 */

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(resolve(here, "..", rel), "utf8");
}

/* ------------------------------ guard murni ------------------------------- */

test("isEmailPreviewTemplate: menerima template dikenal, menolak lainnya", () => {
  for (const t of EMAIL_PREVIEW_TEMPLATES) assert.equal(isEmailPreviewTemplate(t), true);
  assert.equal(isEmailPreviewTemplate("bogus"), false);
  assert.equal(isEmailPreviewTemplate(""), false);
  assert.equal(isEmailPreviewTemplate(null), false);
  assert.equal(isEmailPreviewTemplate(7), false);
});

test("isEmailPreviewStatus: status valid, 'baru' sengaja ditolak", () => {
  for (const s of EMAIL_PREVIEW_STATUSES) assert.equal(isEmailPreviewStatus(s), true);
  // Email update status tidak pernah dikirim untuk status "baru".
  assert.equal(isEmailPreviewStatus("baru"), false);
  assert.equal(isEmailPreviewStatus("ngawur"), false);
  assert.equal(isEmailPreviewStatus(undefined), false);
});

test("label template lengkap untuk tiap template", () => {
  for (const t of EMAIL_PREVIEW_TEMPLATES) {
    assert.equal(typeof EMAIL_PREVIEW_TEMPLATE_LABELS[t], "string");
    assert.ok(EMAIL_PREVIEW_TEMPLATE_LABELS[t].length > 0);
  }
});

/* --------------------------- template dapat dipakai ----------------------- */

test("email-order: menyusun template terpisah dari pengiriman", () => {
  const order = read("src/lib/email-order.ts");
  // Fungsi render (dry-run) ada & diekspor.
  assert.match(order, /export function renderOrderConfirmationEmail\(/);
  assert.match(order, /export function renderOrderPaidEmail\(/);
  assert.match(order, /export function renderOrderStatusEmail\(/);
  // Pengiriman memakai template yang sama (satu sumber kebenaran).
  assert.match(order, /sendEmail\(\{ to: order\.buyerEmail, \.\.\.renderOrderConfirmationEmail\(order\) \}\)/);
  assert.match(order, /sendEmail\(\{ to: order\.buyerEmail, \.\.\.template \}\)/);
  // Pesanan contoh deterministik untuk pratinjau.
  assert.match(order, /export function buildSampleOrder\(/);
  assert.match(order, /export const SAMPLE_DOWNLOAD_LINK/);
});

/* --------------------------------- wiring --------------------------------- */

test("endpoint pratinjau: admin-only & TIDAK PERNAH mengirim email", () => {
  const route = read("src/app/api/admin/email/preview/route.ts");
  assert.match(route, /requireAdmin\(req\)/);
  assert.match(route, /buildSampleOrder\(\)/);
  assert.match(route, /renderOrderConfirmationEmail|renderOrderPaidEmail|renderOrderStatusEmail/);
  assert.match(route, /isEmailPreviewTemplate\(/);
  assert.match(route, /isEmailPreviewStatus\(/);
  // Read-only: tidak boleh ada jalur kirim/HTTP keluar.
  assert.doesNotMatch(route, /sendEmail|RESEND_ENDPOINT|fetch\(/);
  assert.match(route, /"Cache-Control": "no-store"/);
});

test("klien admin & UI memakai pratinjau read-only", () => {
  const api = read("src/lib/admin-settings-api.ts");
  assert.match(api, /export async function fetchEmailPreview\(/);
  assert.match(api, /\/api\/admin\/email\/preview\?/);

  const ui = read("src/components/admin/settings/settings-notifikasi.tsx");
  assert.match(ui, /fetchEmailPreview\(/);
  assert.match(ui, /EMAIL_PREVIEW_TEMPLATES\.map/);
  // HTML pratinjau dari pesanan contoh (bukan masukan pengguna).
  assert.match(ui, /dangerouslySetInnerHTML=\{\{ __html: preview\.html \}\}/);
});
