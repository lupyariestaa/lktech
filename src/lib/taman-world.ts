/**
 * Data dunia "Taman Pixel v2" (V2-5). Murni & tanpa dependensi Phaser, agar:
 * - Mudah dites (`scripts/taman.test.ts`).
 * - Bisa dipakai komponen React (mis. untuk memetakan koordinat hewan).
 *
 * Peta disusun dari tile 16×16. Dunia = 40×24 tile (640×384 px), lalu diskalakan
 * di Phaser agar memenuhi layar.
 */
import type { AnimalKey } from "./taman-types.ts";

export const TILE = 16;
export const WORLD_COLS = 40;
export const WORLD_ROWS = 24;
export const WORLD_WIDTH = WORLD_COLS * TILE; // 640
export const WORLD_HEIGHT = WORLD_ROWS * TILE; // 384

/** Nama tile = nama berkas di `public/taman/v2/tiles/<nama>.png`. */
export const TILE_NAMES = [
  "rumput",
  "jalan",
  "air",
  "tanah",
  "dinding",
  "atap",
  "pagar",
  "pohon",
  "bunga",
  "kabel",
  "tiang",
] as const;
export type TileName = (typeof TILE_NAMES)[number];

/** Kode karakter → nama tile. `.` = rumput (dasar). Dipakai peta di bawah. */
const CH: Record<string, TileName> = {
  ".": "rumput",
  ",": "jalan",
  w: "air",
  t: "tanah",
  W: "dinding",
  A: "atap",
  f: "pagar",
  T: "pohon",
  b: "bunga",
  k: "kabel",
  i: "tiang",
};

/**
 * Peta 40×24 (lihat legenda `CH`). Area:
 * - Kiri atas: rumah (dinding + atap) & ladang (tanah) — beruang, kelinci, rubah, kucing.
 * - Kanan tengah: kolam (air) selebar 8×6 — ikan.
 * - Atas: kabel listrik memanjang + 2 tiang — burung.
 * - Tersebar: pohon, bunga, pagar, jalan setapak.
 *
 * Setiap baris HARUS tepat 40 karakter; baris total 24 (dijaga test).
 */
export const WORLD_MAP: string[] = [
  //            0123456789012345678901234567890123456789
  /*  0 */ "......kkkkkkkkkkkkkkkkkkkkkkkkkkkk......",
  /*  1 */ "......i..........................i......",
  /*  2 */ "......i..........................i......",
  /*  3 */ "..AAAAAAA....TT.......b............b....",
  /*  4 */ "..WWWWWWW....TT......b.............TT...",
  /*  5 */ "..WWWWWWW.......TT.tttttt..TT......TT...",
  /*  6 */ "..WWWWWWW.......TT.ttttttTTTT.........bb",
  /*  7 */ "..WWWWWWW..........ttttbtTT............b",
  /*  8 */ "................,..tttttt...............",
  /*  9 */ "...TT...........,..tttttt...............",
  /* 10 */ "...TT...........,..........wwwwwwww...TT",
  /* 11 */ "...TT...........,..........wwwwwwww...TT",
  /* 12 */ "...TT...........,..........wwwwwwww.....",
  /* 13 */ "................,..........wwwwwwww.....",
  /* 14 */ "............b...,.......................",
  /* 15 */ "............b...,...............f......b",
  /* 16 */ "................,...............f......b",
  /* 17 */ "......TT........,...TT..TT...TT..TT....b",
  /* 18 */ "......TT.....TT.,...TT..TT...TT..TT.....",
  /* 19 */ "......TT.....TT.,.......................",
  /* 20 */ "......TT........,......bb...............",
  /* 21 */ "................,......bb...............",
  /* 22 */ "................,.......................",
  /* 23 */ "........................................",
];

/** Zona tempat hewan boleh berada (koordinat dunia px, sudah di-clamp ke dunia). */
export const ZONES: Record<"darat" | "kolam" | "kabel" | "langit", { x: number; y: number; w: number; h: number }> = {
  // Area darat (mayoritas peta, kecuali kolam & langit).
  darat: { x: 40, y: 110, w: WORLD_WIDTH - 80, h: WORLD_HEIGHT - 150 },
  // Kolam (di sekitar tile air: kolom 27..34, baris 10..13).
  kolam: { x: 27 * TILE, y: 10 * TILE, w: 8 * TILE, h: 4 * TILE },
  // Jalur kabel listrik (baris 0) untuk burung hinggap.
  kabel: { x: 6 * TILE, y: 2, w: 28 * TILE, h: 8 },
  // Langit (area atas) untuk kupu-kupu & burung terbang.
  langit: { x: 40, y: 30, w: WORLD_WIDTH - 80, h: 130 },
};

/** Zona default per hewan (perilaku mengikuti). */
export const ANIMAL_ZONE: Record<AnimalKey, keyof typeof ZONES> = {
  kucing: "darat",
  kelinci: "darat",
  burung: "langit",
  rubah: "darat",
  beruang: "darat",
  "kura-kura": "darat",
  "kupu-kupu": "langit",
  ikan: "kolam",
};

/** Cara gerak per hewan (dipakai AI scene). */
export type MoveStyle =
  | "chase" // kucing: mengejar hewan lain lalu berhenti
  | "wander-eat" // kelinci: mendekati wortel, makan, lompat
  | "fly-perch" // burung: terbang, hinggap di kabel
  | "swim" // ikan: bolak-balik di kolam
  | "slow-walk" // kura-kura: jalan pelan mondar-mandir
  | "patrol" // rubah: mengelilingi area
  | "sit" // beruang: duduk, sesekali jalan
  | "flutter"; // kupu-kupu: terbang tak beraturan di antara bunga

export const ANIMAL_STYLE: Record<AnimalKey, MoveStyle> = {
  kucing: "chase",
  kelinci: "wander-eat",
  burung: "fly-perch",
  rubah: "patrol",
  beruang: "sit",
  "kura-kura": "slow-walk",
  "kupu-kupu": "flutter",
  ikan: "swim",
};

/** Jumlah hewan aktif maksimum (K6). */
export const MAX_ACTIVE = 15;

/** Kecepatan dasar (px/detik) per gaya gerak. */
export const STYLE_SPEED: Record<MoveStyle, number> = {
  chase: 58,
  "wander-eat": 34,
  "fly-perch": 72,
  swim: 40,
  "slow-walk": 16,
  patrol: 30,
  sit: 18,
  flutter: 48,
};

/** Kode peta → matriks nama tile; baris/kolom dipadkan dengan rumput. */
export function parseWorld(): TileName[][] {
  const rows: TileName[][] = [];
  for (let y = 0; y < WORLD_ROWS; y++) {
    const line = WORLD_MAP[y] ?? "";
    const row: TileName[] = [];
    for (let x = 0; x < WORLD_COLS; x++) {
      const ch = line[x] ?? ".";
      row.push(CH[ch] ?? "rumput");
    }
    rows.push(row);
  }
  return rows;
}

/** Fungsi acak deterministik (untuk tes atau seed tetap). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Posisi acak di dalam zona (koordinat pusat, px). */
export function randomInZone(zone: keyof typeof ZONES, rnd: () => number): { x: number; y: number } {
  const z = ZONES[zone];
  return { x: z.x + rnd() * z.w, y: z.y + rnd() * z.h };
}
