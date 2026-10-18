"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type AnimationEvent,
  type ComponentProps,
} from "react";
import type { HeroShowcaseImage } from "@/lib/content-types";
import { useReducedMotionPreference } from "@/lib/intro";
import { cn } from "@/lib/utils";

/* ── baris gambar melengkung (silinder) ──────────────────────────────
 * Satu baris gambar mengalir dari kanan ke kiri mengelilingi bagian dalam
 * sebuah silinder: bagian tengah menghadap lurus ke kita, ujung-ujungnya
 * membelok ke arah penonton, dan ujungnya memudar ke tepi layar.
 *
 * Kotak CSS tidak bisa dibengkokkan, jadi tiap tile dipotong jadi SLICES
 * pita vertikal — masing-masing satu faset datar silinder yang menampilkan
 * bagiannya sendiri dari gambar. Pita-pita itu diam di dalam tile-nya,
 * masing-masing diputar beberapa derajat pada sumbu silinder, dan yang
 * bergerak adalah tile-nya (`preserve-3d`): satu `rotateY` pada sumbu yang
 * sama membawa seluruh tile menyusuri busur. Satu tile = satu animasi, jadi
 * pita-pitanya mustahil bergeser sendiri-sendiri atau menampilkan gambar
 * berbeda. Hanya delay tiap tile yang beda, dan itu yang menentukan posisinya
 * di busur. Band ini murni `transform` (di compositor); fade-nya mask statis.
 *
 * JS-nya cuma dua: `ResizeObserver` yang mengukur loop, dan handler yang
 * memberi tile gambar berikutnya tiap kali ia keluar layar (tak terlihat).
 * ─────────────────────────────────────────────────────────────── */

/** Pita per tile. Tiap pita hanya beberapa derajat busur — terlalu sempit
 * untuk terbaca sebagai faset; lebih sedikit mulai terlihat "berpatah" di
 * tepi atas/bawah. 8 sudah mulus: simpangan faset terukur < 1 px pada
 * geometri terbesar kita, dan jumlah layer compositor jadi ~5×8 = 40 —
 * jauh lebih ringan untuk perangkat lemah. */
const SLICES = 8;

/** Jarak kamera dari layar, sebagai kelipatan radius silinder. Sedikit di
 * belakang sumbu, supaya ujung-ujungnya datang mendekati lensa & membesar —
 * tapi tidak lebih dekat dari ini: makin dekat, makin ekstrem pembesaran tile
 * di ujung (raster-nya membengkak sampai beberapa kali lipat, dan itu bikin
 * compositor membuang raster tile lain). @default 2,4 */
const CAMERA = 2.4;

/**
 * Radius silinder (sebagai porsi lebar panggung) yang menempatkan tepi frame
 * `bend` radian di busur, dilihat lewat kamera:
 * r·sinθ · CAMERA / (CAMERA − 1 + cosθ) = width / 2, diselesaikan untuk r.
 */
function arc(bend: number) {
  return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));
}

/** Tile tidak pernah lebih lebar dari porsi ini agar ponsel tetap menunjukkan
 * tetangganya, bukan satu tile selebar layar. */
const MAX_WIDTH = 55;

/**
 * Lebar sumber gambar (px). Tile terbesar kita ± 350 px CSS; dengan layar
 * retina 2× itu ± 700 px, jadi 900 px sudah tajam untuk tile tengah dan
 * masih wajar untuk tile ujung yang membesar.
 */
const IMG_WIDTH = 900;

/**
 * URL gambar yang sudah dioptimalkan Cloudinary. Tangkapan layar aslinya PNG
 * 1900×1198 (satu file bisa 3,5 MB — 6 gambar = 6 MB!); dengan `f_auto,q_auto`
 * Cloudinary mengirim WebP/AVIF seukuran kebutuhan, turun ke ratusan KB.
 *
 * Sengaja tidak memakai `imgUrl()` dari `cloudinary-client.ts`: modul itu ikut
 * menarik Firebase client (`@/lib/auth`) ke bundel beranda — mahal untuk
 * sesuatu yang cuma menyusun URL. Di sini transformasi disisipkan langsung ke
 * URL yang sudah ada, dan URL non-Cloudinary (atau yang sudah punya
 * transformasi sendiri) dibiarkan apa adanya.
 */
function optimizedUrl(url: string, width: number) {
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const head = url.slice(0, i + marker.length);
  const rest = url.slice(i + marker.length);
  const [first = ""] = rest.split("/");
  // Segmen pertama berisi ","/"_" = sudah ada transformasi (mis. f_auto,q_auto).
  if (first.includes(",") || first.includes("_")) return url;
  return `${head}f_auto,q_auto,w_${width}/${rest}`;
}

/**
 * Menempatkan loop pada silinder. Radius menaruh tepi frame `bend` radian di
 * busur (lihat `arc`). Sudut dikembalikan dalam derajat: `unit` = busur yang
 * ditempuh satu tinggi tile, `limit` = sejauh mana pusat tile boleh berjalan
 * sebelum seluruh tile keluar layar, dan `sweep` = posisi ujung loop. Loop
 * sengaja mencapai lebih jauh dari `limit`, jadi tile hanya membungkus keluar
 * saat tak terlihat, dan dibulatkan ke jumlah tile bulat agar jaraknya tidak
 * melar.
 */
