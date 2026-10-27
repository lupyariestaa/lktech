import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative } from "node:path";

/**
 * ADM-26 — MATRIX OTORISASI ROUTE ADMIN (uji statis, murah & cepat).
 *
 * Audit menemukan regresi keamanan paling berbahaya (route admin tanpa guard,
 * aksi sensitif tanpa re-auth) tidak akan tertangkap CI. Uji ini menutup celah
 * itu dengan **sweep menyeluruh** (bukan beberapa route tertentu):
 *
 *  1. Enumerasi SEMUA `src/app/api/admin/**\/route.ts`.
 *  2. Setiap handler HTTP (GET/POST/PUT/PATCH/DELETE) WAJIB memanggil guard
 *     otorisasi (`requireAdmin`/`requireOwner`/`requireFreshAdmin`/
 *     `requireFreshOwner`). Route admin baru tanpa guard → tes GAGAL.
 *  3. Matrix route → role: rute OWNER-only memakai guard OWNER, dan aksi
 *     sensitif memakai re-auth (fresh).
 *
 * Uji WIRING (membaca source) — BUKAN pengganti E2E ber-kredensial. Uji riil
 * RBAC/revoke sesi sudah ada di `test:admin-security`; jangan diduplikasi.
 * Jalankan: `npm run test:admin-authz`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const adminApiDir = resolve(repoRoot, "src", "app", "api", "admin");

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

/** Pemanggilan guard otorisasi admin yang sah. */
const GUARD_CALL = /\brequire(?:Admin|Owner|FreshAdmin|FreshOwner)\s*\(/;
/** Pemanggilan guard autentikasi-kuat-baru (re-auth). */
const FRESH_GUARD_CALL =
  /\brequire(?:FreshAdmin|FreshOwner)\s*\(|\bassertFreshAuth\s*\(/;

/** Kumpulkan semua berkas `route.ts` di bawah folder admin (rekursif). */
function walkRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkRoutes(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function rel(full: string): string {
  return relative(repoRoot, full).split("\\").join("/");
}

type Handler = { name: HttpMethod; body: string };

/** Pisahkan sumber per handler berdasarkan posisi `export async function`. */
function handlers(src: string): Handler[] {
  const parts = [
    ...src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\s*\(/g),
  ];
  return parts.map((m, i) => ({
    name: m[1] as HttpMethod,
    body: src.slice(
      m.index,
      i + 1 < parts.length ? parts[i + 1].index : src.length,
    ),
  }));
}

function readHandlers(relPath: string): Map<HttpMethod, string> {
  const byMethod = new Map<HttpMethod, string>();
  for (const h of handlers(readFileSync(resolve(repoRoot, relPath), "utf8"))) {
    byMethod.set(h.name, h.body);
  }
  return byMethod;
}

const routes = walkRoutes(adminApiDir).map(rel).sort();

/* ------------------------------ Sweep menyeluruh ------------------------------ */

test("ADM-26: enumerasi route admin tidak kosong/diam-diam kosong", () => {
  assert.ok(
    routes.length >= 40,
    `hanya menemukan ${routes.length} route admin — enumerasi rusak?`,
  );
  for (const known of [
    "src/app/api/admin/backup/route.ts",
    "src/app/api/admin/orders/route.ts",
    "src/app/api/admin/admins/route.ts",
  ]) {
    assert.ok(routes.includes(known), `route wajib tidak ditemukan: ${known}`);
  }
});

/**
 * Exception yang DIDOKUMENTASIKAN: logout harus tetap berfungsi walau token
 * sudah kedaluwarsa. `DELETE /api/admin/session` memverifikasi identitas lewat
 * Bearer token ATAU session cookie (`resolveLogoutIdentity`) lalu HANYA mencabut
 * sesi milik identitas itu sendiri — tidak ada data admin yang diungkap.
 */
const UNGUARDED_ALLOWLIST = new Set<string>([
  "src/app/api/admin/session/route.ts DELETE",
]);

for (const file of routes) {
  test(`ADM-26: setiap handler ${file} memanggil guard otorisasi`, () => {
    const src = readFileSync(resolve(repoRoot, file), "utf8");
    assert.match(
      src,
      /from "@\/lib\/admin-guard"/,
      `${file} harus mengimpor guard dari @/lib/admin-guard`,
    );
    const hs = handlers(src);
    assert.ok(hs.length > 0, `${file} tidak mengekspor handler HTTP`);
    for (const h of hs) {
      const key = `${file} ${h.name}`;
      if (UNGUARDED_ALLOWLIST.has(key)) continue;
      assert.match(
        h.body,
        GUARD_CALL,
        `${key} TIDAK memanggil requireAdmin/requireOwner (celah otorisasi!)`,
      );
    }
  });
}

test("ADM-26: allowlist exception tidak usang", () => {
  for (const key of UNGUARDED_ALLOWLIST) {
    const file = key.split(" ")[0]!;
    assert.ok(routes.includes(file), `allowlist menunjuk route yang tidak ada: ${key}`);
  }
});

/* --------------------------- Matrix route → role ---------------------------- */

/**
 * Rute OWNER-only: guard WAJIB `requireOwner`/`requireFreshOwner` dan TIDAK
 * boleh turun ke guard admin biasa (`requireAdmin`/`requireFreshAdmin`).
 */
const OWNER_ONLY: Record<string, Partial<Record<HttpMethod, RegExp>>> = {
  "src/app/api/admin/backup/route.ts": {
    GET: /\brequireFreshOwner\s*\(/,
    POST: /\brequireFreshOwner\s*\(/,
  },
  "src/app/api/admin/backup/snapshots/route.ts": {
    GET: /\brequireOwner\s*\(/,
    POST: /\brequireFreshOwner\s*\(/,
  },
  "src/app/api/admin/backup/snapshots/[jobId]/route.ts": {
    GET: /\brequireOwner\s*\(/,
    POST: /\brequireOwner\s*\(/,
  },
  "src/app/api/admin/admins/route.ts": {
    POST: /\brequireFreshOwner\s*\(/,
    DELETE: /\brequireFreshOwner\s*\(/,
  },
};

for (const [file, expected] of Object.entries(OWNER_ONLY)) {
  test(`ADM-26: ${file} memakai guard OWNER yang benar`, () => {
    assert.ok(routes.includes(file), `route OWNER tidak ditemukan: ${file}`);
    const byMethod = readHandlers(file);
    for (const method of HTTP_METHODS) {
      const re = expected[method];
      if (!re) continue;
      const body = byMethod.get(method);
      assert.ok(body, `${file} tidak mengekspor handler ${method}`);
      assert.match(body, re, `${file} ${method} harus memakai guard OWNER`);
      assert.doesNotMatch(
        body,
        /\brequireAdmin\s*\(/,
        `${file} ${method} TIDAK boleh memakai requireAdmin (downgrade role!)`,
      );
      assert.doesNotMatch(
        body,
        /\brequireFreshAdmin\s*\(/,
        `${file} ${method} TIDAK boleh memakai requireFreshAdmin (downgrade role!)`,
      );
    }
  });
}

/**
 * Aksi sensitif yang WAJIB memakai autentikasi kuat yang masih baru (re-auth):
 * ekspor/impor PII, mulai restore, hapus massal, kirim broadcast, kelola admin.
 */
const FRESH_AUTH: Array<{ file: string; method: HttpMethod; note: string }> = [
  { file: "src/app/api/admin/broadcast/route.ts", method: "POST", note: "kirim broadcast" },
  { file: "src/app/api/admin/orders/route.ts", method: "POST", note: "aksi massal" },
  { file: "src/app/api/admin/orders/route.ts", method: "DELETE", note: "hapus massal" },
  { file: "src/app/api/admin/backup/route.ts", method: "GET", note: "ekspor PII" },
  { file: "src/app/api/admin/backup/route.ts", method: "POST", note: "impor" },
  { file: "src/app/api/admin/backup/snapshots/route.ts", method: "POST", note: "mulai restore" },
  { file: "src/app/api/admin/admins/route.ts", method: "POST", note: "tambah admin" },
  { file: "src/app/api/admin/admins/route.ts", method: "DELETE", note: "hapus admin" },
];

for (const { file, method, note } of FRESH_AUTH) {
  test(`ADM-26: re-auth ${method} ${file} (${note})`, () => {
    assert.ok(routes.includes(file), `route tidak ditemukan: ${file}`);
    const body = readHandlers(file).get(method);
    assert.ok(body, `${file} tidak mengekspor handler ${method}`);
    assert.match(
      body,
      FRESH_GUARD_CALL,
      `${file} ${method} (${note}) WAJIB memakai guard re-auth`,
    );
  });
}

/* ------------------------- Guard helper tersedia ---------------------------- */

test("ADM-26: admin-guard mengekspor fungsi yang diasumsikan matrix", () => {
  const guard = readFileSync(resolve(repoRoot, "src/lib/admin-guard.ts"), "utf8");
  for (const fn of [
    "requireAdmin",
    "requireOwner",
    "requireFreshAdmin",
    "requireFreshOwner",
    "assertFreshAuth",
  ]) {
    assert.match(
      guard,
      new RegExp(`export (async )?function ${fn}\\b`),
      `guard ${fn} tidak lagi diekspor — matrix ADM-26 perlu diperbarui`,
    );
  }
});
