import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { resolveTechnologyColor, resolveTechnologyLogo, technologyInitialsColor } from "../src/lib/technology-logo-pure.ts";

test("technology logos accept only safe local files in /tech", () => {
  assert.equal(resolveTechnologyLogo("/tech/react.svg"), "/tech/react.svg");
  assert.equal(resolveTechnologyLogo(" /tech/logo-1.webp "), "/tech/logo-1.webp");
  assert.equal(resolveTechnologyLogo("https://example.com/logo.svg"), null);
  assert.equal(resolveTechnologyLogo("//example.com/logo.svg"), null);
  assert.equal(resolveTechnologyLogo("/tech/../secret.svg"), null);
  assert.equal(resolveTechnologyLogo("/tech/logo.svg?x=1"), null);
  assert.equal(resolveTechnologyLogo("/other/logo.svg"), null);
  assert.equal(resolveTechnologyLogo(null), null);
});

test("technology initials choose a contrasting foreground for light and dark brands", () => {
  assert.equal(technologyInitialsColor("#F7DF1E"), "#0A0F1E");
  assert.equal(technologyInitialsColor("#61DAFB"), "#0A0F1E");
  assert.equal(technologyInitialsColor("#0A0F1E"), "#FFFFFF");
  assert.equal(technologyInitialsColor("#FFF"), "#0A0F1E");
  assert.equal(technologyInitialsColor("invalid"), "#0A0F1E");
});

test("technology brand colors accept only short or full hex colors", () => {
  assert.equal(resolveTechnologyColor("#abc"), "#abc");
  assert.equal(resolveTechnologyColor("#61DAFB"), "#61DAFB");
  assert.equal(resolveTechnologyColor("red"), "#64748B");
  assert.equal(resolveTechnologyColor("url(javascript:alert(1))"), "#64748B");
  assert.equal(resolveTechnologyColor(null), "#64748B");
});
