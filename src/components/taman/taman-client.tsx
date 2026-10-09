"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { pickSlots, slotCountFor, type TamanPublicView } from "@/lib/taman-logic";
import { TAMAN_ANIMALS, type AnimalKey } from "@/lib/taman-types";
import { cn } from "@/lib/utils";
import { TamanAnimal } from "@/components/taman/taman-animal";
import { TamanCard, DESKTOP_MIN_WIDTH } from "@/components/taman/taman-card";
import { trackTamanOpen, trackTamanRefresh } from "@/lib/analytics";

/** Posisi slot dalam frame (persen). Urutan = urutan fokus keyboard. */
const SLOT_POSITIONS: Array<{ left: number; top: number }> = [
  { left: 14, top: 62 },
  { left: 36, top: 70 },
  { left: 60, top: 64 },
  { left: 84, top: 72 },
  { left: 24, top: 36 },
  { left: 50, top: 42 },
  { left: 74, top: 36 },
  { left: 50, top: 80 },
];

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
 * Frame taman interaktif (T7). Klien: jumlah slot per device, gacha "Acak lagi",
 * kartu popover (desktop) atau bottom sheet (mobile), dan keyboard.
 * Data (`items`) sudah whitelist dari server; komponen ini tidak menerima field privat.
 */
export function TamanClient({
  items,
  reducedMotion,
}: {
  items: TamanPublicView[];
  reducedMotion: boolean;
}) {
  // Jumlah slot diatur setelah mount agar server & klien awal sama (tanpa hydration mismatch).
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

  // Pool: seluruh testimoni publik. Sebelum acak, tampilkan urutan `order` (sudah dari server).
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
    // Animasi acak: kedip singkat, lalu set baru muncul (§3.3).
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

  // Roving tabindex: satu hewan dapat Tab; panah berpindah antar hewan.
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

  if (shown.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Klik hewan untuk membaca testimoninya.</p>
        {canReroll && (
          <button
            type="button"
            onClick={reroll}
            disabled={shuffling}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/30 bg-white px-4 text-xs font-semibold text-primary hover:bg-primary-50 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", shuffling && "motion-safe:animate-spin")} aria-hidden="true" />
            Acak lagi
          </button>
        )}
      </div>

      <div
        ref={frameRef}
        role="group"
        aria-label="Taman testimoni"
        onKeyDown={onFrameKey}
        className={cn(
          "relative w-full overflow-visible rounded-3xl border-4 border-secondary bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-200",
          "aspect-[4/5] sm:aspect-[16/9]",
          "shadow-[6px_6px_0_0_rgba(10,15,30,0.85)]",
        )}
        style={{ imageRendering: "pixelated" }}
      >
        {/* Latar dekoratif (pixel): tanah & pagar. Tidak dibacakan (alt=""). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-[url('/taman/bg-tanah.svg')] bg-[length:auto_100%] bg-repeat-x [image-rendering:pixelated]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[20%] h-[12%] bg-[url('/taman/pagar.svg')] bg-[length:auto_100%] bg-repeat-x opacity-90 [image-rendering:pixelated]" />

        {shown.map((t, i) => {
          const pos = SLOT_POSITIONS[i] ?? SLOT_POSITIONS[0];
          const animal: AnimalKey = TAMAN_ANIMALS.includes(t.animal) ? t.animal : "kucing";
          return (
            <TamanAnimal
              key={t.id}
              animal={animal}
              label={label(t)}
              left={pos.left}
              top={pos.top}
              active={openId === t.id}
              shuffling={shuffling}
              tabIndex={i === focusIndex ? 0 : -1}
              onFocusSlot={() => setFocusIndex(i)}
              buttonRef={(el) => {
                btnRefs.current[i] = el;
              }}
              onActivate={() => {
                const opening = openId !== t.id;
                if (opening) trackTamanOpen({ animal, index: i, via: "klik" });
                setOpenId(openId === t.id ? null : t.id);
              }}
            />
          );
        })}

        {open && (
          <TamanCard
            item={open}
            index={openIndex}
            total={shown.length}
            mode={isSheet ? "sheet" : "popover"}
            anchor={isSheet ? undefined : SLOT_POSITIONS[openIndex] ?? SLOT_POSITIONS[0]}
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
      </div>

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
