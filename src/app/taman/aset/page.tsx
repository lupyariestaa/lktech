import type { Metadata } from "next";
import { AsetPreview } from "@/components/taman/aset-preview";

export const metadata: Metadata = {
  title: "Pratinjau Aset Taman",
  robots: { index: false, follow: false },
};

/**
 * Halaman pratinjau aset sprite (V2-2). Bukan bagian publik: untuk memeriksa
 * bentuk hewan, pose animasi, dan hasil tint warna sebelum diintegrasikan ke kanvas.
 */
export default function AsetTamanPage() {
  return (
    <section className="min-h-screen bg-secondary px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-xl font-bold">Pratinjau Aset Taman v2</h1>
        <p className="mt-1 text-sm text-white/70">
          Sprite 24×24, 6 pose per hewan (idle, idle-2, jalan kiri, jalan kanan, aksi 1, aksi 2).
          Warna di bawah adalah hasil tint, seperti nanti di kanvas.
        </p>
        <AsetPreview />
      </div>
    </section>
  );
}
