/**
 * Generator aset Taman v2 (V2-2) — PNG untuk Phaser.
 *
 * Cara pakai: `npm run gen:taman-v2`
 *
 * Phaser tidak memuat SVG sebagai tekstur dengan andal, jadi aset v2 dibuat PNG.
 * Sumber tetap grid karakter (mudah diedit), lalu di-encode lewat `sharp`.
 *
 * Keluaran di `public/taman/v2/`:
 * - `tiles/*.png`         : tile peta 16×16
 * - `animals/<hewan>.png` : sprite sheet 16×16 × 4 frame (monokrom terang, untuk tint)
 * - `objects/*.png`       : objek (wortel, dll)
 *
 * Catatan warna: sprite hewan dibuat **monokrom terang** (abu terang). Phaser
 * mewarnainya dengan `setTint` sesuai varian (lihat VARIANT_TINT di taman-types.ts).
 */
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public", "taman", "v2");
const BUDGET_BYTES = 150 * 1024;

/* -------------------------------------------------------------------------- */
/* Palet (RGBA). Untuk tile peta (berwarna), bukan untuk hewan (monokrom).     */
/* -------------------------------------------------------------------------- */
const P = {
  ".": [0, 0, 0, 0], // transparan
  g: [124, 179, 66, 255], // rumput
  G: [98, 148, 51, 255], // rumput gelap
  d: [138, 102, 63, 255], // tanah/jalan setapak
  D: [110, 80, 48, 255], // tanah gelap
  w: [86, 168, 224, 255], // air
  W: [58, 132, 190, 255], // air gelap
  s: [240, 240, 245, 255], // batu/abu terang
  S: [170, 175, 185, 255], // batu/abu
  k: [60, 55, 70, 255], // garis gelap
  r: [196, 74, 58, 255], // atap merah
  R: [150, 50, 40, 255], // atap merah gelap
  n: [122, 82, 48, 255], // kayu
  N: [92, 60, 34, 255], // kayu gelap
  l: [76, 140, 60, 255], // daun
  L: [58, 112, 46, 255], // daun gelap
  y: [255, 208, 74, 255], // kuning (bunga)
  p: [232, 122, 168, 255], // merah muda (bunga)
  o: [242, 155, 56, 255], // oranye (wortel)
  c: [255, 255, 255, 255], // putih
  // Monokrom hewan (base untuk tint): terang netral
  a: [225, 225, 232, 255], // body terang
  b: [200, 200, 210, 255], // body sedang
  e: [150, 150, 162, 255], // bayangan body
  m: [40, 40, 52, 255], // mata/lubang (tetap gelap)
  x: [88, 88, 100, 255], // garis luar hewan
};