function measure(
  width: number,
  height: number,
  tile: number,
  aspect: number,
  gap: number,
  bend: number,
) {
  const h = Math.min((tile / 100) * height, ((MAX_WIDTH / 100) * width) / aspect);
  const radius = width * arc(bend);
  if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0, limit: 0 };
  const deg = (rad: number) => (rad * 180) / Math.PI;
  const unit = deg(h / radius);
  const pitch = (aspect + gap / 100) * unit;
  const limit = deg(bend) + (aspect * unit) / 2;
  // Dibatasi agar panggung yang sangat sempit tak memasang ribuan tile.
  const columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
  const round = (n: number) => +n.toFixed(4);
  const sweep = round((columns * pitch) / 2);
  return {
    columns,
    sweep,
    unit: round(unit),
    limit: round(Math.min(sweep, limit)),
  };
}

export type ShowcaseBandProps = {
  /** Gambar berjalan berurutan di sepanjang baris. Tiap tile mengambil gambar
   * berikutnya setiap kali keluar layar, jadi seluruh daftar tetap tampil
   * berapa pun tile yang dibutuhkan frame. Daftar pendek otomatis berulang. */
  images: HeroShowcaseImage[];
  /** Detik untuk baris maju satu tile. Kecepatan per tile, bukan per putaran,
   * jadi ponsel dan layar ultrawide bergerak dengan tempo sama. @default 4 */
  speed?: number;
  /** Tinggi tile, sebagai persen tinggi panggung. @default 26 */
  tileHeight?: number;
  /** Lebar tile dibagi tingginya. @default 16 / 9 */
  aspectRatio?: number;
  /** Jarak antar tile, sebagai persen tinggi tile. @default 6 */
  gap?: number;
  /** Titik tengah baris secara vertikal, persen dari tinggi panggung. @default 50 */
  axis?: number;
  /** Seberapa jauh baris sudah membelok di tepi frame, derajat. Makin besar
   * makin kuat ujungnya menekuk ke penonton. Dibatasi 5–85. @default 80 */
  curve?: number;
  /** Lebar fade di tiap ujung, persen lebar panggung. @default 12 */
  fade?: number;
};

/**
 * Baris gambar **melengkung** yang mengalir terus (loop) — dipakai section
 * "Pratinjau". Murni CSS/transform (tanpa WebGL, tanpa dep baru); panggung
 * wajib punya tinggi eksplisit karena `container-type: size`.
 *
 * `prefers-reduced-motion` → tiap tile **ditempatkan statis** pada busurnya
 * (satu frame band yang beku, tetap melengkung & utuh). Tidak bisa mengandalkan
 * "jeda" animasi: aturan global kita mematikan seluruh animasi pada mode itu.
 */
