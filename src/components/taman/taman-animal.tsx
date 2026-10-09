"use client";

import type { AnimalKey } from "@/lib/taman-types";
import { cn } from "@/lib/utils";

/**
 * Satu hewan di frame (T7). Button agar bisa difokus & diaktifkan keyboard.
 * Posisi di frame ditentukan `left`/`top` (persen). Animasi idle/hover via CSS;
 * `motion-reduce` mematikannya (Q10).
 */
export function TamanAnimal({
  animal,
  label,
  left,
  top,
  active,
  shuffling,
  onActivate,
  onFocusSlot,
  tabIndex,
  buttonRef,
}: {
  animal: AnimalKey;
  label: string;
  left: number;
  top: number;
  active: boolean;
  shuffling: boolean;
  onActivate: () => void;
  onFocusSlot?: () => void;
  tabIndex: number;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onActivate}
      onFocus={onFocusSlot}
      tabIndex={tabIndex}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded-md p-1",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        // Hover/fokus: lompat kecil via `taman-hop`; idle via `taman-idle`. Keduanya mati di reduced-motion.
        "motion-safe:animate-taman-idle motion-safe:hover:animate-taman-hop motion-safe:focus-visible:animate-taman-hop",
        active && "ring-2 ring-primary",
        shuffling && "motion-safe:animate-taman-shuffle",
      )}
      style={{ left: `${left}%`, top: `${top}%`, width: "clamp(56px, 11vw, 96px)", height: "clamp(56px, 11vw, 96px)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/taman/animals/${animal}.svg`} alt="" className="h-full w-full [image-rendering:pixelated]" draggable={false} />
    </button>
  );
}
