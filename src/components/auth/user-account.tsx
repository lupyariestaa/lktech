"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LogOut,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getIdToken, signOutUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/user-types";
import { cn } from "@/lib/utils";

/** Halaman akun user: profil, statistik, dan aksi keluar. */
export function UserAccount() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/user/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Gagal memuat profil.");
        const data = await res.json();
        if (active) setProfile(data.profile ?? null);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Gagal memuat profil.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onLogout = async () => {
    await signOutUser();
    router.replace("/");
  };

  const displayName =
    profile?.displayName || user?.displayName || "Pengguna LKTech";
  const email = profile?.email || user?.email || "";
  const photoURL = profile?.photoURL || user?.photoURL || "";
  const initial = (displayName || email || "U").charAt(0).toUpperCase();
  const createdAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-28">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
          {photoURL ? (
            <Image
              src={photoURL}
              alt={displayName}
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-2xl object-cover"
            />
          ) : (
            <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-2xl font-bold text-white">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-secondary">{displayName}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted sm:justify-start">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Terverifikasi via Google
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={ShoppingBag}
            label="Total Pembelian"
            value={loading ? "…" : `${profile?.orderCount ?? 0}`}
          />
          <StatCard icon={UserRound} label="Bergabung Sejak" value={createdAt} />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/produk"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            <Package className="h-4 w-4" />
            Jelajahi Produk
          </Link>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Memuat profil...
        </div>
      )}
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
