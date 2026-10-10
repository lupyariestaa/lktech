"use client";

import { useEffect, useRef } from "react";
import { startTamanPhaser, type AnimalSpec } from "@/components/taman/taman-scene";

/**
 * Kanvas Phaser Taman (V2-5). Komponen ini **hanya** di-render sebagai klien dan
 * memuat Phaser secara dinamis (`startTamanPhaser` → `await import("phaser")`),
 * sehingga halaman lain yang tidak memakai kanvas tidak ikut mengunduh Phaser.
 *
 * `items` (hewan + varian) berasal dari React; klik hewan → `onPick(id)`.
 */
export function TamanPhaser({
  animals,
  reducedMotion,
  onPick,
  onFrame,
}: {
  animals: AnimalSpec[];
  reducedMotion: boolean;
  onPick: (id: string) => void;
  onFrame?: (positions: Array<{ id: string; x: number; y: number }>) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  const onFrameRef = useRef(onFrame);

  // Sinkronkan callback terbaru lewat effect (bukan saat render).
  useEffect(() => {
    onPickRef.current = onPick;
    onFrameRef.current = onFrame;
  }, [onPick, onFrame]);

  // Kunci animals sebagai string agar efek tidak re-run tiap render.
  const key = animals.map((a) => `${a.id}:${a.animal}:${a.variant}`).join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dispose: (() => void) | null = null;
    let cancelled = false;

    startTamanPhaser({
      parent: host,
      animals,
      reducedMotion,
      onPick: (id) => onPickRef.current(id),
      onFrame: (positions) => onFrameRef.current?.(positions),
    })
      .then((d) => {
        if (cancelled) {
          d();
          return;
        }
        dispose = d;
      })
      .catch(() => {
        /* gagal memuat Phaser: kanvas kosong, teks sr-only tetap bekerja */
      });

    return () => {
      cancelled = true;
      dispose?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reducedMotion]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
      aria-hidden="true"
    />
  );
}
