import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

/**
 * Guard regresi — wiring CACHE (`unstable_cache` + `revalidateTag`).
 *
 * Kenapa penting (dua kelas bug yang mahal):
 *
 * 1. **Kuota Firestore.** Pembaca publik yang dipanggil di SETIAP halaman
 *    (settings, konten, artikel, produk, proyek, promo) harus dibungkus
 *    `unstable_cache`, agar build/runtime tidak memindai Firestore berulang
 *    (penyebab `8 RESOURCE_EXHAUSTED` saat build — lihat
 *    `docs/2026-10-14-perbaikan-build-admin-prerender.md`).
 *
 * 2. **Data basi.** `revalidatePath` TIDAK membatalkan entri `unstable_cache`;
 *    setiap route mutasi admin WAJIB memanggil `revalidateTag` untuk tag terkait,
 *    jika tidak perubahan tidak muncul di halaman lain.
 *
 * Catatan Next 16: `revalidateTag(tag)` satu-argumen sudah DEPRECATED → wajib
 * dua argumen (`"max"` atau `{ expire: 0 }`). Test ini menjaga keduanya.
 *
 * Murah & statis (tanpa build). Jalankan: `npm run test:cache-wiring`.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

/** Kumpulan file `.ts`/`.tsx` di bawah `src` (rekursif). */
function listSrcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSrcFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Buang komentar agar pola di dalam dokumentasi tidak salah tertangkap
 * (mis. contoh `revalidateTag(tag)` pada komentar). `[^:]` melindungi `https://`.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

test("pembaca publik dibungkus unstable_cache dengan tag yang tepat", () => {
  const cases: Array<[string, string]> = [
    ["src/lib/settings.ts", "CACHE_TAGS.settings"],
    ["src/lib/site-content.ts", "CACHE_TAGS.content"],
    ["src/lib/articles.ts", "CACHE_TAGS.articles"],
    ["src/lib/products.ts", "CACHE_TAGS.products"],
    ["src/lib/projects.ts", "CACHE_TAGS.projects"],
    ["src/lib/promos.ts", "CACHE_TAGS.promos"],
  ];

  for (const [file, tag] of cases) {
    const src = read(file);
    assert.match(
      src,
      /unstable_cache\s*\(/,
      `${file}: pembaca publik harus memakai unstable_cache(...)`,
    );
    assert.ok(
      src.includes(tag),
      `${file}: harus memakai tag ${tag} agar bisa di-invalidasi`,
    );
  }
});

test("route mutasi admin memanggil revalidateTag untuk tag terkait", () => {
  const cases: Array<[string, string]> = [
    ["src/app/api/admin/settings/route.ts", "CACHE_TAGS.settings"],
    ["src/app/api/admin/content/route.ts", "CACHE_TAGS.content"],
    ["src/app/api/admin/articles/route.ts", "CACHE_TAGS.articles"],
    ["src/app/api/admin/articles/bulk/route.ts", "CACHE_TAGS.articles"],
    ["src/app/api/admin/products/route.ts", "CACHE_TAGS.products"],
    ["src/app/api/admin/projects/route.ts", "CACHE_TAGS.projects"],
    ["src/app/api/admin/coupons/route.ts", "CACHE_TAGS.promos"],
    ["src/app/api/admin/reviews/route.ts", "CACHE_TAGS.products"],
  ];

  for (const [file, tag] of cases) {
    const src = read(file);
    assert.match(
      src,
      /revalidateTag\s*\(/,
      `${file}: mutasi harus memanggil revalidateTag (revalidatePath saja tidak cukup)`,
    );
    assert.ok(
      src.includes(tag),
      `${file}: harus meng-invalidasi ${tag}`,
    );
  }
});

test("revalidateTag selalu dipanggil dengan DUA argumen (Next 16)", () => {
  // Satu argumen `revalidateTag(tag)` sudah deprecated di Next 16.
  const offenders: string[] = [];
  for (const file of listSrcFiles(resolve(repoRoot, "src"))) {
    const src = stripComments(readFileSync(file, "utf8"));
    const matches = src.matchAll(/revalidateTag\s*\(([^)]*)\)/g);
    for (const m of matches) {
      const args = m[1];
      // Dua argumen → ada koma pemisah di luar ekspresi tunggal.
      if (!args.includes(",")) {
        offenders.push(`${file.replace(repoRoot, "")}: revalidateTag(${args.trim()})`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `revalidateTag satu-argumen (deprecated) ditemukan:\n${offenders.join("\n")}`,
  );
});

test("cache-tags mendefinisikan semua tag + REVALIDATE_NOW { expire: 0 }", () => {
  const src = read("src/lib/cache-tags.ts");
  for (const key of [
    "settings",
    "content",
    "articles",
    "products",
    "projects",
    "promos",
  ]) {
    assert.match(
      src,
      new RegExp(`${key}:\\s*"[^"]+"`),
      `cache-tags harus mendefinisikan tag "${key}"`,
    );
  }
  assert.match(
    src,
    /REVALIDATE_NOW\s*=\s*\{\s*expire:\s*0\s*\}/,
    "REVALIDATE_NOW harus { expire: 0 } (invalidasi langsung dari Route Handler)",
  );
});
