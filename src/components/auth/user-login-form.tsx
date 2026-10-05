"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Mail, ShieldCheck } from "lucide-react";
import {
  getClientAuth,
  getIdToken,
  googleResetPasswordUrl,
  signInWithGoogle,
} from "@/lib/auth";
import { normalizeAuthError } from "@/lib/auth-errors";
import { useAuth } from "@/components/auth-provider";
import { GoogleIcon } from "@/components/auth/google-icon";
import { cn } from "@/lib/utils";

/**
 * Form login USER — khusus akun Google.
 *
 * Tidak ada registrasi email/password. Satu tombol utama membuka pemilih akun
 * Google.
 */
export function UserLoginForm({
  redirectTo = "/akun",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sudah login → langsung ke tujuan.
  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [loading, user, router, redirectTo]);

  /** Simpan profil (best-effort) lalu arahkan ke tujuan. */
  const finish = async () => {
    try {
      const token = await getIdToken();
      const current = getClientAuth()?.currentUser;
      if (token && current) {
        await fetch("/api/user/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            displayName: current.displayName ?? "",
            photoURL: current.photoURL ?? "",
          }),
        });
      }
    } catch {
      /* profil bersifat best-effort; jangan blokir login */
    }
    router.replace(redirectTo);
  };

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      await finish();
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center lg:text-left">
        <h1 className="text-2xl font-bold text-secondary sm:text-3xl">
          Masuk ke Akun
        </h1>
        <p className="mt-2 text-sm text-muted">
          Gunakan akun Google untuk melanjutkan pembelian &amp; mengelola akun.
        </p>
      </div>

      {/* Aksi utama: Google (full-width) */}
      <button
        onClick={onGoogle}
        disabled={busy}
        className="mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Lanjutkan dengan Google
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <a
          href={googleResetPasswordUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline",
          )}
        >
          <Mail className="h-3.5 w-3.5" />
          Lupa password? Pulihkan lewat Google
        </a>

        {/* Catatan admin (revisi: teks di atas, tautan di bawah) */}
        <div className="rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Akun user hanya untuk pelanggan. Login admin terpisah:
          </p>
          <a
            href="/admin/login"
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            Masuk sebagai admin →
          </a>
        </div>
      </div>
    </div>
  );
}
