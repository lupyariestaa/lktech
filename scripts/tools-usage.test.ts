import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { TOOLS } from "../src/lib/tools-registry-pure.ts";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  MAX_USAGE_ENTRIES,
  MAX_USAGE_OPENS,
  TOOLS_USAGE_STORAGE_KEY,
  findToolUsage,
  formatRelativeTime,
  getActiveToolSlug,
  parseStoredToolUsage,
  rankFrequentTools,
  recordToolUsage,
  sanitizeToolUsageEntries,
  serializeToolUsage,
  totalToolOpens,
} from "../src/lib/tools-usage-pure.ts";

/**
 * Uji logika pemakaian tool (hanya slug + jumlah + waktu).
 * Jalankan: `npm run test:tools-usage`
 */

const WEBP = "image-to-webp";
const PDF = "image-to-pdf";
const COLOR = "color-picker";
const TEXT = "text-formatter";

const usage = (slug: string, opens: number, lastUsedAt: number) => ({
  slug,
  opens,
  lastUsedAt,
});

test("kunci localStorage memakai versi eksplisit", () => {
  assert.equal(TOOLS_USAGE_STORAGE_KEY, "lktech.tools.usage.v1");
});

test("sanitizeToolUsageEntries: valid, unik, dan urut terbaru", () => {
  const result = sanitizeToolUsageEntries(
    [
      usage(PDF, 2, 1_000),
      usage(WEBP, 5, 3_000),
      usage(COLOR, 1, 2_000),
    ],
    TOOLS,
  );
  assert.deepEqual(
    result.map((entry) => entry.slug),
    [WEBP, COLOR, PDF],
  );
});

test("sanitizeToolUsageEntries: slug hantu & tool segera dibuang", () => {
  const fake = [{ ...TOOLS[0], slug: "soon", status: "segera" }, ...TOOLS];
  const result = sanitizeToolUsageEntries(
    [usage("tidak-ada", 3, 1_000), usage("soon", 3, 1_000), usage(COLOR, 1, 1_000)],
    fake,
  );
  assert.deepEqual(result.map((entry) => entry.slug), [COLOR]);
});

test("sanitizeToolUsageEntries: angka rusak dilewati, opens di-clamp", () => {
  const result = sanitizeToolUsageEntries(
    [
      usage(WEBP, 0, 1_000),
      usage(PDF, -4, 1_000),
      usage(COLOR, Number.NaN, 1_000),
      usage(TEXT, 3, Number.POSITIVE_INFINITY),
      usage("image-to-webp", MAX_USAGE_OPENS + 500, 1_000),
    ],
    TOOLS,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].slug, WEBP);
  assert.equal(result[0].opens, MAX_USAGE_OPENS);
});

test("sanitizeToolUsageEntries: duplikat digabung, timestamp terbaru menang", () => {
  const result = sanitizeToolUsageEntries(
    [usage(WEBP, 2, 1_000), usage(WEBP, 3, 5_000)],
    TOOLS,
  );
  assert.deepEqual(result, [{ slug: WEBP, opens: 5, lastUsedAt: 5_000 }]);
});

test("sanitizeToolUsageEntries: menghormati batas entri", () => {
  const raw = TOOLS.map((tool, index) =>
    usage(tool.slug, 1, 1_000 + index),
  );
  const result = sanitizeToolUsageEntries(raw, TOOLS, 2);
  assert.equal(result.length, 2);
});

test("parseStoredToolUsage: JSON rusak / format salah dianggap kosong", () => {
  assert.deepEqual(parseStoredToolUsage(null, TOOLS), []);
  assert.deepEqual(parseStoredToolUsage("{rusak", TOOLS), []);
  assert.deepEqual(parseStoredToolUsage('{"a":1}', TOOLS), []);
  assert.deepEqual(parseStoredToolUsage('["image-to-webp"]', TOOLS), []);
  assert.deepEqual(
    parseStoredToolUsage(
      serializeToolUsage([{ slug: WEBP, opens: 2, lastUsedAt: 1_000 }]),
      TOOLS,
    ),
    [{ slug: WEBP, opens: 2, lastUsedAt: 1_000 }],
  );
});

test("recordToolUsage: entri baru, increment, dan selalu di depan", () => {
  const first = recordToolUsage([], WEBP, TOOLS, 1_000);
  assert.deepEqual(first, [{ slug: WEBP, opens: 1, lastUsedAt: 1_000 }]);

  const second = recordToolUsage(
    [first[0], usage(PDF, 4, 900)],
    WEBP,
    TOOLS,
    2_000,
  );
  assert.deepEqual(second, [
    { slug: WEBP, opens: 2, lastUsedAt: 2_000 },
    { slug: PDF, opens: 4, lastUsedAt: 900 },
  ]);
});

