"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getIdToken, signOutUser } from "@/lib/auth";

type CheckState = "checking" | "allowed" | "denied";

/**
 * Melindungi halaman dashboard:
 * 1. Bila belum login → redirect ke /admin/login.
 * 2. Bila login tapi bukan admin → tampilkan pesan "tidak punya akses".
 * Menampilkan indikator loading selama status auth/keanggotaan belum diketahui.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [check, setCheck] = useState<CheckState>("checking");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/admin/login");
    }
  }, [loading, user, router]);

  // Verifikasi keanggotaan admin via API (endpoint memvalidasi token ke
  // Firebase & mencocokkan dengan whitelist ADMIN_EMAILS).
  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/admin/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!active) return;
        setCheck(res.ok ? "allowed" : "denied");
      } catch {
        if (active) setCheck("denied");
      }
    })();
    return () => {
      active = false;
    };
  }, [loading, user]);

  if (loading || (user && check === "checking")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memeriksa sesi...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (check === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldX className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-lg font-bold text-secondary">
            Tidak punya akses
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Akun <span className="font-semibold">{user.email}</span> tidak
            terdaftar sebagai admin. Hubungi pemilik situs untuk mendapatkan
            akses, atau masuk dengan akun admin yang benar.
          </p>
          <button
            onClick={async () => {
              await signOutUser();
              router.replace("/admin/login");
            }}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
          >
            Keluar &amp; masuk ulang
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
