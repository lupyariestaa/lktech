import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNavMenu, isActiveHref } from "../src/lib/nav.ts";

/**
 * Uji logika navigasi (murni). Jalankan: `npm run test:nav-menu`
 *
 * Penjaga agar menu bertingkat tetap konsisten: setiap `children` minimal 2
 * item, href unik per level, dan deteksi rute aktif benar.
 */

const SERVICES = [
  { slug: "pembuatan-website", title: "Pembuatan Website", tagline: "Cepat & siap konversi." },
  { slug: "aplikasi-mobile", title: "Aplikasi Mobile", tagline: "Android & iOS mulus." },
];

test("menu selalu memuat Beranda + item inti", () => {
  const menu = buildNavMenu(false, SERVICES);
  const labels = menu.map((i) => i.label);
  assert.ok(labels.includes("Beranda"));
  assert.ok(labels.includes("Layanan"));
  assert.ok(labels.includes("Tentang"));
});

test("Beranda memakai anchor hanya di landing", () => {
  assert.equal(buildNavMenu(true, SERVICES)[0].href, "/#beranda");
  assert.equal(buildNavMenu(false, SERVICES)[0].href, "/");
});

test("sub-menu Layanan mengikuti daftar SERVICES + tautan 'Semua'", () => {
  const layanan = buildNavMenu(false, SERVICES).find((i) => i.label === "Layanan");
  assert.ok(layanan?.children, "Layanan harus punya children");
  assert.equal(layanan.children.length, SERVICES.length + 1);
  // Tautan ke halaman induk lebih dulu, lalu tiap layanan.
  assert.equal(layanan.children[0].href, "/layanan");
  assert.equal(layanan.children[0].label, "Semua Layanan");
  assert.equal(layanan.children[1].href, "/layanan/pembuatan-website");
  assert.equal(layanan.children.at(-1)?.href, "/layanan/aplikasi-mobile");
});

test("label anak unik (tanpa 'Semua' ganda di mobile)", () => {
  for (const item of buildNavMenu(true, SERVICES)) {
    if (!item.children) continue;
    const labels = item.children.map((c) => c.label);
    assert.equal(new Set(labels).size, labels.length, `${item.label} label duplikat`);
  }
});

test("setiap children punya >=2 item & href unik", () => {
  for (const item of buildNavMenu(true, SERVICES)) {
    if (!item.children) continue;
    assert.ok(item.children.length >= 2, `${item.label} butuh >=2 anak`);
    const hrefs = item.children.map((c) => c.href);
    assert.equal(new Set(hrefs).size, hrefs.length, `${item.label} href duplikat`);
  }
});

test("isActiveHref: rute & sub-rute", () => {
  assert.equal(isActiveHref("/layanan/pembuatan-website", "/layanan"), true);
  assert.equal(isActiveHref("/layanan", "/layanan"), true);
  assert.equal(isActiveHref("/produk", "/layanan"), false);
  assert.equal(isActiveHref("/", "/"), true);
  assert.equal(isActiveHref("/tentang", "/"), false);
  assert.equal(isActiveHref("/harga", "/harga"), true);
  assert.equal(isActiveHref("/", "/#harga"), true);
});