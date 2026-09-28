"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { AlertCircle, Loader2, LogIn, Mail } from "lucide-react";
import { getClientAuth, signInWithGoogle } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30";

export function LoginForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
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
      setError(normalizeError(err));
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
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.replace("/admin/leads");
    } catch (err) {
      setError(normalizeError(err));
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
            autoComplete={mode === "login" ? "current-password" : "new-password"}
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
          {mode === "login" ? "Masuk" : "Daftar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="font-semibold text-primary hover:underline"
        >
          {mode === "login" ? "Daftar" : "Masuk"}
        </button>
      </p>

      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Hanya email yang terdaftar di <code>ADMIN_EMAILS</code> yang bisa
        mengakses dashboard, meski berhasil login.
      </p>
    </div>
  );
}

function normalizeError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  if (code.includes("popup-closed-by-user")) return "Jendela login ditutup.";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Email atau password salah.";
  if (code.includes("user-not-found")) return "Akun tidak ditemukan.";
  if (code.includes("email-already-in-use"))
    return "Email sudah terdaftar. Silakan masuk.";
  if (code.includes("weak-password"))
    return "Password minimal 6 karakter.";
  if (code.includes("invalid-email")) return "Format email tidak valid.";
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan. Coba lagi.";
}

function GoogleIcon() {
  return (
    <svg className={cn("h-4 w-4")} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
