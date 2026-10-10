"use client";

import { ANIMAL_LABEL, ANIMAL_VARIANTS, VARIANT_LABEL, type AnimalKey, type AnimalVariant } from "@/lib/taman-types";
import { V2_VARIANT_TINT } from "@/lib/taman-logic";
import { cn } from "@/lib/utils";

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

/** Filter CSS untuk meniru tint Phaser pada sprite monokrom terang. */
function tintFilter(variant: AnimalVariant): string | undefined {
  const hex = V2_VARIANT_TINT[variant];
  return hex ? `drop-shadow(0 0 0 ${hex})` : undefined;
}

/** Frame pertama (idle) dari sprite sheet 6-pose 24×24 → tampil di kotak. */
export function AnimalSprite({
  animal,
  variant,
  size = 48,
}: {
  animal: AnimalKey;
  variant: AnimalVariant;
  size?: number;
}) {
  const frameCount = 6;
  const shown = 24 * frameCount;
  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-200 bg-[#1b1b28]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/taman/v2/animals/${animal}.png`}
        alt=""
        style={{
          width: (shown / 24) * size,
          height: size,
          imageRendering: "pixelated",
          filter: tintFilter(variant),
        }}
      />
    </div>
  );
}

/**
 * Pemilih hewan + warna dengan pratinjau tint langsung (V2-3).
 * Dipakai di halaman `/taman/tulis` dan (nanti) dashboard admin V2-7.
 */
export function AnimalPicker({
  animal,
  variant,
  onAnimal,
  onVariant,
}: {
  animal: AnimalKey;
  variant: AnimalVariant;
  onAnimal: (a: AnimalKey) => void;
  onVariant: (v: AnimalVariant) => void;
}) {
  const variants = ANIMAL_VARIANTS[animal];

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold text-secondary">Hewan &amp; warna di taman</legend>

      <div
        role="radiogroup"
        aria-label="Pilih hewan"
        className="grid grid-cols-4 gap-2 sm:grid-cols-8"
      >
        {ANIMALS.map((a) => {
          const selected = a === animal;
          return (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={ANIMAL_LABEL[a]}
              onClick={() => onAnimal(a)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border p-2 transition",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-slate-200 bg-white hover:border-primary/40",
              )}
            >
              <AnimalSprite animal={a} variant={a === animal ? variant : "normal"} size={40} />
              <span className="text-[10px] font-medium text-secondary">{ANIMAL_LABEL[a]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-secondary">Warna hewan</span>
        <div role="radiogroup" aria-label="Pilih warna" className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const selected = v === variant;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onVariant(v)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition",
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-white text-secondary hover:border-primary/40",
                )}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/10"
                  style={{ backgroundColor: V2_VARIANT_TINT[v] ?? "#e8e8ee" }}
                  aria-hidden="true"
                />
                {VARIANT_LABEL[v]}
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
