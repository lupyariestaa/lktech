import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  clamp,
  clampAlpha,
  contrastTextColor,
  formatHsl,
  formatRgb,
  hslToRgb,
  parseHex,
  parseHsl,
  relativeLuminance,
  rgbToHex,
  rgbToHsl,
  rgbaToHex,
  roundAlpha,
} from "../src/lib/tools/color-pure.ts";

/**
 * Uji logika murni Color Picker (F2a).
 * Jalankan: `npm run test:tools-color`
 */

test("parseHex: 3/4/6/8 digit, dengan & tanpa #", () => {
  assert.deepEqual(parseHex("#fff"), { rgb: { r: 255, g: 255, b: 255 }, alpha: 1 });
  assert.deepEqual(parseHex("ffffff"), { rgb: { r: 255, g: 255, b: 255 }, alpha: 1 });
  assert.deepEqual(parseHex("#FF0000"), { rgb: { r: 255, g: 0, b: 0 }, alpha: 1 });
  assert.deepEqual(parseHex("  #0a0A0a  "), {
    rgb: { r: 10, g: 10, b: 10 },
    alpha: 1,
  });
  const half = parseHex("#ff000080");
  assert.ok(half);
  assert.equal(half.rgb.r, 255);
  assert.ok(Math.abs(half.alpha - 0.5) < 0.01);
});

test("parseHex: menolak input tak valid", () => {
  for (const bad of ["", "  ", "#12", "ggg", "#12345", "#1234567", "rgb(1,2,3)"]) {
    assert.equal(parseHex(bad), null, bad);
  }
});

test("rgbToHex: membulatkan & meng-clamp byte", () => {
  assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), "#000000");
  assert.equal(rgbToHex({ r: 255.4, g: 127.6, b: -10 }), "#FF8000");
});

test("rgbaToHex: menambah alfa hanya bila < 1", () => {
  assert.equal(rgbaToHex({ r: 255, g: 0, b: 0 }, 1), "#FF0000");
  assert.equal(rgbaToHex({ r: 255, g: 0, b: 0 }, 0.5), "#FF000080");
});

test("rgb↔hsl: warna utama bolak-balik tetap", () => {
  const cases: Array<{ rgb: { r: number; g: number; b: number }; hsl: { h: number; s: number; l: number } }> = [
    { rgb: { r: 255, g: 0, b: 0 }, hsl: { h: 0, s: 100, l: 50 } },
    { rgb: { r: 0, g: 255, b: 0 }, hsl: { h: 120, s: 100, l: 50 } },
    { rgb: { r: 0, g: 0, b: 255 }, hsl: { h: 240, s: 100, l: 50 } },
    { rgb: { r: 255, g: 255, b: 255 }, hsl: { h: 0, s: 0, l: 100 } },
    { rgb: { r: 0, g: 0, b: 0 }, hsl: { h: 0, s: 0, l: 0 } },
    { rgb: { r: 128, g: 128, b: 128 }, hsl: { h: 0, s: 0, l: 50 } },
  ];
  for (const c of cases) {
    assert.deepEqual(rgbToHsl(c.rgb), c.hsl, JSON.stringify(c.rgb));
    assert.deepEqual(hslToRgb(c.hsl), c.rgb, JSON.stringify(c.hsl));
  }
});

test("hslToRgb: meng-clamp rentang liar", () => {
  assert.deepEqual(hslToRgb({ h: 720, s: 150, l: 200 }), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hslToRgb({ h: -120, s: -10, l: -5 }), { r: 0, g: 0, b: 0 });
});

test("parseHsl: format umum", () => {
  assert.deepEqual(parseHsl("hsl(120, 100%, 50%)"), { h: 120, s: 100, l: 50 });
  assert.deepEqual(parseHsl("hsla(240 100% 50% / 0.5)"), { h: 240, s: 100, l: 50 });
  assert.deepEqual(parseHsl("300, 50, 20"), { h: 300, s: 50, l: 20 });
  assert.equal(parseHsl("hsl(abc)"), null);
  assert.equal(parseHsl(""), null);
});

test("formatRgb/formatHsl: alfa membulat & bentuk tepat", () => {
  assert.equal(formatRgb({ r: 10, g: 20, b: 30 }), "rgb(10, 20, 30)");
  assert.equal(formatRgb({ r: 10, g: 20, b: 30 }, 0.5), "rgba(10, 20, 30, 0.5)");
  assert.equal(formatRgb({ r: 10, g: 20, b: 30 }, 1.6), "rgb(10, 20, 30)");
  assert.equal(formatHsl({ h: 120, s: 100, l: 50 }), "hsl(120, 100%, 50%)");
  assert.equal(formatHsl({ h: 120, s: 100, l: 50 }, 0.25), "hsla(120, 100%, 50%, 0.25)");
});

test("roundAlpha: 2 desimal & aman", () => {
  assert.equal(roundAlpha(0.3333), 0.33);
  assert.equal(roundAlpha(2), 1);
  assert.equal(roundAlpha(Number.NaN), 1);
});

test("clamp/clampAlpha: menangani non-finite", () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(Number.NaN, 2, 9), 2);
  assert.equal(clampAlpha(Number.POSITIVE_INFINITY), 1);
});

test("kontras: putih di latar gelap, hitam di latar terang", () => {
  assert.equal(contrastTextColor({ r: 0, g: 0, b: 0 }), "#FFFFFF");
  assert.equal(contrastTextColor({ r: 255, g: 255, b: 255 }), "#000000");
  assert.equal(contrastTextColor({ r: 17, g: 24, b: 39 }), "#FFFFFF");
  assert.ok(relativeLuminance({ r: 255, g: 255, b: 255 }) > relativeLuminance({ r: 0, g: 0, b: 0 }));
});