export function ShowcaseBand({
  images,
  speed = 4,
  tileHeight = 26,
  aspectRatio = 16 / 9,
  gap = 6,
  axis = 50,
  curve = 80,
  fade = 12,
  className,
  ...props
}: ComponentProps<"div"> & ShowcaseBandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPreference();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const orbit = `sb-o-${id}`;
  const tile = `sb-t-${id}`;
  const bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;

  // `null` sampai observer selesai mengukur. Band tetap tersembunyi sampai
  // itu, jadi paint pertama dengan ukuran salah tidak pernah terlihat.
  const [layout, setLayout] = useState<ReturnType<typeof measure> | null>(null);

  // Gambar yang ditampilkan tiap tile, sebagai posisi di daftar gambar.
  // Hanya berubah saat tile membungkus (di luar layar), jadi resize pun tidak
  // menukar gambar yang sedang tampil.
  const [shown, setShown] = useState<Record<number, number>>({});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const next = measure(width, height, tileHeight, aspectRatio, gap, bend);
      setLayout((prev) =>
        prev?.columns === next.columns &&
        prev.sweep === next.sweep &&
        prev.unit === next.unit
          ? prev
          : next,
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [tileHeight, aspectRatio, gap, bend]);

  // Unduh gambar lebih awal, tapi **baru saat section mendekat**: enam gambar
  // ini ratusan KB setelah dioptimalkan, dan tak perlu ikut berebut di pemuatan
  // awal beranda (LCP). Tile mengambil gambar berikutnya sesaat sebelum masuk
  // layar kembali — terlalu telat untuk mulai memuatnya, jadi preload ini yang
  // menjaga band tak berkedip abu-abu.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        for (const { url } of images) new Image().src = optimizedUrl(url, IMG_WIDTH);
        io.disconnect();
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [images]);

  const { columns, sweep, unit, limit } =
    layout ?? measure(1200, 360, tileHeight, aspectRatio, gap, bend);

  // Semua panjang adalah kelipatan tinggi tile, yang mengikuti tinggi panggung
  // sampai MAX_WIDTH membatasinya di layar sempit.
  const u = (n: number) =>
    `calc(${+n.toFixed(4)} * min(${tileHeight}cqh, ${+(MAX_WIDTH / aspectRatio).toFixed(
      4,
    )}cqw))`;

  const r = 100 * arc(bend);
  const radius = `${+r.toFixed(3)}cqw`;
  // Ke sumbu, berputar, kembali masuk: kotak berdiri di silinder pada sudut
  // yang diberikan `rotateY`.
  const turn = (deg: number) =>
    `translateZ(${radius}) rotateY(${+deg.toFixed(4)}deg) translateZ(-${radius})`;

  // Di luar `limit` sebuah tile sudah benar-benar di luar layar, jadi
  // disembunyikan di situ. Ujung loop (tempat ia membungkus) ada di rentang
  // itu, begitu juga tile yang berayun di belakang kamera.
  const hide = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4);
  const css =
    `@keyframes ${orbit}{` +
    `from{transform:${turn(-sweep)}}to{transform:${turn(sweep)}}` +
    `0%,${hide}%,${100 - hide}%,100%{visibility:hidden}` +
    `${hide + 0.001}%,${100 - hide - 0.001}%{visibility:visible}}`;

  // Sudut busur per tile (derajat). Dipakai untuk **menempatkan tile secara
  // statis** saat gerak dimatikan: frame 0 dari animasi = `-sweep + t*pitch`,
  // jadi tampilannya persis seperti band yang sedang beku.
  const pitch = columns > 0 ? (2 * sweep) / columns : 0;

  const share = aspectRatio / SLICES;
  const duration = columns * speed;
  const mask = `linear-gradient(90deg,transparent,#000 ${fade}%,#000 ${
    100 - fade
  }%,transparent)`;

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
      style={{ containerType: "size", ...props.style }}
    >
      <style>{css}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: layout ? 1 : 0,
          // Titik hilang bersama di garis tengah baris, jadi kedua ujungnya
          // membesar merata di atas & bawah garis itu saat mendekat.
          perspective: `${+(r * CAMERA).toFixed(3)}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        {Array.from({ length: columns }, (_, t) => {
          // Tile `columns - 1` mulai paling dekat pintu keluar dan tile 0
          // paling dalam, jadi ini menomori tile sesuai urutan kemunculannya.
          const first = columns - 1 - t;
          const img = images[(shown[t] ?? first) % Math.max(images.length, 1)];
          // Posisi statis bila gerak dimatikan (`prefers-reduced-motion`) — dan
          // memang harus statis: aturan global kita mematikan SEMUA animasi
          // (`animation-duration: 0.001ms`), jadi band "dijeda" akan berakhir
          // menumpuk di tengah sebagai transform kosong. Tile yang di luar
          // `limit` disembunyikan persis seperti di keyframes.
          const deg = -sweep + t * pitch;
          const off = Math.abs(deg) > limit;
          return (
            <div
              key={t}
              className={cn(tile, "absolute")}
              style={{
                left: `calc(50% - ${u(aspectRatio / 2)})`,
                top: `calc(${axis}% - ${u(0.5)})`,
                width: u(aspectRatio),
                height: u(1),
                transformStyle: "preserve-3d",
                // Tile t mulai t tile di sepanjang loop.
                animation: reduced
                  ? "none"
                  : `${orbit} ${duration}s linear ${-t * speed}s infinite`,
                transform: reduced ? turn(deg) : undefined,
                visibility: reduced ? (off ? "hidden" : "visible") : undefined,
              }}
              onAnimationIteration={(e: AnimationEvent<HTMLDivElement>) => {
                // `elapsedTime` menghitung putaran penuh, termasuk yang terlewat.
                const lap = Math.round(e.elapsedTime / duration);
                setShown((prev) => {
                  const next = lap * columns + first;
                  return prev[t] === next ? prev : { ...prev, [t]: next };
                });
              }}
            >
              {Array.from({ length: SLICES }, (_, k) => (
                <div
                  key={k}
                  className={cn(
                    "absolute top-0 overflow-hidden bg-slate-100",
                    k === 0 && "rounded-l-[4px]",
                    k === SLICES - 1 && "rounded-r-[4px]",
                  )}
                  style={{
                    // Tiap pita mulai dari tengah tile dan diputar pada sumbu
                    // ke tempatnya sendiri di busur.
                    left: u((aspectRatio - share) / 2),
                    // Satu piksel lebih lebar dari porsinya, supaya faset
                    // bertetangga saling menimpa dan tak ada garis rambut di
                    // antaranya. Pita terakhir tak punya tetangga.
                    width: k === SLICES - 1 ? u(share) : `calc(${u(share)} + 1px)`,
                    height: u(1),
                    transform: turn((aspectRatio / 2 - (k + 0.5) * share) * unit),
                  }}
                >
                  {img ? (
                    // Tiap pita harus menggeser gambar utuh (`left` negatif)
                    // di dalam klipnya; `next/image` tak bisa di-offset begitu.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={optimizedUrl(img.url, IMG_WIDTH)}
                      alt={k === 0 ? img.alt : ""}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                      className="absolute top-0 max-w-none object-cover"
                      style={{
                        left: u(-k * share),
                        width: u(aspectRatio),
                        height: u(1),
                      }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}