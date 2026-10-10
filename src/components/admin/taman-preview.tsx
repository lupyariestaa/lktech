"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAsyncList } from "@/components/admin/use-async-list";
import { fetchTaman, type TamanAdminItem } from "@/lib/admin-api";
import { pickSlots, slotCountFor } from "@/lib/taman-logic";
import { ANIMAL_LABEL, VARIANT_LABEL } from "@/lib/taman-types";
import { TamanPhaser } from "@/components/taman/taman-phaser";
import { cn } from "@/lib/utils";

/**
 * Pratinjau kanvas NYATA (V2-7). Memakai kanvas Phaser sesungguhnya (`TamanPhaser`),
 * termasuk tombol acak pool. Menampilkan testimoni TERBIT + contoh (sample diberi
 * label) — hanya di halaman admin. Klik hewan menandai nama di bawah kanvas.
 */
export function TamanPreview() {
  const { data: items, loading } = useAsyncList<TamanAdminItem>(fetchTaman, "Gagal memuat.");
  // Hasil acak disimpan di state (dihitung saat klik, bukan saat render).
  const [shown, setShown] = useState<TamanAdminItem[] | null>(null);
  const [slots, setSlots] = useState(8);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const apply = () => setSlots(slotCountFor(window.innerWidth));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const pool = useMemo(() => items.filter((i) => i.status === "published"), [items]);
  const current = shown ?? pickSlots(pool, slots, [], Math.random);

  // Set yang sedang tampil dijadikan "recent" agar set berikutnya berbeda (bobot kecil, §3.3).
  const reroll = () => {
    const currentIds = current.map((s) => s.id);
    setPicked(null);
    setShown(pickSlots(pool, slots, currentIds, Math.random));
  };

  const pickedItem = current.find((c) => c.id === picked) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted">
          {pool.length} testimoni tampil ({pool.filter((p) => p.kind === "sample").length} contoh). Slot: {slots}.
        </p>
        {pool.length > slots && (
          <button
            onClick={reroll}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Acak pool
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted">Memuat...</p>
      ) : current.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-muted">
          Belum ada testimoni yang tampil. Terbitkan testimoni atau buat contoh (lokal) dulu.
        </p>
      ) : (
        <>
          {/* Kanvas Phaser nyata — seperti yang tampil di publik. */}
          <div
            className="relative h-[60vh] min-h-[380px] w-full overflow-hidden rounded-3xl border-2 border-secondary bg-gradient-to-b from-sky-200 to-emerald-200"
            style={{ imageRendering: "pixelated" }}
          >
            <TamanPhaser
              animals={current.map((t) => ({ id: t.id, animal: t.animal, variant: t.variant }))}
              reducedMotion={false}
              onPick={(id) => setPicked((p) => (p === id ? null : id))}
            />
          </div>

          {pickedItem && (
            <div className="rounded-2xl border border-primary/30 bg-primary-50 p-4 text-sm">
              <p className="font-bold text-secondary">{pickedItem.displayName}</p>
              <p className="text-xs text-muted">{pickedItem.role}</p>
              <p className="mt-2 text-xs text-slate-700">
                {ANIMAL_LABEL[pickedItem.animal]} · {VARIANT_LABEL[pickedItem.variant]} — {pickedItem.rating} bintang
              </p>
            </div>
          )}

          {/* Ringkasan hewan yang tampil (dengan warna). */}
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Hewan dalam pratinjau">
            {current.map((t) => (
              <li
                key={t.id}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border bg-white p-2.5 text-xs",
                  picked === t.id ? "border-primary" : "border-slate-200",
                )}
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", t.kind === "sample" ? "bg-amber-400" : "bg-emerald-500")} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-semibold text-secondary">{t.displayName}</span>
                <span className="shrink-0 text-[10px] text-muted">
                  {ANIMAL_LABEL[t.animal]} {VARIANT_LABEL[t.variant]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
