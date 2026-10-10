"use client";

/**
 * Scene Phaser "Taman" (V2-5). Dipisah dari React; dijalankan lewat dynamic import
 * Phaser di `taman-phaser.tsx` sehingga halaman lain tidak ikut memuat Phaser (±1 MB).
 *
 * Dunia: peta tile 40×24 (16 px), hewan 24×24 sprite sheet 6 frame, diwarnai dengan
 * `setTint` sesuai varian. Klik hewan → `onPick(id)` (React membuka kartu).
 *
 * `reducedMotion`: hewan diam di posisinya (tanpa tween), kanvas tetap tampil.
 */

export type AnimalSpec = {
  /** id testimoni (kunci untuk membuka kartu di React). */
  id: string;
  animal: string;
  variant: string;
};

export type PhaserSceneOptions = {
  parent: HTMLElement;
  animals: AnimalSpec[];
  reducedMotion: boolean;
  /** Klik/tap hewan → id testimoni. */
  onPick: (id: string) => void;
  /** Dipanggil tiap frame (untuk memetakan koordinat hewan → layar). */
  onFrame?: (positions: Array<{ id: string; x: number; y: number }>) => void;
};

/* ---------- Konstanta dunia (cerminan taman-world.ts tanpa import TS di bundle Phaser) ---------- */
const TILE = 16;
const COLS = 40;
const ROWS = 24;
const W = COLS * TILE; // 640
const H = ROWS * TILE; // 384
const FRAME = 24;
const IDLE_KEYS = [0, 1]; // idle0, idle1
const WALK_LEFT = [2, 3]; // walk0, walk1
// 4,5 = aksi khusus per hewan (dipakai sebagai variasi idle agar hidup).

