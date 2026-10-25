import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types test runner requires the explicit extension.
import { isWebhookTokenRequired, webhookTokenConfiguration } from "../src/lib/webhook-security-pure.ts";

test("webhook secret wajib di production", () => {
  assert.equal(isWebhookTokenRequired("production"), true);
  assert.equal(webhookTokenConfiguration("production", undefined).secure, false);
  assert.equal(webhookTokenConfiguration("production", "   ").secure, false);
  assert.deepEqual(webhookTokenConfiguration("production", "configured"), {
    required: true,
    configured: true,
    secure: true,
  });
});

test("non-production boleh berjalan tanpa secret, tetapi menandai konfigurasi sebagai tidak secure di production", () => {
  assert.deepEqual(webhookTokenConfiguration("development", undefined), {
    required: false,
    configured: false,
    secure: true,
  });
});
