"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAsyncList } from "@/components/admin/use-async-list";
import { fetchTaman, type TamanAdminItem } from "@/lib/admin-api";
import { pickSlots, slotCountFor } from "@/lib/taman-logic";
import { cn } from "@/lib/utils";

/**
 * Pratinjau frame (T6). Menampilkan pilihan gacha dari seluruh testimoni yang
 * disetujui TERMASUK contoh (diberi label). Ini hanya di halaman admin.
 * Frame publik interaktif dibangun di T7.
 */
export function TamanPreview() {
  const { data: items, loading } = useAsyncList<TamanAdminItem>(fetchTaman, "Gagal memuat.");
  // Hasil acak disimpan di state (dihitung saat klik, bukan saat render), agar render tetap murni.
  const [shown, setShown] = useState<TamanAdminItem[] | null>(null);
  // Jumlah slot diatur setelah mount (menghindari hydration mismatch, lihat §3.2).
  const [slots, setSlots] = useState(8);
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
    setShown(pickSlots(pool, slots, currentIds, Math.random));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted">
          {pool.length} testimoni tampil ({pool.filter((p) => p.kind === "sample").length} contoh). Slot: {slots}.
        </p>
        {pool.length > slots && (
          <button onClick={reroll} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white">
            <RefreshCw className="h-3.5 w-3.5" /> Acak lagi
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
        <ul className="grid grid-cols-2 gap-4 rounded-3xl border border-emerald-200 bg-gradient-to-b from-sky-100 to-emerald-100 p-6 sm:grid-cols-4" aria-label="Pratinjau testimoni">
          {current.map((t) => (
            <li key={t.id} className={cn("flex flex-col items-center gap-2 rounded-2xl bg-white/80 p-3 text-center shadow-sm")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/taman/animals/${t.animal}.svg`} alt="" width={64} height={64} className="h-16 w-16" />
              <p className="text-xs font-bold text-secondary">{t.displayName}</p>
              {t.kind === "sample" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">CONTOH</span>}
              <p className="line-clamp-3 text-[11px] text-slate-600">{t.quote}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
