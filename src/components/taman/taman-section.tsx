"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/section-heading";
import { useReducedMotionPreference } from "@/lib/intro";
import { shouldShowFrame, type TamanPublicView } from "@/lib/taman-logic";
import { TamanClient } from "@/components/taman/taman-client";

/**
 * Seksi "Taman Testimoni" di beranda (T7). Mengambil daftar publik dari `/api/taman`
 * (whitelist server). Tidak tampil bila testimoni nyata < minimum (Q6) — termasuk
 * saat gagal memuat, agar tidak menampilkan kekosongan atau data palsu.
 */
export function TamanSection() {
  const reduced = useReducedMotionPreference();
  const [items, setItems] = useState<TamanPublicView[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/taman", { cache: "force-cache" });
        if (!res.ok) throw new Error("gagal");
        const data = (await res.json()) as { items: TamanPublicView[] };
        if (active) setItems(data.items);
      } catch {
        if (active) setItems([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Belum tahu (loading) atau tidak cukup data → tidak merender apa pun.
  if (items === null || !shouldShowFrame(items.length)) return null;

  return (
    <section id="taman-testimoni" className="relative scroll-mt-24 bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading
          eyebrow="Testimoni"
          title={
            <>
              Cerita dari <span className="text-gradient">taman klien kami</span>
            </>
          }
          description="Setiap hewan menyimpan testimoni dari klien nyata. Klik salah satu untuk membacanya."
        />
        <div className="mt-12">
          <TamanClient items={items} reducedMotion={reduced} />
        </div>
      </div>
    </section>
  );
}
