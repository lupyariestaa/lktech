/**
 * Generator sprite hewan 24×24 dengan 6 pose (V2-2 revisi).
 *
 * Cara pakai: `npm run gen:taman-animals`
 * Keluaran: `public/taman/v2/animals/<hewan>.png` (sprite sheet horizontal,
 * 6 frame × 24 px = 144×24). Sprite monokrom terang agar bisa di-tint Phaser.
 *
 * Karakter grid (24×24):
 *   .  transparan
 *   o  garis luar (gelap)      -> tetap gelap walau di-tint
 *   b  body terang             -> tint mengubah ini
 *   s  body sedang (bayangan)  -> tint mengubah ini
 *   d  body gelap (bayangan)   -> tint mengubah ini
 *   p  aksen terang (putih)    -> tetap terang
 *   m  mata/hidung (hitam)     -> tetap gelap
 *   e  pipi/telinga dalam (gelap muda)
 *   w  elemen putih mata
 *   k  objek khusus (mis. wortel) — warna asli, tidak ikut tint
 *
 * Pose standar (6): idle0, idle1, walk0, walk1, act0, act1.
 * Aksi khusus: kucing=run, kelinci=eat, burung=fly, rubah=pounce,
 * beruang=sit, kura-kura=hide, kupu-kupu=fly, ikan=swim.
 */
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ANIMAL_POSES } from "./taman-animal-art.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public", "taman", "v2", "animals");
const SIZE = 24;
const FRAMES = 6;
const BUDGET_BYTES = 150 * 1024;

/** Palet: hewan monokrom terang (di-tint), hanya m/o/x yang tetap gelap. */
const PAL = {
  ".": [0, 0, 0, 0],
  o: [70, 70, 84, 255], // garis luar
  b: [232, 232, 238, 255], // body terang (di-tint)
  s: [204, 204, 214, 255], // body sedang
  d: [168, 168, 180, 255], // body gelap
  p: [255, 255, 255, 255], // aksen putih
  m: [32, 32, 42, 255], // mata/hidung
  e: [120, 120, 134, 255], // dalam telinga
  w: [255, 255, 255, 255], // kilau mata
  k: [242, 155, 56, 255], // objek (wortel) — tidak ikut tint
  g: [92, 148, 54, 255], // daun (wortel) — tidak ikut tint
};

function validate(name, rows) {
  if (rows.length !== SIZE) throw new Error(`${name}: ${rows.length} baris, harus ${SIZE}`);
  rows.forEach((r, i) => {
    if (r.length !== SIZE) throw new Error(`${name} baris ${i}: lebar ${r.length}, harus ${SIZE}`);
    for (const ch of r) if (!(ch in PAL)) throw new Error(`${name} baris ${i}: karakter '${ch}' tak dikenal`);
  });
}

function toRaw(rows) {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  rows.forEach((row, y) => {
    for (let x = 0; x < SIZE; x++) {
      const c = PAL[row[x]];
      const i = (y * SIZE + x) * 4;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = c[3];
    }
  });
  return buf;
}

/** Gabungkan N frame (masing-masing 24×24) menjadi satu gambar horizontal. */
async function writeSheet(name, frames) {
  const width = SIZE * FRAMES;
  const buf = Buffer.alloc(width * SIZE * 4);
  frames.forEach((rows, f) => {
    const raw = toRaw(rows);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const src = (y * SIZE + x) * 4;
        const dst = (y * width + f * SIZE + x) * 4;
        buf[dst] = raw[src];
        buf[dst + 1] = raw[src + 1];
        buf[dst + 2] = raw[src + 2];
        buf[dst + 3] = raw[src + 3];
      }
    }
  });
  const png = await sharp(buf, { raw: { width, height: SIZE, channels: 4 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  mkdirSync(dirname(resolve(OUT, `${name}.png`)), { recursive: true });
  writeFileSync(resolve(OUT, `${name}.png`), png);
  return png.length;
}

/** Ubah 6 pose (nama + grid) menjadi satu sprite sheet. */
export async function generateAnimals(only = null) {
  const sizes = [];
  for (const [name, poses] of Object.entries(ANIMAL_POSES)) {
    if (only && !only.includes(name)) continue;
    const frames = poses.map((p) => p.rows);
    if (frames.length !== FRAMES) throw new Error(`${name}: ${frames.length} pose, harus ${FRAMES}`);
    frames.forEach((rows, i) => validate(`${name}[${poses[i].key}]`, rows));
    sizes.push({ rel: `${name}.png`, bytes: await writeSheet(name, frames) });
  }
  const total = sizes.reduce((s, x) => s + x.bytes, 0);
  return { sizes, total };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const { sizes, total } = await generateAnimals(only.length ? only : null);
  for (const s of sizes) console.log(`${s.rel.padEnd(20)} ${String(s.bytes).padStart(6)} B`);
  console.log(`TOTAL ${total} B (anggaran ${BUDGET_BYTES} B)`);
  statSync(OUT);
}
