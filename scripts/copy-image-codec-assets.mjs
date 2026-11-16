/** Self-host the AVIF encoder's runtime files; no codec asset is fetched from a CDN. */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@jsquash", "avif", "codec", "enc");
const destination = join(root, "public", "avif-codec");
const assets = [
  "avif_enc.wasm",
  "avif_enc_mt.js",
  "avif_enc_mt.wasm",
  "avif_enc_mt.worker.mjs",
];

if (!existsSync(source)) {
  console.warn("[image-codec-assets] @jsquash/avif tidak ditemukan; lewati penyalinan.");
  process.exit(0);
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const asset of assets) {
  const from = join(source, asset);
  if (existsSync(from)) cpSync(from, join(destination, asset));
  else console.warn(`[image-codec-assets] aset ${asset} tidak ditemukan.`);
}
console.log("[image-codec-assets] aset AVIF siap di public/avif-codec.");
