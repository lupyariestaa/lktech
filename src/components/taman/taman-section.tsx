"use client";

import { useEffect, useState } from "react";
import { useReducedMotionPreference } from "@/lib/intro";
import { shouldShowFrame, type TamanPublicView } from "@/lib/taman-logic";
import { TamanClient } from "@/components/taman/taman-client";
import { pixel } from "@/components/taman/taman-font";

/**
 * Seksi "Taman Testimoni" di beranda (V2-4). Full-bleed (100% × 100dvh), tanpa
 * padding luar. Badge/judul/deskripsi dipindah **ke dalam frame** memakai font
 * pixel. Heading asli tetap di DOM (h2 `sr-only`) untuk SEO — crawler tetap
 * membaca judul & deskripsi walau tampilannya di dalam frame.
 *
 * Data diambil dari `/api/taman` (whitelist server). Tidak tampil bila testimoni
 * nyata < minimum (Q6) — termasuk saat gagal memuat.
 */
export function TamanSection() {
  const reduced = useReducedMotionPreference();
  const [items, setItems] = useState<TamanPublicView[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // `no-store`: jangan simpan di cache browser (cache CDN ditangani `/api/taman`).
        const res = await fetch("/api/taman", { cache: "no-store" });
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

  const show = items !== null && shouldShowFrame(items.length);

  // Tidak cukup data → tidak merender apa pun (heading DOM pun tidak). Data masih
  // dimuat → sisakan seksi kosong agar tidak ada lompatan layout (opsional).
  if (items === null) return null;
  if (!show) return null;

  return (
    <section
      id="taman-testimoni"
      className={`relative w-full scroll-mt-0 ${pixel.variable}`}
      aria-labelledby="taman-testimoni-heading"
    >
      {/* Heading asli untuk SEO & screen reader (visual judul ada di dalam frame). */}
      <div className="sr-only">
        <h2 id="taman-testimoni-heading">Cerita dari taman klien kami</h2>
        <p>
          Setiap hewan menyimpan testimoni dari klien nyata LKTech. Pilih salah satu untuk membacanya, atau tulis
          testimoni Anda sendiri.
        </p>
      </div>

      <div className="relative h-[100dvh] min-h-[560px] w-full overflow-hidden">
        <TamanClient
          items={items}
          reducedMotion={reduced}
          pixelClassName="font-[family-name:var(--font-taman-pixel)]"
          title="Taman Klien"
          description="Cerita nyata dari klien yang membangun bersama LKTech."
          writeHref="/taman/tulis"
        />
      </div>
    </section>
  );
}