const TILE_NAMES = [
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

const ANIMAL_NAMES = [
  "kucing",
  "kelinci",
  "burung",
  "rubah",
  "beruang",
  "kura-kura",
  "kupu-kupu",
  "ikan",
] as const;

/** Peta tile: '' = rumput dasar (digambar sebagai latar). Sisanya objek di atas. */
const MAP: string[] = [
  "......kkkkkkkkkkkkkkkkkkkkkkkkkkkk......",
  "......i..........................i......",
  "......i..........................i......",
  "..AAAAAAA....TT.......b............b....",
  "..WWWWWWW....TT......b.............TT...",
  "..WWWWWWW.......TT.tttttt..TT......TT...",
  "..WWWWWWW.......TT.ttttttTTTT.........bb",
  "..WWWWWWW..........ttttbtTT............b",
  "................,..tttttt...............",
  "...TT...........,..tttttt...............",
  "...TT...........,..........wwwwwwww...TT",
  "...TT...........,..........wwwwwwww...TT",
  "...TT...........,..........wwwwwwww.....",
  "................,..........wwwwwwww.....",
  "............b...,.......................",
  "............b...,...............f......b",
  "................,...............f......b",
  "......TT........,...TT..TT...TT..TT....b",
  "......TT.....TT.,...TT..TT...TT..TT.....",
  "......TT.....TT.,.......................",
  "......TT........,......bb...............",
  "................,......bb...............",
  "................,.......................",
  "........................................",
];

const CH: Record<string, string> = {
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

/** Tint warna (sama dengan VARIANT_TINT di taman-types.ts). */
const TINT: Record<string, number> = {
  normal: 0xffffff,
  putih: 0xf5f5f5,
  hitam: 0x3a3a44,
  coklat: 0xa9743f,
  emas: 0xffc93c,
  biru: 0x5aa9ff,
  abu: 0x9aa4b2,
  merah: 0xff6b5a,
};

type Zone = { x: number; y: number; w: number; h: number };
const ZONES: Record<string, Zone> = {
  darat: { x: 40, y: 110, w: W - 80, h: H - 150 },
  kolam: { x: 27 * TILE, y: 10 * TILE, w: 8 * TILE, h: 4 * TILE },
  kabel: { x: 6 * TILE, y: 2, w: 28 * TILE, h: 8 },
  langit: { x: 40, y: 30, w: W - 80, h: 130 },
};

const ZONE_OF: Record<string, keyof typeof ZONES> = {
  kucing: "darat",
  kelinci: "darat",
  burung: "langit",
  rubah: "darat",
  beruang: "darat",
  "kura-kura": "darat",
  "kupu-kupu": "langit",
  ikan: "kolam",
};

type Style = "chase" | "wander-eat" | "fly-perch" | "swim" | "slow-walk" | "patrol" | "sit" | "flutter";
const STYLE_OF: Record<string, Style> = {
  kucing: "chase",
  kelinci: "wander-eat",
  burung: "fly-perch",
  rubah: "patrol",
  beruang: "sit",
  "kura-kura": "slow-walk",
  "kupu-kupu": "flutter",
  ikan: "swim",
};
const SPEED: Record<Style, number> = {
  chase: 58,
  "wander-eat": 34,
  "fly-perch": 72,
  swim: 40,
  "slow-walk": 16,
  patrol: 30,
  sit: 18,
  flutter: 48,
};

/** Bentuk minimal Phaser yang kita pakai (hindari tipe besar Phaser di compile). */
type P = typeof import("phaser");

type Unit = {
  id: string;
  animal: string;
  sprite: Phaser.GameObjects.Sprite;
  zone: Zone;
  speed: number;
  // target gerak
  tx: number;
  ty: number;
  waitMs: number;
  frameTick: number;
};

function randIn(z: Zone) {
  return { x: z.x + Math.random() * z.w, y: z.y + Math.random() * z.h };
}

function clampTo(z: Zone, x: number, y: number) {
  return {
    x: Math.min(z.x + z.w, Math.max(z.x, x)),
    y: Math.min(z.y + z.h, Math.max(z.y, y)),
  };
}

/** Bangun game Phaser & jalankan scene. Mengembalikan disposer untuk unmount. */
export async function startTamanPhaser(opts: PhaserSceneOptions): Promise<() => void> {
  const Phaser = (await import("phaser")).default as P;
  const { parent, animals, reducedMotion, onPick, onFrame } = opts;

  const units: Unit[] = [];
  let game: Phaser.Game | null = null;
  let reportAcc = 0;

  class TamanScene extends Phaser.Scene {
    constructor() {
      super("taman");
    }

    preload() {
      const base = "/taman/v2";
      for (const t of TILE_NAMES) this.load.image(`tile-${t}`, `${base}/tiles/${t}.png`);
      for (const a of ANIMAL_NAMES) {
        this.load.spritesheet(`animal-${a}`, `${base}/animals/${a}.png`, {
          frameWidth: FRAME,
          frameHeight: FRAME,
        });
      }
    }

    create() {
      // Latar rumput: tileSprite agar hemat (bukan 40×24 gambar).
      if (this.textures.exists("tile-rumput")) {
        this.add.tileSprite(0, 0, W, H, "tile-rumput").setOrigin(0, 0);
      }
      // Objek tile (lewati rumput) & jalan sebagai lapisan.
      for (let y = 0; y < ROWS; y++) {
        const line = MAP[y] ?? "";
        for (let x = 0; x < COLS; x++) {
          const ch = line[x] ?? ".";
          const name = CH[ch] ?? "rumput";
          if (name === "rumput") continue;
          const key = `tile-${name}`;
          if (!this.textures.exists(key)) continue;
          this.add.image(x * TILE, y * TILE, key).setOrigin(0, 0);
        }
      }

      // Spawn hewan.
      for (const spec of animals) {
        const animal = ANIMAL_NAMES.includes(spec.animal as (typeof ANIMAL_NAMES)[number]) ? spec.animal : "kucing";
        const key = `animal-${animal}`;
        if (!this.textures.exists(key)) continue;
        const zone = ZONES[ZONE_OF[animal] ?? "darat"];
        const start = randIn(zone);
        const sprite = this.add.sprite(start.x, start.y, key, 0).setOrigin(0.5, 0.5);
        sprite.setScale(2); // 24 px → 48 px di layar
        const tint = TINT[spec.variant] ?? 0xffffff;
        sprite.setTint(tint);
        sprite.setInteractive({ useHandCursor: true });
        sprite.on("pointerdown", () => onPick(spec.id));

        const unit: Unit = {
          id: spec.id,
          animal,
          sprite,
          zone,
          speed: SPEED[STYLE_OF[animal] ?? "patrol"],
          tx: start.x,
          ty: start.y,
          waitMs: reducedMotion ? 0 : 400 + Math.random() * 1200,
          frameTick: 0,
        };
        const next = randIn(zone);
        unit.tx = next.x;
        unit.ty = next.y;
        units.push(unit);
        if (reducedMotion) {
          sprite.setFrame(IDLE_KEYS[0]);
        }
      }

      // Kamera: muat seluruh dunia ke viewport.
      const cam = this.cameras.main;
      const zoom = Math.max(this.scale.width / W, this.scale.height / H);
      cam.setZoom(zoom);
      cam.centerOn(W / 2, H / 2);

      // Laporkan posisi awal (penting untuk reduced motion / anchor kartu).
      if (onFrame) onFrame(units.map((u) => ({ id: u.id, x: u.sprite.x, y: u.sprite.y })));
    }

    update(_time: number, deltaMs: number) {
      // Reduced motion: hewan diam → tidak perlu update tiap frame (hemat).
      if (reducedMotion) return;

      const dt = Math.min(deltaMs, 50) / 1000;
      for (const u of units) {
        if (u.waitMs > 0) {
          u.waitMs -= deltaMs;
          u.sprite.setFrame(IDLE_KEYS[Math.floor(u.frameTick / 500) % IDLE_KEYS.length]);
          u.frameTick += deltaMs;
          continue;
        }
        const dx = u.tx - u.sprite.x;
        const dy = u.ty - u.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) {
          // Sampai tujuan: pilih target baru (atau jeda, terutama beruang duduk).
          const style = STYLE_OF[u.animal] ?? "patrol";
          const p = randIn(u.zone);
          u.tx = p.x;
          u.ty = p.y;
          u.waitMs = style === "sit" ? 2000 + Math.random() * 3000 : 300 + Math.random() * 1600;
          continue;
        }
        const step = (u.speed * dt) / Math.max(dist, 1);
        u.sprite.x += dx * step;
        u.sprite.y += dy * step;
        // Animasi jalan (2 frame bergantian).
        const walking = Math.floor(u.frameTick / 140) % WALK_LEFT.length;
        u.sprite.setFrame(WALK_LEFT[walking]);
        u.sprite.setFlipX(dx < 0);
        u.frameTick += deltaMs;
      }

      // Laporkan posisi ke React secara hemat (~10 fps) — cukup untuk anchor kartu.
      if (onFrame) {
        reportAcc += deltaMs;
        if (reportAcc >= 100) {
          reportAcc = 0;
          onFrame(units.map((u) => ({ id: u.id, x: u.sprite.x, y: u.sprite.y })));
        }
      }
    }
  }

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 960,
    height: parent.clientHeight || 540,
    backgroundColor: "#bfe6ff",
    pixelArt: true,
    roundPixels: true,
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
    scene: [TamanScene],
    banner: false,
  });

  void clampTo; // (cadangan util; dipertahankan agar mudah dipakai saat tuning AI)

  return () => {
    try {
      game?.destroy(true);
    } catch {
      /* abaikan error saat teardown */
    }
    game = null;
    units.length = 0;
  };
}
