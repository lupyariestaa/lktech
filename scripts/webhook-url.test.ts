import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWebhookUrl,
  extractWebhookUrlToken,
  normalizeTokenValue,
  redactWebhookUrl,
  webhookTokensMatch,
} from "../src/lib/webhook-url-pure.ts";

test("normalizeTokenValue: trims, strips wrapping quotes, decodes once", () => {
  assert.equal(normalizeTokenValue("  abc123  "), "abc123");
  assert.equal(normalizeTokenValue('"abc123"'), "abc123");
  assert.equal(normalizeTokenValue("'abc123'"), "abc123");
  assert.equal(normalizeTokenValue("a%2Fb%3D"), "a/b=");
  assert.equal(normalizeTokenValue(undefined), "");
});

test("extractWebhookUrlToken: reads query token, null when absent/invalid", () => {
  assert.equal(
    extractWebhookUrlToken(
      "https://lktech.vercel.app/api/webhooks/mayar?token=jhiDhU23S39RMEhQAkjx76hYu9/wRGM5hhYrty/UgRQ=",
    ),
    "jhiDhU23S39RMEhQAkjx76hYu9/wRGM5hhYrty/UgRQ=",
  );
  assert.equal(extractWebhookUrlToken("https://example.com/hook"), null);
  assert.equal(extractWebhookUrlToken(""), null);
  assert.equal(extractWebhookUrlToken("not a url"), null);
});

test("webhookTokensMatch: exact match only, tolerant of quoting/encoding", () => {
  const token = "jhiDhU23S39RMEhQAkjx76hYu9/wRGM5hhYrty/UgRQ=";
  assert.equal(webhookTokensMatch(token, token), true);
  assert.equal(webhookTokensMatch(token, `"${token}"`), true);
  assert.equal(webhookTokensMatch(token, ` ${token} `), true);
  assert.equal(webhookTokensMatch("old-token", token), false);
  assert.equal(webhookTokensMatch(null, token), false);
  assert.equal(webhookTokensMatch(token, undefined), false);
  assert.equal(webhookTokensMatch("", ""), false);
});

test("buildWebhookUrl: absolute URL with encoded token and single slash", () => {
  const url = buildWebhookUrl("https://lktech.vercel.app/", "a/b+c=");
  assert.equal(
    url,
    "https://lktech.vercel.app/api/webhooks/mayar?token=a%2Fb%2Bc%3D",
  );
  // Token harus dapat dibaca kembali persis.
  assert.equal(extractWebhookUrlToken(url), "a/b+c=");
});

test("redactWebhookUrl: hides token but keeps the rest", () => {
  const redacted = redactWebhookUrl(
    "https://lktech.vercel.app/api/webhooks/mayar?token=secret&x=1",
  );
  assert.equal(
    redacted,
    "https://lktech.vercel.app/api/webhooks/mayar?token=***&x=1",
  );
  assert.ok(!redacted.includes("secret"));
});