/* -------------------------------------------------------------------------- */
/* Tile peta 16×16. Karakter = warna dari palet.                               */
/* -------------------------------------------------------------------------- */
const TILES = {
  rumput: [
    "gggggggggggggggg",
    "gGggggggggggGggg",
    "gggggggggggggggg",
    "ggggggGggggggggg",
    "gggggggggggggggg",
    "ggGggggggggggggg",
    "ggggggggggggGggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
    "gggGgggggggggggg",
    "ggggggggggGggggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
    "ggGggggggggggggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
  ],
  jalan: [
    "dddddddddddddddd",
    "dDdddddddddDdddd",
    "dddddddddddddddd",
    "ddddDddddddddddd",
    "dddddddddddddddd",
    "dddddddddddddDdd",
    "dddddddddddddddd",
    "ddddddddDddddddd",
    "dddddddddddddddd",
    "ddDddddddddddddd",
    "dddddddddddddddd",
    "dddddddddDdddddd",
    "dddddddddddddddd",
    "dddddddddddddddd",
    "dddDdddddddddddd",
    "dddddddddddddddd",
  ],
  air: [
    "wwwwwwwwwwwwwwww",
    "wWwwwwwwwWwwwwww",
    "wwwwwwwwwwwwwwww",
    "wwwwwwWwwwwwwwww",
    "wwwwwwwwwwwwwwww",
    "wwwWwwwwwwwwWwww",
    "wwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwww",
    "wWwwwwwwwwwwwwww",
    "wwwwwwwwWwwwwwww",
    "wwwwwwwwwwwwwwww",
    "wwwwWwwwwwwwwwww",
    "wwwwwwwwwwwwwwww",
    "wwwwwwwwwwWwwwww",
    "wwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwww",
  ],
  tanah: [
    "dddddddddddddddd",
    "dDdddddddddDdddd",
    "dddddddddddddddd",
    "dddddDdddddddddd",
    "dddddddddddddddd",
    "ddDddddddddddddd",
    "ddddddddddDddddd",
    "dddddddddddddddd",
    "dddddddDdddddddd",
    "dddddddddddddddd",
    "dDddddddddddDddd",
    "dddddddddddddddd",
    "dddddddddddddddd",
    "ddddDddddddddddd",
    "dddddddddddddddd",
    "dddddddddddddddd",
  ],
  dinding: [
    "nnnnnnnnnnnnnnnn",
    "nNnnnnnNnnnnnnnn",
    "nnnnnnnnnnnnnnNn",
    "nnNnnnnnnnnnnnnn",
    "nnnnnnnnnNnnnnnn",
    "nnnnnnnnnnnnnnnn",
    "nnNnnnnnnnnNnnnn",
    "nnnnnnnnnnnnnnnn",
    "nnnnnnNnnnnnnnnn",
    "nnNnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnnn",
    "nnnnnnnnnnNnnnnn",
    "nnnnnnnnnnnnnnnn",
    "nNnnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnnn",
    "nnnnnnNnnnnnnnnn",
  ],
  atap: [
    "rrrrrrrrrrrrrrrr",
    "rRrrrrrrrrRrrrrr",
    "rrrrrrrrrrrrrrrr",
    "rrrrRrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrr",
    "rRrrrrrrrrRrrrrr",
    "rrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrr",
    "rrrrrrrrRrrrrrrr",
    "rrrrrrrrrrrrrrrr",
    "rRrrrrrrrrrrRrrr",
    "rrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrr",
    "rrrrRrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrr",
  ],
  pagar: [
    "................",
    "..nnnn....nnnn..",
    ".NnnnnN..NnnnnN.",
    ".NnnnnN..NnnnnN.",
    "nnnnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnnn",
    ".NnnnnN..NnnnnN.",
    ".NnnnnN..NnnnnN.",
    "nnnnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnnn",
    ".NnnnnN..NnnnnN.",
    ".NnnnnN..NnnnnN.",
    "................",
    "................",
    "................",
    "................",
  ],
  pohon: [
    "......lll.......",
    "....lllllll.....",
    "...llllLllll....",
    "..lllLlllllll...",
    ".lllllllLlllll..",
    ".llLlllllllllll.",
    "llllllLllllLlll.",
    "lllllllllllllll.",
    ".llllllllLlllll.",
    "..lllllllllll...",
    "...LlllllllL....",
    "......NnN.......",
    "......NnN.......",
    "......NnN.......",
    "......NnN.......",
    "....NNnnNN......",
  ],
  bunga: [
    ".gggggggggggggg.",
    "gggggggggggggggg",
    "gggyygggggpppggg",
    "gggyyggggggppggg",
    "gggyygggggpppggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
    "ggggyyyygggggggg",
    "ggggyyyygggggggg",
    "gggggggggggggggg",
    "ggggggggggpppggg",
    "ggggggggggpppggg",
    "gggggggggggggggg",
    "gggggggggggggggg",
  ],
  kabel: [
    "................",
    "................",
    "................",
    "................",
    "kkkkkkkkkkkkkkkk",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  tiang: [
    "................",
    "......kkk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "......ksk.......",
    "................",
  ],
};

/* -------------------------------------------------------------------------- */
/* Sprite hewan 16×16, monokrom terang (untuk tint). 4 frame per hewan.        */
/* Semua karakter hewan: a/b/e (body), m (mata), x (garis luar).               */
/* -------------------------------------------------------------------------- */
function pad16(rows) {
  const out = rows.map((r) => r.padEnd(16, ".").slice(0, 16));
  while (out.length < 16) out.push(".".repeat(16));
  return out.slice(0, 16);
}

/** Frame dasar (diam) per hewan; frame jalan dibuat dengan variasi kecil. */
const ANIMAL_BASE = {
  // Kucing: kepala bulat, dua telinga segitiga, mata gelap, kaki kecil.
  kucing: pad16([
    "................",
    "..x..........x..",
    ".xax........xax.",
    ".xaax......xaax.",
    ".xaaaxxxxxxaaax.",
    ".xaaaaaaaaaaaax.",
    ".xaaaaaaaaaaaax.",
    ".xamaaaaaamaax..",
    "..xaaaaaaaaaax..",
    "..xaaammmaaaax..",
    "..xaaaaaaaaaax..",
    "...xaaaaaaaax...",
    "...xbxxxxxxxbx..",
    "...xex....xex...",
    "...xex....xex...",
    "................",
  ]),
  // Kelinci: dua telinga panjang, kepala kecil, kaki.
  kelinci: pad16([
    "...x......x.....",
    "..xax....xax....",
    "..xax....xax....",
    "..xaxx..xxax....",
    "..xaaaxxaaax....",
    "..xaaaaaaaaax...",
    "..xaaaaaaaaax...",
    "..xamaaaamaax...",
    "..xaaammmaaax...",
    "...xaaaaaaax....",
    "...xaaaaaaax....",
    "...xbxxxxxbx....",
    "...xex...xex....",
    "................",
    "................",
    "................",
  ]),
  // Burung: badan bulat, paruh segitiga, sayap, dua kaki.
  burung: pad16([
    "................",
    ".....xxxx.......",
    "....xaaaax......",
    "...xaaaaaax.....",
    "..xaaaaaaaaax...",
    "..xaamaamaaax...",
    ".xxaaaaaaaaoxy..",
    ".xxaaaaaaaaaxy..",
    "..xxaaaaaaax....",
    "....xaaaaax.....",
    "....xbxxxbx.....",
    "....xex.xex.....",
    "....xex.xex.....",
    "................",
    "................",
    "................",
  ]),
  // Rubah: moncong runcing, telinga lancip lebar.
  rubah: pad16([
    "x.............x.",
    "xax.........xax.",
    "xaax.......xaax.",
    "xaaaxxxxxxxaaax.",
    ".xaaaaaaaaaaax..",
    ".xamaaaaaamaax..",
    ".xaaaaammmaaax..",
    ".xaaaxxxxaaax...",
    "..xaaxxxaaxx....",
    "..xaaaaaaaax....",
    "...xaaaaaaax....",
    "...xbxxxxxbx....",
    "...xex...xex....",
    "................",
    "................",
    "................",
  ]),
  // Beruang: kepala besar, dua telinga bulat, badan lebar.
  beruang: pad16([
    "..xx........xx..",
    ".xaax......xaax.",
    ".xaaaxxxxxxaaax.",
    ".xaaaaaaaaaaaax.",
    ".xaaaaaaaaaaaax.",
    ".xamaaaaaamaax..",
    "..xaaaaaaaaaax..",
    "..xaaammmaaax...",
    "..aaaaaaaaaaax..",
    ".xaaaaaaaaaaaax.",
    ".xaaaaaaaaaaaax.",
    "..xbxxxxxxxbx...",
    "..xex.....xex...",
    "..xex.....xex...",
    "................",
    "................",
  ]),
  // Kura-kura: tempurung gelap berpola, kepala keluar, empat kaki.
  "kura-kura": pad16([
    ".....xxxxx......",
    "....xeeeeex.....",
    "...xeeeeeeex....",
    "..xeeeeeeeeeex..",
    "..xeeeaeeaeeex..",
    ".xeeeeeeeeeeeex.",
    ".xeeeeeeeemeeex.",
    "xxmmxeeeeeeemxx.",
    "xexxeeeeeeexxex.",
    ".xeeeeeeeeeeex..",
    "..xeex....xeex..",
    "..xeex....xeex..",
    "...xx......xx...",
    "................",
    "................",
    "................",
  ]),
  // Kupu-kupu: dua sayap besar, badan tipis, antena.
  "kupu-kupu": pad16([
    "..x..........x..",
    "...x........x...",
    "..xxxx....xxxx..",
    ".xaaaaax.xaaaaax",
    ".xaaaaaaxxaaaaax",
    ".xaaaaaammxaaaax",
    "..xaaaammxaaaaax",
    "..xaaaammxaaaaax",
    ".xaaaaaaxxaaaaax",
    ".xaaaaax..xaaaax",
    "..xxxx.....xxxx.",
    "....mm...mm.....",
    ".....m...m......",
    "......xx........",
    "................",
    "................",
  ]),
  // Ikan: badan lonjong, ekor, mata, gelembung.
  ikan: pad16([
    "................",
    "................",
    "......xxxxxx....",
    "....xxaaaaaaxx..",
    "...xaaaaaaaaxax.",
    "..xaaaamaaaaaxax",
    ".xaaaaaaaaaaaxx.",
    "..xaaaamaaaaaxax",
    "...xaaaaaaaaxax.",
    "....xxaaaaaaxx..",
    "......xxxxxx....",
    ".........c......",
    "................",
    "................",
    "................",
    "................",
  ]),
};
/* Objek                                                                       */
/* -------------------------------------------------------------------------- */
const OBJECTS = {
  wortel: pad16([
    "................",
    "................",
    "......l.l.......",
    ".....llll.......",
    "......ll........",
    ".....oooo.......",
    ".....oooo.......",
    "....ooo.o.......".slice(0, 16),
    "....oooo........",
    "....ooo.........",
    ".....oo.........",
    ".....oo.........",
    "......o.........",
    "",
    "",
  ]),
};

/* -------------------------------------------------------------------------- */
/* Grid → pixel RGBA                                                           */
/* -------------------------------------------------------------------------- */
function gridToRaw(rows, width = 16, height = 16) {
  if (rows.length !== height) throw new Error(`grid tinggi ${rows.length}, harus ${height}`);
  const buf = Buffer.alloc(width * height * 4);
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`baris ${y} lebar ${row.length}, harus ${width}`);
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      const color = P[ch];
      if (!color) throw new Error(`karakter tak dikenal '${ch}' di baris ${y}: ${row}`);
      const i = (y * width + x) * 4;
      buf[i] = color[0];
      buf[i + 1] = color[1];
      buf[i + 2] = color[2];
      buf[i + 3] = color[3];
    }
  });
  return buf;
}

