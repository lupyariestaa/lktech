import type { Metadata } from "next";
import { TamanSubmitForm } from "@/components/taman/taman-submit-form";

export const metadata: Metadata = {
  title: "Tulis Testimoni",
  description: "Bagikan pengalaman Anda bekerja dengan LKTech. Testimoni ditampilkan setelah ditinjau.",
  alternates: { canonical: "/taman/kirim" },
  robots: { index: false, follow: true },
};

export default function TamanKirimPage() {
  return (
    <section className="relative min-h-screen bg-surface px-4 py-24 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">Testimoni</p>
        <h1 className="mt-2 text-3xl font-bold text-secondary">Tulis testimoni Anda</h1>
        <p className="mt-2 text-sm text-muted">
          Masuk dengan akun Google. Testimoni akan tampil di situs setelah kami tinjau dan Anda setujui.
        </p>
        <div className="mt-8">
          <TamanSubmitForm />
        </div>
      </div>
    </section>
  );
}
