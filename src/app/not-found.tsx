import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main
        id="konten"
        className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-surface px-6 py-32"
      >
        <div className="grid-lines absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -top-24 -left-24 h-[26rem] w-[26rem] animate-aurora rounded-full bg-primary/15 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] animate-aurora rounded-full bg-primary-light/15 blur-[120px] [animation-delay:-6s]" />

        <div className="relative mx-auto max-w-xl text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-50 text-primary">
            <Search className="h-8 w-8" />
          </span>
          <p className="mt-6 text-sm font-semibold tracking-widest text-primary uppercase">
            404
          </p>
          <h1 className="mt-2 text-3xl font-bold text-secondary sm:text-4xl">
            Halaman tidak ditemukan
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Halaman yang Anda cari mungkin sudah dipindahkan atau tidak pernah
            ada. Silakan kembali ke beranda atau jelajahi layanan kami.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
            >
              <Home className="h-4 w-4" />
              Ke Beranda
            </Link>
            <Link
              href="/layanan"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-secondary backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Lihat Layanan
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
