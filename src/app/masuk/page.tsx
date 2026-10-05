import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Heart, PackageCheck, Sparkles } from "lucide-react";
import { UserLoginForm } from "@/components/auth/user-login-form";
import { Logo } from "@/components/logo";
import { safeRedirectPath } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Masuk Akun",
  description:
    "Masuk ke akun LKTech Anda dengan Google untuk membeli produk dan mengelola pesanan.",
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    icon: PackageCheck,
    title: "Kelola pesanan",
    desc: "Riwayat, status, & unduhan produk digital Anda.",
  },
  {
    icon: Heart,
    title: "Favorit & alert",
    desc: "Simpan produk, dapat notifikasi harga turun/restock.",
  },
  {
    icon: Sparkles,
    title: "Poin & kupon",
    desc: "Kumpulkan poin tiap pembelian, tukar jadi kupon.",
  },
];

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  // Hanya terima path relatif internal (cegah open-redirect).
  const redirectTo = safeRedirectPath(rawNext);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4 py-10 sm:py-14">
      <div className="grid-lines absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[26rem] w-[26rem] animate-aurora rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] animate-aurora rounded-full bg-primary-light/15 blur-[120px] [animation-delay:-6s]" />

      {/* Card besar terpusat (2 panel) */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        <div className="grid lg:grid-cols-2">
          {/* ===== KIRI: Branding (gradient) ===== */}
          <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark p-8 text-white sm:p-10">
            {/* dekorasi glow */}
            <div className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center rounded-2xl bg-white px-3 py-2.5">
                <Logo variant="mark" href={null} height={26} />
              </span>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Website
              </Link>
            </div>

            <div className="relative mt-10 lg:mt-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
                ✨ Akun pelanggan LKTech
              </span>
              <h2 className="mt-5 text-3xl leading-tight font-bold sm:text-4xl">
                Mulai perjalanan digital Anda
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
                Satu akun untuk semua — cepat &amp; aman dengan Google, tanpa
                perlu bikin password baru.
              </p>
            </div>

            {/* Kartu langkah/keunggulan (vertikal, full-width) */}
            <div className="relative mt-10 flex flex-col gap-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="flex w-full items-center gap-3.5 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur transition-colors hover:bg-white/15"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold">
                        <Icon className="h-3.5 w-3.5 text-emerald-300" />
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-white/75">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ===== KANAN: Form ===== */}
          <div className="flex items-center p-8 sm:p-12">
            <UserLoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>
    </div>
  );
}
