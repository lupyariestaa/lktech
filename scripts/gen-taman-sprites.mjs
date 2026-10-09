/**
 * Generator sprite pixel "Taman Pixel" (T3). Menghasilkan SVG dari grid karakter.
 *
 * Cara pakai: `npm run gen:taman` (hasil di public/taman/ di-commit, bukan dibuat saat build).
 *
 * Format: setiap sprite adalah array baris string. Tiap karakter = satu piksel,
 * `.` = transparan, huruf lain = warna dari PALET (maks 8 warna per sprite).
 * SVG memakai `<path>` per warna dengan run-length per baris, agar ukuran tetap kecil
 * dan tanpa anti-aliasing (`shape-rendering="crispEdges"`).
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public", "taman");
const BUDGET_BYTES = 60 * 1024;

/* -------------------------------------------------------------------------- */
/* Palet retro 8-bit (terbatas). Huruf kunci dipakai di grid.                  */
/* -------------------------------------------------------------------------- */
const PALETTE = {
  K: "#1d1d2b", // garis gelap
  W: "#fff6e6", // putih hangat
  O: "#f29b38", // oranye
  Y: "#ffd23f", // kuning
  B: "#3a86ff", // biru
  L: "#8ac926", // hijau muda
  G: "#6b7a8f", // abu
  P: "#ff6fa3", // merah muda
  R: "#c1440e", // coklat-merah
  N: "#7a4a2b", // coklat
  C: "#7fd6ff", // biru muda
  D: "#2d6a4f", // hijau tua
};

/* -------------------------------------------------------------------------- */
/* Hewan 12×12. Setiap baris tepat 12 karakter.                                */
/* -------------------------------------------------------------------------- */
const ANIMALS = {
  kucing: [
    "............",
    ".K.......K..",
    ".KK.....KK..",
    ".KOK...KOK..",
    ".KOOKKKOOK..",
    ".KOWWWWWOK..",
    ".KOWKWKWOK..",
    ".KOOOOOOOK..",
    "..KOOOOOK...",
    "..KOOOOOK...",
    "...KK.KK....",
    "............",
  ],
  kelinci: [
    "....KK.KK...",
    "...KWK.KWK..",
    "...KWK.KWK..",
    "...KWK.KWK..",
    "...KWKKKWK..",
    "..KWWWWWWK..",
    "..KWKWWWKWK.",
    "..KWWWWWWWK.",
    "...KWWWWWK..",
    "...KWWWWWK..",
    "....KK.KK...",
    "............",
  ],
  burung: [
    "............",
    "....KKKK....",
    "...KBBBBK...",
    "..KBBBBBBK..",
    "..KBKBBBBK..",
    "..KBBBBBOK..",
    "..KBBBBBOOK.",
    "..KBBBBBK...",
    "...KBBBBK...",
    "...KK.KK....",
    "...Y...Y....",
    "............",
  ],
  rubah: [
    "K.........K.",
    "KO.......OK.",
    "KOK.....KOK.",
    "KOOOOOOOOOK.",
    ".KOKOOOKOK..",
    ".KOWWOWWOK..",
    "..KWWWWWK...",
    "...KWWWK....",
    "....KKK.....",
    "............",
    "............",
    "............",
  ],
  beruang: [
    "..KK....KK..",
    ".KNNK..KNNK.",
    ".KNNKKKKNNK.",
    ".KNNNNNNNNK.",
    "..KNNNNNNK..",
    "..KNWNNWNK..",
    "..KNNKKNNK..",
    ".KNNNNNNNNK.",
    ".KNNNNNNNNK.",
    "..KNNNNNNK..",
    "..KK....KK..",
    "............",
  ],
  "kura-kura": [
    "............",
    "....KKKK....",
    "..KKLLLLKK..",
    ".KLLDLLDLLK.",
    ".KLDLLLLDLK.",
    "KKLLLLLLLLKK",
    "KYYKYYKYYKYK",
    "KYYYYYYYYYYK",
    ".KKKKKKKKKK.",
    "..K.K..K.K..",
    "............",
    "............",
  ],
  "kupu-kupu": [
    "............",
    "PP.KK..KK.PP",
    "PPPKK..KKPPP",
    "PPPPK..KPPPP",
    ".PPKK..KKPP.",
    ".PPKKKKKKPP.",
    "PPPPKWWKPPPP",
    "PPPPKWWKPPPP",
    ".PPKKKKKKPP.",
    "PP.KKKKKK.PP",
    "............",
    "............",
  ],
  ikan: [
    "............",
    "............",
    "..KKKKK.....",
    ".KOOOOOK..K.",
    "KOOOWOOOKKK.",
    "KOOOOOOOOOK.",
    "KOOOOOOOKKK.",
    ".KOOOOOK..K.",
    "..KKKKK.....",
    "............",
    "............",
    "............",
  ],
};