async function writePng(file, rows, width = 16, height = 16) {
  const raw = gridToRaw(rows, width, height);
  const png = await sharp(raw, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png);
  return png.length;
}

/** Frame jalan: variasi kecil dari frame dasar (naik-turun 1 baris). */
/**
 * Frame jalan: hanya KAKI yang bergerak, bukan seluruh badan. Baris 13–14 adalah
 * kaki pada sebagian besar hewan; frame 2 mengangkat kaki kiri, frame 4 kaki kanan.
 * Frame 3 = idle. Untuk hewan tanpa kaki (kupu-kupu), pakai kedip sayap.
 */
function walkFrames(base, name) {
  const rows = base.map((r) => r.split(""));
  const shiftLeg = (rowIdx, dir) => {
    if (rowIdx !== 13 && rowIdx !== 14) return;
    const r = rows[rowIdx];
    if (dir === "left") {
      for (let x = 1; x < 8; x++) { r[x] = r[x - 1] === "x" ? "." : r[x]; }
    }
  };
  const f = base.map((r) => r);
  const f2 = base.map((r, i) => (i === 14 ? r.replace(/xex/, ".e.") : r));
  const f4 = base.map((r, i) => (i === 13 ? r.replace(/xex/, ".e.") : r));
  void shiftLeg;
  if (name === "kupu-kupu") {
    // Sayap menutup (baris sayap dipersempit).
    const closed = base.map((r, i) => (i >= 4 && i <= 8 ? r.replace(/a/g, "e") : r));
    return [f, closed, f, base];
  }
  if (name === "ikan") {
    // Ekor bergerak.
    const t1 = base.map((r, i) => (i >= 4 && i <= 7 ? r.replace(/ax$/, "x.") : r));
    const t2 = base.map((r, i) => (i >= 4 && i <= 7 ? r.replace(/ax$/, ".x") : r));
    return [f, t1, f, t2];
  }
  return [f, f2, f, f4];
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */
export async function generateAll(outDir = OUT) {
  const sizes = [];

  for (const [name, rows] of Object.entries(TILES)) {
    sizes.push({ rel: `tiles/${name}.png`, bytes: await writePng(resolve(outDir, "tiles", `${name}.png`), rows) });
  }

  for (const [name, rows] of Object.entries(ANIMAL_BASE)) {
    // Sprite sheet horizontal 4 frame (64×16) agar mudah dipakai Phaser.
    const frames = walkFrames(rows, name);
    const sheet = [];
    for (let y = 0; y < 16; y++) {
      sheet.push(frames.map((f) => f[y]).join(""));
    }
    sizes.push({
      rel: `animals/${name}.png`,
      bytes: await writePng(resolve(outDir, "animals", `${name}.png`), sheet, 64, 16),
    });
  }

  for (const [name, rows] of Object.entries(OBJECTS)) {
    sizes.push({ rel: `objects/${name}.png`, bytes: await writePng(resolve(outDir, "objects", `${name}.png`), rows) });
  }

  const total = sizes.reduce((s, x) => s + x.bytes, 0);
  return { sizes, total };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const { sizes, total } = await generateAll();
  for (const s of sizes) console.log(`${s.rel.padEnd(26)} ${String(s.bytes).padStart(6)} B`);
  console.log(`TOTAL ${total} B (anggaran ${BUDGET_BYTES} B)`);
  try {
    statSync(OUT);
  } catch {
    console.error("Folder keluaran tidak ada.");
    process.exit(1);
  }
  if (total > BUDGET_BYTES) {
    console.error("Melebihi anggaran 150 KB.");
    process.exit(1);
  }
}
