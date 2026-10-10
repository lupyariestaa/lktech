import type { Metadata } from "next";
import { TamanTulisForm } from "@/components/taman/taman-tulis-form";

export const metadata: Metadata = {
  title: "Tulis Testimoni",
  description: "Bagikan pengalaman Anda bekerja dengan LKTech. Pilih hewan & warnanya, testimoni ditampilkan setelah ditinjau.",
  alternates: { canonical: "/taman/tulis" },
  robots: { index: false, follow: true },
};

export default function TamanTulisPage() {
  return (
    <section className="relative min-h-screen bg-surface px-4 py-24 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">Testimoni</p>
        <h1 className="mt-2 text-3xl font-bold text-secondary">Tulis testimoni Anda</h1>
        <p className="mt-2 text-sm text-muted">
          Masuk dengan akun Google. Pilih hewan &amp; warnanya untuk tampil di Taman. Testimoni akan live setelah kami tinjau
          dan Anda setujui.
        </p>
        <div className="mt-8">
          <TamanTulisForm />
        </div>
      </div>
    </section>
  );
}