/* -------------------------------------------------------------------------- */
/* Latar & dekorasi (lebar 16 piksel, tinggi bervariasi).                      */
/* -------------------------------------------------------------------------- */
const SCENES = {
  "bg-langit": [
    "CCCCCCCCCCCCCCCC",
    "CCCCWWCCCCCCCCCC",
    "CCWWWWWCCCCCCCCC",
    "CCCCCCCCCCCCCCCC",
  ],
  "bg-tanah": [
    "LLLLLLLLLLLLLLLL",
    "DDDDDDDDDDDDDDDD",
    "NNNNNNNNNNNNNNNN",
    "NNNNNNNNNNNNNNNN",
  ],
  pagar: [
    "WWWWWWWW",
    "WKKKKKKW",
    "WWWWWWWW",
    "WKKKKKKW",
    "WWWWWWWW",
    "WKKKKKKW",
    "NNNNNNNN",
  ],
  pohon: [
    "....DDDD....",
    "...DDLDDD...",
    "..DDLDDDLD..",
    ".DDLDDDDDLD.",
    ".DDDDLDDDDD.",
    "DDLDDDDDDLDD",
    "DDDDDDLDDDDD",
    ".DDDDDDDDDD.",
    "....NNNN....",
    "....NNNN....",
    "....NNNN....",
  ],
};

/* -------------------------------------------------------------------------- */
/* Konversi grid -> SVG (run-length per warna per baris).                      */
/* -------------------------------------------------------------------------- */

/** Validasi grid: baris seragam, karakter dikenal, maks 8 warna. */
export function validateGrid(name, rows) {
  const width = rows[0]?.length ?? 0;
  for (const [i, row] of rows.entries()) {
    if (row.length !== width) {
      throw new Error(`${name}: baris ${i} lebarnya ${row.length}, seharusnya ${width}`);
    }
    for (const ch of row) {
      if (ch !== "." && !(ch in PALETTE)) {
        throw new Error(`${name}: karakter tak dikenal '${ch}' di baris ${i}`);
      }
    }
  }
  const colors = new Set([...rows.join("")].filter((c) => c !== "."));
  if (colors.size > 8) throw new Error(`${name}: ${colors.size} warna (maks 8)`);
  return { width, height: rows.length };
}

/** Bangun path SVG per warna: tiap run horizontal jadi 'M x y h w v1 h-w z'. */
export function gridToSvg(name, rows) {
  const { width, height } = validateGrid(name, rows);
  const byColor = new Map();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < width) {
      const ch = row[x];
      if (ch === ".") {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < width && row[x + run] === ch) run += 1;
      const d = `M${x} ${y}h${run}v1h-${run}z`;
      byColor.set(ch, (byColor.get(ch) ?? "") + d);
      x += run;
    }
  });

  const paths = [...byColor.entries()]
    .map(([ch, d]) => `<path fill="${PALETTE[ch]}" d="${d}"/>`)
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `width="${width * 8}" height="${height * 8}" shape-rendering="crispEdges">${paths}</svg>`
  );
}

/** Tulis semua aset dan kembalikan ringkasan ukuran. */
export function generateAll(outDir = OUT) {
  const entries = [
    ...Object.entries(ANIMALS).map(([k, rows]) => [`animals/${k}`, rows]),
    ...Object.entries(SCENES),
  ];

  const sizes = [];
  for (const [rel, rows] of entries) {
    const svg = gridToSvg(rel, rows);
    const file = resolve(outDir, `${rel}.svg`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, svg, "utf8");
    sizes.push({ rel, bytes: Buffer.byteLength(svg, "utf8") });
  }

  const total = sizes.reduce((s, x) => s + x.bytes, 0);
  return { sizes, total };
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                         */
/* -------------------------------------------------------------------------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { sizes, total } = generateAll();
  for (const s of sizes) console.log(`${s.rel.padEnd(22)} ${String(s.bytes).padStart(6)} B`);
  console.log(`TOTAL ${total} B (anggaran ${BUDGET_BYTES} B)`);
  if (total > BUDGET_BYTES) {
    console.error("Melebihi anggaran 60 KB.");
    process.exit(1);
  }
  if (!existsSync(OUT) || statSync(OUT).isDirectory() === false) {
    console.error("Folder keluaran tidak ada.");
    process.exit(1);
  }
}
