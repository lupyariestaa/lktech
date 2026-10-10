"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, RefreshCw } from "lucide-react";
import { pickSlots, slotCountFor, type TamanPublicView } from "@/lib/taman-logic";
import { cn } from "@/lib/utils";
import { TamanCard, DESKTOP_MIN_WIDTH } from "@/components/taman/taman-card";
import { TamanPhaser } from "@/components/taman/taman-phaser";
import { trackTamanOpen, trackTamanRefresh } from "@/lib/analytics";

/** Riwayat sesi: testimoni yang baru tampil (bobot kecil saat gacha, §3.3). */
const SESSION_KEY = "taman:recent";

function readRecent(): string[] {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeRecent(ids: string[]) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids));
  } catch {
    /* penyimpanan diblokir: abaikan */
  }
}

/**
 * Frame taman interaktif (V2-4/V2-5). Visual peta & hewan digambar oleh kanvas
 * Phaser (`TamanPhaser`, dynamic import). Judul, tombol, dan kartu testimoni tetap
 * DOM di atas kanvas. Navigasi keyboard & screen reader memakai tombol `sr-only`
 * (jalur penuh), karena isi kanvas tidak terbaca pembaca layar.
 */
export function TamanClient({
  items,
  reducedMotion,
  pixelClassName,
  title,
  description,
  writeHref,
}: {
  items: TamanPublicView[];
  reducedMotion: boolean;
  pixelClassName?: string;
  title: string;
  description: string;
  writeHref: string;
}) {
  const [slots, setSlots] = useState(8);
  const [width, setWidth] = useState(DESKTOP_MIN_WIDTH);
  useEffect(() => {
    const apply = () => {
      setSlots(slotCountFor(window.innerWidth));
      setWidth(window.innerWidth);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const [shownIds, setShownIds] = useState<string[] | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Posisi hewan di kanvas (px, relatif kanvas) → untuk anchor popover kartu.
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  // Ukuran kanvas (untuk konversi px → persen frame) — disimpan sebagai state.
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const host = frameRef.current;
    if (!host) return;
    const measure = () => setFrameSize({ w: host.clientWidth, h: host.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const shown: TamanPublicView[] = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    if (shownIds) {
      return shownIds.map((id) => byId.get(id)).filter((x): x is TamanPublicView => Boolean(x));
    }
    return items.slice(0, slots);
  }, [items, shownIds, slots]);

  const canReroll = items.length > slots;

  const reroll = () => {
    if (!canReroll) return;
    const recent = readRecent();
    const currentIds = shown.map((s) => s.id);
    const next = pickSlots(items, slots, Array.from(new Set([...recent, ...currentIds])), Math.random);
    writeRecent(currentIds);
    trackTamanRefresh({ pool: items.length, slots });
    setOpenId(null);
    if (reducedMotion) {
      setShownIds(next.map((n) => n.id));
      return;
    }
    setShuffling(true);
    window.setTimeout(() => {
      setShownIds(next.map((n) => n.id));
      setShuffling(false);
    }, 500);
  };

  const open = shown.find((s) => s.id === openId) ?? null;
  const openIndex = open ? shown.findIndex((s) => s.id === open.id) : -1;
  const isSheet = width < DESKTOP_MIN_WIDTH;

  const go = (dir: -1 | 1) => {
    if (openIndex < 0 || shown.length <= 1) return;
    const n = (openIndex + dir + shown.length) % shown.length;
    setOpenId(shown[n].id);
  };

  // Roving tabindex untuk jalur keyboard (tombol sr-only).
  const onFrameKey = (e: React.KeyboardEvent) => {
    if (openId) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
    const next = (focusIndex + dir + shown.length) % shown.length;
    setFocusIndex(next);
    btnRefs.current[next]?.focus();
  };

  const label = (t: TamanPublicView) => `Testimoni dari ${t.displayName}, ${t.role}, ${t.rating} bintang`;

  /** Anchor popover (persen frame) dari posisi hewan di kanvas. */
  const anchorOf = (id: string): { left: number; top: number } | undefined => {
    const p = positions[id];
    if (!p || frameSize.w === 0 || frameSize.h === 0) return undefined;
    return { left: (p.x / frameSize.w) * 100, top: (p.y / frameSize.h) * 100 };
  };

  if (shown.length === 0) return null;

  return (
    <div
      ref={frameRef}
      role="group"
      aria-label="Taman testimoni"
      onKeyDown={onFrameKey}
      className="relative h-full w-full overflow-hidden border-y-4 border-secondary bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-200"
      style={{ imageRendering: "pixelated" }}
    >
      {/* Kanvas Phaser (visual peta & hewan). */}
      <TamanPhaser
        animals={shown.map((t) => ({ id: t.id, animal: t.animal, variant: t.variant }))}
        reducedMotion={reducedMotion}
        onPick={(id) => {
          const t = shown.find((s) => s.id === id);
          if (t) {
            if (openId !== id) trackTamanOpen({ animal: t.animal, index: shown.indexOf(t), via: "klik" });
            setOpenId(openId === id ? null : id);
          }
        }}
        onFrame={(pos) => {
          const next: Record<string, { x: number; y: number }> = {};
          for (const p of pos) next[p.id] = { x: p.x, y: p.y };
          setPositions(next);
        }}
      />

      {/* Judul & kontrol di DALAM frame (tengah atas). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 px-4 pt-6 text-center">
        <span
          className={cn(
            "pointer-events-auto rounded-full border-2 border-secondary bg-white/90 px-3 py-1 text-[10px] font-bold tracking-wider text-secondary uppercase shadow-[2px_2px_0_0_rgba(10,15,30,0.9)]",
            pixelClassName,
          )}
        >
          Testimoni
        </span>
        <h3
          className={cn(
            "pointer-events-auto text-lg leading-tight text-secondary drop-shadow-[2px_2px_0_rgba(255,255,255,0.9)] sm:text-2xl",
            pixelClassName,
          )}
        >
          {title}
        </h3>
        <p className="pointer-events-auto max-w-md text-xs text-secondary/80 sm:text-sm">{description}</p>
      </div>

      {/* Kontrol bawah di DALAM frame: tulis testimoni + acak lagi. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-2 p-4">
        <Link
          href={writeHref}
          className={cn(
            "pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-secondary bg-primary px-4 text-[11px] font-bold text-white shadow-[3px_3px_0_0_rgba(10,15,30,0.9)] hover:bg-primary-dark",
            pixelClassName,
          )}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Tulis testimoni
        </Link>
        {canReroll && (
          <button
            type="button"
            onClick={reroll}
            disabled={shuffling}
            className={cn(
              "pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-secondary bg-white px-4 text-[11px] font-bold text-secondary shadow-[3px_3px_0_0_rgba(10,15,30,0.9)] hover:bg-slate-50 disabled:opacity-60",
              pixelClassName,
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", shuffling && "motion-safe:animate-spin")} aria-hidden="true" />
            Acak lagi
          </button>
        )}
      </div>

      {/* Jalur keyboard & screen reader: tombol tak terlihat untuk tiap hewan. */}
      <div className="sr-only">
        Klik hewan untuk membaca testimoni. Gunakan tombol berikut.
        {shown.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            tabIndex={i === focusIndex ? 0 : -1}
            aria-label={label(t)}
            aria-pressed={openId === t.id}
            onFocus={() => setFocusIndex(i)}
            onClick={() => {
              if (openId !== t.id) trackTamanOpen({ animal: t.animal, index: i, via: "keyboard" });
              setOpenId(openId === t.id ? null : t.id);
            }}
          >
            {t.displayName} — {t.role} — {t.rating} bintang
          </button>
        ))}
      </div>

      {open && (
        <TamanCard
          item={open}
          index={openIndex}
          total={shown.length}
          mode={isSheet ? "sheet" : "popover"}
          anchor={isSheet ? undefined : anchorOf(open.id)}
          onClose={() => {
            const id = open.id;
            setOpenId(null);
            requestAnimationFrame(() => {
              const idx = shown.findIndex((s) => s.id === id);
              btnRefs.current[idx]?.focus();
            });
          }}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
        />
      )}

      {/* Teks lengkap untuk pembaca layar dan crawler (tidak terlihat). */}
      <ul className="sr-only">
        {shown.map((t) => (
          <li key={t.id}>
            {t.displayName} ({t.role}), {t.rating} bintang: {t.quote}
          </li>
        ))}
      </ul>
    </div>
  );
}
