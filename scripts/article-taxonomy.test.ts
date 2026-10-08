import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveLabelFromSlug,
  taxonomySlug,
} from "../src/lib/article-types.ts";

test("taxonomySlug: label → slug URL aman", () => {
  assert.equal(taxonomySlug("Tips & Trik"), "tips-trik");
  assert.equal(taxonomySlug("Jasa Website"), "jasa-website");
});

test("taxonomySlug: aksen dibuang & spasi ganda jadi satu tanda hubung", () => {
  assert.equal(taxonomySlug("Café  Digital"), "cafe-digital");
});

test("resolveLabelFromSlug: slug dipetakan ke label asli", () => {
  const labels = ["Tips & Trik", "Bisnis Digital"];
  assert.equal(resolveLabelFromSlug("tips-trik", labels), "Tips & Trik");
  assert.equal(resolveLabelFromSlug("BISNIS-DIGITAL", labels), "Bisnis Digital");
});

test("resolveLabelFromSlug: slug tak dikenal → null", () => {
  assert.equal(resolveLabelFromSlug("tidak-ada", ["Tips & Trik"]), null);
});
