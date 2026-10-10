"use client";

import { useState } from "react";
import { VARIANT_TINT, type AnimalKey, type AnimalVariant } from "@/lib/taman-types";

/** Semua hewan v2: sprite 24×24 dengan 6 pose (lihat scripts/taman-animal-art.mjs). */
const ANIMALS: AnimalKey[] = [
  "kucing",
  "kelinci",
  "burung",
  "rubah",
  "beruang",
  "kura-kura",
  "kupu-kupu",
  "ikan",
];

/** Label pose per hewan; urutan harus cocok dengan 6 pose di generator. */
const POSES: Record<AnimalKey, string[]> = {
  kucing: ["idle", "idle-2", "jalan L", "jalan R", "lari 1", "lari 2"],
  kelinci: ["idle", "idle-2", "jalan L", "jalan R", "makan 1", "makan 2"],
  burung: ["idle", "idle-2", "jalan L", "jalan R", "terbang 1", "terbang 2"],
  rubah: ["idle", "idle-2", "jalan L", "jalan R", "pounce 1", "pounce 2"],
  beruang: ["idle", "idle-2", "jalan L", "jalan R", "duduk 1", "duduk 2"],
  "kura-kura": ["idle", "idle-2", "jalan L", "jalan R", "sembunyi 1", "sembunyi 2"],
  "kupu-kupu": ["idle", "idle-2", "jalan L", "jalan R", "terbang 1", "terbang 2"],
  ikan: ["idle", "idle-2", "renang L", "renang R", "berenang 1", "berenang 2"],
};

const VARIANTS: AnimalVariant[] = [
  "normal",
  "putih",
  "hitam",
  "coklat",
  "emas",
  "biru",
  "abu",
  "merah",
];

function tintHex(variant: AnimalVariant): string {
  const t = VARIANT_TINT[variant];
  if (t === null) return "#ffffff";
  return `#${t.toString(16).padStart(6, "0")}`;
}

/** Sprite sheet 24×24 → kotak per frame, dibesarkan, dengan filter tint warna. */
function Sheet({
  src,
  size,
  scale,
  tint,
  labels,
}: {
  src: string;
  size: number;
  scale: number;
  tint: string;
  labels: string[];
}) {
  const frames = labels.length;
  const shown = size * frames;
  return (
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: frames }).map((_, i) => (
        <div key={i} className="text-center">
          <div
            className="overflow-hidden rounded-lg border border-white/15 bg-[#1b1b28]"
            style={{ width: size * scale, height: size * scale }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              style={{
                width: shown * scale,
                height: size * scale,
                marginLeft: -i * size * scale,
                imageRendering: "pixelated",
                filter: tint === "#ffffff" ? undefined : `drop-shadow(0 0 0 ${tint})`,
              }}
            />
          </div>
          <p className="mt-1 text-[11px] whitespace-nowrap text-white/60">
            {labels[i] ?? `frame ${i + 1}`}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AsetPreview() {
  const [variant, setVariant] = useState<AnimalVariant>("normal");
  const [scale, setScale] = useState(6);
  const tint = tintHex(variant);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Warna:</span>
        {VARIANTS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariant(v)}
            aria-pressed={variant === v}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              variant === v ? "border-primary bg-primary text-white" : "border-white/20 text-white/80"
            }`}
          >
            {v}
          </button>
        ))}
        <span className="ml-4 text-sm font-semibold">Ukuran:</span>
        {[4, 6, 8].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScale(s)}
            aria-pressed={scale === s}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              scale === s ? "border-primary bg-primary text-white" : "border-white/20 text-white/80"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      <p className="text-xs text-white/60">
        Warna: <span className="font-semibold">{variant}</span> (tint {tint}). Semua hewan: 24×24 px, 6 pose.
      </p>

      {ANIMALS.map((a) => (
        <section key={a}>
          <h2 className="text-base font-bold capitalize">{a}</h2>
          <div className="mt-3">
            <Sheet
              src={`/taman/v2/animals/${a}.png`}
              size={24}
              scale={scale}
              tint={tint}
              labels={POSES[a]}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
