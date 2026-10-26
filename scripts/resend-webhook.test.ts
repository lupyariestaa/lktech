import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  SVIX_TOLERANCE_SEC,
  classifyResendEvent,
  computeSvixSignature,
  decodeSvixSecret,
  deliveryStatusFor,
  parseResendEvent,
  verifySvixSignature,
} from "../src/lib/resend-webhook-pure.ts";

/**
 * Uji webhook Resend (`EM-P2`) — logika murni (verifikasi tanda tangan Svix &
 * klasifikasi event) + wiring. Jalankan: `npm run test:resend-webhook`
 */

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(resolve(here, "..", rel), "utf8");
}

const RAW_SECRET = "my-resend-secret";
const SECRET = `whsec_${Buffer.from(RAW_SECRET).toString("base64")}`;
const NOW = 1_800_000_000;

function sign(body: string, id = "msg_1", timestamp = String(NOW)): string {
  const sig = computeSvixSignature({ secret: SECRET, id, timestamp, body });
  assert.ok(sig, "tanda tangan harus dihitung");
  return sig;
}

/* ---------------------------- decodeSvixSecret ---------------------------- */

test("decodeSvixSecret: buang awalan whsec_ & decode base64", () => {
  const key = decodeSvixSecret(SECRET);
  assert.ok(key);
  assert.equal(key!.toString("utf8"), RAW_SECRET);
  // Tanpa awalan whsec_ juga diterima.
  assert.equal(decodeSvixSecret(Buffer.from(RAW_SECRET).toString("base64"))!.toString("utf8"), RAW_SECRET);
});

test("decodeSvixSecret: secret kosong/bukan base64 → null", () => {
  assert.equal(decodeSvixSecret(""), null);
  assert.equal(decodeSvixSecret("whsec_"), null);
});

/* -------------------------- computeSvixSignature -------------------------- */

test("computeSvixSignature: cocok dengan HMAC-SHA256 manual", () => {
  const body = '{"type":"email.delivered"}';
  const expected = crypto
    .createHmac("sha256", Buffer.from(RAW_SECRET))
    .update(`msg_1.${NOW}.${body}`)
    .digest("base64");
  assert.equal(computeSvixSignature({ secret: SECRET, id: "msg_1", timestamp: String(NOW), body }), expected);
});

test("computeSvixSignature: secret tak valid → null", () => {
  assert.equal(computeSvixSignature({ secret: "", id: "a", timestamp: "1", body: "{}" }), null);
});

/* --------------------------- verifySvixSignature -------------------------- */

test("verifySvixSignature: tanda tangan sah → true", () => {
  const body = '{"type":"email.delivered"}';
  assert.equal(
    verifySvixSignature({
      secret: SECRET,
      id: "msg_1",
      timestamp: String(NOW),
      signature: `v1,${sign(body)}`,
      body,
      nowSec: NOW,
    }),
    true,
  );
});

test("verifySvixSignature: body/header diubah → false", () => {
  const body = '{"type":"email.delivered"}';
  const signature = `v1,${sign(body)}`;
  const base = { secret: SECRET, id: "msg_1", timestamp: String(NOW), signature, nowSec: NOW };
  assert.equal(verifySvixSignature({ ...base, body: '{"type":"email.bounced"}' }), false);
  assert.equal(verifySvixSignature({ ...base, id: "msg_2", body }), false);
  assert.equal(verifySvixSignature({ ...base, signature: "v1,AAAA", body }), false);
});

test("verifySvixSignature: stempel waktu di luar toleransi → false", () => {
  const body = "{}";
  assert.equal(
    verifySvixSignature({
      secret: SECRET,
      id: "msg_1",
      timestamp: String(NOW - SVIX_TOLERANCE_SEC - 1),
      signature: `v1,${sign(body, "msg_1", String(NOW - SVIX_TOLERANCE_SEC - 1))}`,
      body,
      nowSec: NOW,
    }),
    false,
  );
  assert.equal(verifySvixSignature({ secret: SECRET, id: "msg_1", timestamp: "abc", signature: "v1,x", body, nowSec: NOW }), false);
});

