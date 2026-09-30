"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
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

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30";

/**
 * Form login USER — khusus akun Google.
 *
 * Tidak ada registrasi email/password. Tombol utama membuka pemilih akun
 * Google; kolom email manual hanya mengarahkan (login hint) ke akun Google
 * tersebut, bukan membuat akun password.
 */
export function UserLoginForm({
  redirectTo = "/akun",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
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

  const onGoogle = async (emailHint?: string) => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle(emailHint);
      await finish();
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Masukkan email Google Anda.");
      return;
    }
    // Arahkan ke alur Google untuk email tersebut (login hint), bukan
    // email/password. Pemisahan kode ini menegaskan akun user selalu Google.
    await onGoogle(email);
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-bold text-white shadow-lg shadow-primary/30">
          LK
        </span>
        <h1 className="mt-5 text-xl font-bold text-secondary">
          Masuk ke Akun Anda
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Gunakan akun Google untuk melanjutkan pembelian &amp; mengelola
          akun.
        </p>
      </div>

      <button
        onClick={() => onGoogle()}
        disabled={busy}
        className="mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-secondary transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Lanjutkan dengan Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-muted">atau ketik email Google Anda</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-secondary">
            Email Google
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@gmail.com"
            autoComplete="email"
            className={fieldBase}
          />
        </label>

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark disabled:opacity-70"
        >
          <ArrowRight className="h-4 w-4" />
          Lanjutkan
        </button>
      </form>

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

        <p className="flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Akun user hanya untuk pelanggan. Login admin terpisah di{" "}
          <a href="/admin/login" className="font-semibold text-primary">
            /admin/login
          </a>
          .
        </p>
      </div>
    </div>
  );
}
