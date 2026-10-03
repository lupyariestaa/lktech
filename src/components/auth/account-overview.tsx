"use client";

import Link from "next/link";
import {
  Heart,
  LogOut,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Tab "Ringkasan": profil ringkas, statistik, aksi cepat. */
export function AccountOverview({
  displayName,
  email,
  photoURL,
  initial,
  createdAt,
  orderCount,
  wishlistCount,
  onLogout,
  onGoTab,
}: {
  displayName: string;
  email: string;
  photoURL: string;
  initial: string;
  createdAt: string;
  orderCount: number;
  wishlistCount: number;
  onLogout: () => void;
  onGoTab: (tab: "pesanan" | "favorit") => void;
}) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ShoppingBag} label="Total Pesanan" value={`${orderCount}`} />
        <StatCard icon={Heart} label="Favorit" value={`${wishlistCount}`} />
        <StatCard icon={UserRound} label="Bergabung Sejak" value={createdAt} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-secondary">Profil Anda</h2>
          <div className="mt-4 flex items-center gap-4">
            {photoURL ? (
              // Avatar eksternal (Google) — pakai <img> sederhana agar tak perlu config host di sini.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt={displayName}
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-xl font-bold text-white">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-secondary">
                {displayName}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                <Mail className="h-3 w-3 shrink-0" />
                {email}
              </p>
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Terverifikasi via Google
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-secondary">Aksi Cepat</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            <button
              onClick={() => onGoTab("pesanan")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
            >
              <ShoppingBag className="h-4 w-4" />
              Lihat Pesanan Saya
            </button>
            <button
              onClick={() => onGoTab("favorit")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Heart className="h-4 w-4" />
              Lihat Favorit
            </button>
            <Link
              href="/produk"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Package className="h-4 w-4" />
              Jelajahi Produk
            </Link>
            <button
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-surface p-5")}>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-secondary">{value}</p>
    </div>
  );
}
