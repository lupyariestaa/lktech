/**
 * Salin aset runtime pdf.js ke `public/pdfjs/` agar di-self-host (CSP
 * `worker-src 'self'`). Dijalankan otomatis lewat `predev`/`prebuild`.
 *
 * Mengapa disalin, bukan di-bundle: worker pdf.js (~1,2 MB) dan berkas
 * cmap/font/wasm hanya perlu saat tool PDF ke Gambar dibuka; menyimpannya
 * sebagai aset statis menghindari membengkakkan chunk JS.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist");
const dest = join(root, "public", "pdfjs");

if (!existsSync(src)) {
  console.warn("[pdfjs-assets] pdfjs-dist tidak ditemukan; lewati penyalinan.");
  process.exit(0);
}

const dirs = ["cmaps", "standard_fonts", "wasm", "iccs"];
mkdirSync(dest, { recursive: true });

for (const dir of dirs) {
  const from = join(src, dir);
  if (!existsSync(from)) {
    console.warn(`[pdfjs-assets] lewati ${dir} (tidak ada).`);
    continue;
  }
  cpSync(from, join(dest, dir), { recursive: true });
}

const workerSrc = join(src, "build", "pdf.worker.min.mjs");
if (existsSync(workerSrc)) {
  cpSync(workerSrc, join(dest, "pdf.worker.min.mjs"));
} else {
  console.warn("[pdfjs-assets] pdf.worker.min.mjs tidak ditemukan.");
}

console.log("[pdfjs-assets] aset pdf.js siap di public/pdfjs.");