test("recordToolUsage: slug invalid / belum tersedia diabaikan", () => {
  const existing = [usage(WEBP, 1, 1_000)];
  assert.deepEqual(
    recordToolUsage(existing, "tidak-ada", TOOLS, 2_000),
    existing,
  );

  const fake = [{ ...TOOLS[0], slug: "soon", status: "segera" }, ...TOOLS];
  assert.deepEqual(recordToolUsage(existing, "soon", fake, 2_000), existing);
});

test("recordToolUsage: opens di-clamp dan daftar dibatasi", () => {
  const maxed = recordToolUsage(
    [usage(WEBP, MAX_USAGE_OPENS, 1_000)],
    WEBP,
    TOOLS,
    2_000,
  );
  assert.equal(maxed[0].opens, MAX_USAGE_OPENS);

  const fakeTools = Array.from(
    { length: MAX_USAGE_ENTRIES + 5 },
    (_, index) => ({ ...TOOLS[0], slug: `tool-${index}` }),
  );
  const many = fakeTools.slice(0, MAX_USAGE_ENTRIES).map((tool, index) =>
    usage(tool.slug, 1, index + 1),
  );
  const next = recordToolUsage(many, "tool-0", fakeTools, 99_000);
  assert.equal(next.length, MAX_USAGE_ENTRIES);
  assert.equal(next[0].slug, "tool-0");
});

test("rankFrequentTools: opens desc, lalu waktu, lalu urutan registry", () => {
  const ranked = rankFrequentTools(
    [
      usage(COLOR, 2, 9_000),
      usage(WEBP, 5, 1_000),
      usage(PDF, 5, 8_000),
      usage(TEXT, 1, 9_000),
    ],
    TOOLS,
  );
  assert.deepEqual(
    ranked.map((item) => item.tool.slug),
    [PDF, WEBP, COLOR],
  );
  assert.deepEqual(
    ranked.map((item) => item.opens),
    [5, 5, 2],
  );
});

test("rankFrequentTools: limit & slug invalid", () => {
  assert.equal(
    rankFrequentTools([usage(WEBP, 2, 1_000), usage(PDF, 1, 1_000)], TOOLS, 1)
      .length,
    1,
  );
  assert.deepEqual(rankFrequentTools([usage("hantu", 9, 1_000)], TOOLS), []);
});

test("totalToolOpens: menjumlahkan seluruh entri", () => {
  assert.equal(totalToolOpens([]), 0);
  assert.equal(
    totalToolOpens([usage(WEBP, 4, 1_000), usage(PDF, 7, 1_000)]),
    11,
  );
});

test("findToolUsage: mencari slug tanpa peduli kapitalisasi", () => {
  const entries = [usage(WEBP, 2, 1_000)];
  assert.equal(findToolUsage(entries, "IMAGE-TO-WEBP")?.opens, 2);
  assert.equal(findToolUsage(entries, PDF), null);
});

test("formatRelativeTime: menit, jam, hari, dan tanggal", () => {
  const now = new Date(2026, 10, 15, 12, 0, 0).getTime();
  assert.equal(formatRelativeTime(now - 20_000, now), "baru saja");
  assert.equal(formatRelativeTime(now - 5 * 60_000, now), "5 menit lalu");
  assert.equal(formatRelativeTime(now - 3 * 3_600_000, now), "3 jam lalu");
  assert.equal(formatRelativeTime(now - 2 * 86_400_000, now), "2 hari lalu");
  assert.equal(
    formatRelativeTime(new Date(2026, 10, 1, 9, 0, 0).getTime(), now),
    "1 Nov 2026",
  );
  assert.equal(formatRelativeTime(0, now), "");
  assert.equal(formatRelativeTime(Number.NaN, now), "");
});

test("getActiveToolSlug: hanya workspace satu segmen", () => {
  assert.equal(getActiveToolSlug(`/tools/${WEBP}`, TOOLS), WEBP);
  assert.equal(getActiveToolSlug(`/tools/${WEBP}/`, TOOLS), WEBP);
  assert.equal(getActiveToolSlug(`/tools/${WEBP}?q=x`, TOOLS), WEBP);
  assert.equal(getActiveToolSlug("/tools/ruang", TOOLS), null);
  assert.equal(getActiveToolSlug("/tools/panduan", TOOLS), null);
  assert.equal(getActiveToolSlug("/tools/panduan/color-picker", TOOLS), null);
  assert.equal(getActiveToolSlug("/tools", TOOLS), null);
  assert.equal(getActiveToolSlug("/tools/tidak-ada", TOOLS), null);
  assert.equal(getActiveToolSlug(null, TOOLS), null);
});