test("verifySvixSignature: menerima beberapa skema dalam satu header", () => {
  const body = '{"type":"email.sent"}';
  const header = `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= v1,${sign(body)}`;
  assert.equal(
    verifySvixSignature({ secret: SECRET, id: "msg_1", timestamp: String(NOW), signature: header, body, nowSec: NOW }),
    true,
  );
});

test("verifySvixSignature: parameter kurang → false", () => {
  const body = "{}";
  const full = { secret: SECRET, id: "msg_1", timestamp: String(NOW), signature: `v1,${sign(body)}`, body, nowSec: NOW };
  assert.equal(verifySvixSignature({ ...full, secret: "" }), false);
  assert.equal(verifySvixSignature({ ...full, body: "" }), false);
  assert.equal(verifySvixSignature({ ...full, signature: "" }), false);
});

/* ------------------------- klasifikasi & parsing -------------------------- */

test("classifyResendEvent & deliveryStatusFor: memetakan tipe event", () => {
  assert.equal(classifyResendEvent("email.sent"), "sent");
  assert.equal(classifyResendEvent("email.delivered"), "delivered");
  assert.equal(classifyResendEvent("email.delivery_delayed"), "delivery_delayed");
  assert.equal(classifyResendEvent("email.bounced"), "bounced");
  assert.equal(classifyResendEvent("email.complained"), "complained");
  assert.equal(classifyResendEvent("email.opened"), "ignored");
  assert.equal(deliveryStatusFor("delivered"), "delivered");
  assert.equal(deliveryStatusFor("ignored"), null);
});

test("parseResendEvent: { type, data.email_id }", () => {
  const e = parseResendEvent({
    type: "email.bounced",
    data: { email_id: "e_123", to: "rahasia@example.com" },
  });
  assert.deepEqual(e, { type: "email.bounced", emailId: "e_123", outcome: "bounced" });
});

test("parseResendEvent: fallback data.id & tolak bentuk tak dikenal", () => {
  assert.equal(parseResendEvent({ type: "email.delivered", data: { id: "e_9" } })?.emailId, "e_9");
  assert.equal(parseResendEvent({ type: "", data: { email_id: "e_1" } }), null);
  assert.equal(parseResendEvent({ type: "email.delivered" }), null);
  assert.equal(parseResendEvent(null), null);
  assert.equal(parseResendEvent([{ type: "email.delivered", data: {} }]), null);
  assert.equal(parseResendEvent("bukan objek"), null);
});

/* ------------------------------- wiring ----------------------------------- */

test("wiring: endpoint & secret fail-safe (EM-P2)", () => {
  const route = read("src/app/api/webhooks/resend/route.ts");
  assert.match(route, /verifySvixSignature\(/);
  assert.match(route, /RESEND_WEBHOOK_SECRET/);
  assert.match(route, /webhook_not_configured/);
  assert.match(route, /status: 401/);
  assert.match(route, /recordEmailDelivery\(/);
  // Body mentah (string) untuk verifikasi tanda tangan.
  assert.match(route, /await req\.text\(\)/);
  // GET ketersediaan tanpa membocorkan data.
  assert.match(route, /export function GET\(\)/);

  // Semua jalur balasan 2xx/401/503 — tidak ada kebocoran alamat email ke log.
  assert.doesNotMatch(route, /console\.(log|warn|error)\([^)]*\.to\b/);
});

test("wiring: email sukses mengindeks id Resend ke email_sends", () => {
  const order = read("src/lib/email-order.ts");
  assert.match(order, /id\?: string/);
  assert.match(order, /return \{ ok: true, attempts: attempt, id \}/);

  const status = read("src/lib/email-status.ts");
  assert.match(status, /indexEmailSend\(entry\.result\.id/);

  const events = read("src/lib/email-events.ts");
  assert.match(events, /SENDS_COLLECTION = "email_sends"/);
  assert.match(events, /deliveryStatusFor\(/);

  const env = read(".env.example");
  assert.match(env, /RESEND_WEBHOOK_SECRET=/);
});
