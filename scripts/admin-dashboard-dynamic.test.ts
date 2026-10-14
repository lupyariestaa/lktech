import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Guard regresi — kenapa `/admin` WAJIB `force-dynamic`.
 *
 * Tanpa `export const dynamic = "force-dynamic"`, Next.js mencoba MENSTATISKAN
 * `/admin` saat build → menjalankan komponen server (mis. `BusinessHealth`) yang
 * membaca Firestore di waktu build. Bila Firestore gagal (kuota habis/jaringan),
 * build **jatuh** dan deploy gagal. Lihat
 * `docs/2026-10-14-perbaikan-build-admin-prerender.md`.
 *
 * Test ini murah & statis (tanpa build) agar regresi tak lolos ke produksi.
 * Jalankan: `npm run test:admin-dynamic`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

test("layout dashboard admin mengekspor dynamic = force-dynamic", () => {
  const src = read("src/app/admin/(dashboard)/layout.tsx");
  assert.match(
    src,
    /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/,
    "layout dashboard admin harus mengekspor dynamic = \"force-dynamic\"",
  );
});

test("getSalesAnalytics membungkus query orders dengan try/catch (fail-safe)", () => {
  const src = read("src/lib/sales-analytics.ts");
  // Pembacaan `orders` di jalur LIVE harus berada dalam blok try (agar kegagalan
  // Firestore mengembalikan struktur kosong, bukan melempar & menjatuhkan build).
  assert.match(
    src,
    /try\s*\{[\s\S]*?collection\(\s*["']orders["']\s*\)[\s\S]*?\.get\(\)/,
    "query orders di getSalesAnalytics harus dibungkus try/catch (fail-safe)",
  );
  assert.match(
    src,
    /buildEmptyAnalytics\s*\(/,
    "harus ada fallback buildEmptyAnalytics() saat pembacaan gagal",
  );
});
