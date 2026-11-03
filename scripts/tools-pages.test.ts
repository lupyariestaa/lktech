import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Uji wiring pemisahan Landing (`/tools`) vs Ruang (`/tools/ruang`) (F5).
 * Jalankan: `npm run test:tools-pages`
 *
 * Membaca berkas sebagai teks (tanpa impor TS) agar tak terpengaruh alias `@/`.
 * Tujuan: mencegah regresi — landing harus tetap publik, ruang & workspace
 * harus tetap login-gated, dan robot/sitemap harus mencerminkan aturan itu.
 */

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, rel), "utf8");

const landing = read("../src/app/tools/page.tsx");
const space = read("../src/app/tools/ruang/page.tsx");
const workspace = read("../src/app/tools/[slug]/page.tsx");
const robots = read("../src/app/robots.ts");
const sitemap = read("../src/app/sitemap.ts");
const toolShell = read("../src/components/tools/tool-shell.tsx");
const accountOverview = read("../src/components/auth/account-overview.tsx");

test("landing /tools publik: tanpa UserGuard & boleh diindeks", () => {
  assert.doesNotMatch(landing, /UserGuard/);
  assert.doesNotMatch(landing, /index:\s*false/);
  assert.match(landing, /canonical:\s*"\/tools"/);
  assert.match(landing, /ToolCard/);
  assert.match(landing, /TOOLS/);
});

test("ruang /tools/ruang login-gated & noindex", () => {
  assert.match(space, /UserGuard/);
  assert.match(space, /index:\s*false/);
  assert.match(space, /ToolsCatalog/);
});

test("workspace /tools/[slug] login-gated & noindex", () => {
  assert.match(workspace, /UserGuard/);
  assert.match(workspace, /index:\s*false/);
});

test("robots: sub-path /tools/ diblokir, landing /tools diizinkan", () => {
  assert.match(robots, /"\/tools\/"/);
  // Tidak boleh ada entri persis "/tools" (tanpa garis miring) yang ikut memblokir landing.
  assert.doesNotMatch(robots, /"\/tools"(?!\/)/);
});

test("sitemap memuat landing /tools", () => {
  assert.match(sitemap, /`\$\{SITE\.url\}\/tools`/);
});

test("navigasi internal mengarah ke ruang, bukan landing", () => {
  assert.match(toolShell, /href="\/tools\/ruang"/);
  assert.match(accountOverview, /href="\/tools\/ruang"/);
});