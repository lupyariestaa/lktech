import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Heart, Lock, PackageCheck, Sparkles } from "lucide-react";
import { UserLoginForm } from "@/components/auth/user-login-form";
import { Logo } from "@/components/logo";
import { safeRedirectPath } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Masuk Akun",
  description:
    "Masuk ke akun LKTech Anda dengan Google untuk membeli produk dan mengelola pesanan.",
  robots: { index: false, follow: false },
};

const BENEFITS = [
  {
    icon: PackageCheck,
    title: "Kelola pesanan & unduhan",
    desc: "Lihat riwayat, status pesanan, dan unduh produk digital Anda kapan saja.",
  },
  {
    icon: Heart,
    title: "Favorit & alert harga",
    desc: "Simpan produk favorit dan dapat notifikasi saat harga turun atau restock.",
  },
  {
    icon: Sparkles,
    title: "Poin & kupon loyalitas",
    desc: "Kumpulkan poin dari tiap pembelian dan tukar jadi kupon diskon.",
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
    <div className="relative min-h-screen overflow-hidden bg-surface">
      <div className="grid-lines absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[26rem] w-[26rem] animate-aurora rounded-full bg-primary/15 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-stretch">
        {/* ===== KIRI: Form login ===== */}
        <div className="flex flex-1 items-center justify-center px-6 py-16 lg:py-20">
          <div className="flex w-full flex-col items-center">
            <UserLoginForm redirectTo={redirectTo} />
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke website
            </Link>
          </div>
        </div>

        {/* ===== KANAN: Brand + keunggulan (desktop) ===== */}
        <aside className="relative hidden lg:flex lg:w-[46%] lg:items-center lg:p-6">
          <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-dark p-10 text-white shadow-2xl shadow-primary/20">
            {/* dekorasi */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

            <div className="relative">
              {/* Logo putih: bungkus agar terlihat di latar gelap */}
              <span className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5">
                <Logo variant="full" href={null} height={30} />
              </span>

              <h2 className="mt-8 text-3xl leading-tight font-bold">
                Satu akun untuk semua kebutuhan digital Anda.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
                Masuk dengan Google — cepat, aman, tanpa perlu bikin password baru.
              </p>
            </div>

            <ul className="relative mt-10 flex flex-col gap-5">
              {BENEFITS.map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.title} className="flex items-start gap-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {b.title}
                        <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/75">
                        {b.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="relative mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white/10 p-4 text-xs font-medium text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-300" />
                Pembayaran aman
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PackageCheck className="h-3.5 w-3.5 text-emerald-300" />
                Unduhan otomatis
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                Akun aman via Google
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
