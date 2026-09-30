"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AlertCircle, Loader2, LogIn, Mail } from "lucide-react";
import { getClientAuth, signInWithGoogle } from "@/lib/auth";
import { normalizeAuthError } from "@/lib/auth-errors";
import { useAuth } from "@/components/auth-provider";
import { GoogleIcon } from "@/components/auth/google-icon";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30";

export function LoginForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bila sudah login, langsung ke dashboard.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/admin/leads");
    }
  }, [loading, user, router]);

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace("/admin/leads");
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = getClientAuth();
      if (!auth) throw new Error("Firebase belum dikonfigurasi.");
      // Hanya login — pendaftaran mandiri dinonaktifkan (akun admin dibuat
      // manual lewat Firebase Console).
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/admin/leads");
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-bold text-white shadow-lg shadow-primary/30">
          LK
        </span>
        <h1 className="mt-5 text-xl font-bold text-secondary">
          Dashboard Admin
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Masuk untuk mengelola lead &amp; konten.
        </p>
      </div>

      <button
        onClick={onGoogle}
        disabled={busy}
        className="mt-7 inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-secondary transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md disabled:opacity-60"
      >
        <GoogleIcon />
        Masuk dengan Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-muted">atau dengan email</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-secondary">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@lktech.id"
            autoComplete="email"
            className={fieldBase}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-secondary">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
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
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Masuk
        </button>
      </form>

      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Hanya email yang terdaftar di <code>ADMIN_EMAILS</code> yang bisa
        mengakses dashboard, meski berhasil login.
      </p>
    </div>
  );
}

