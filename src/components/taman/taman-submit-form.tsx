"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getIdToken } from "@/lib/auth";
import { CONSENT_TEXT } from "@/lib/taman-consent";
import { TAMAN_LIMITS } from "@/lib/taman-types";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none";

/**
 * Form kirim testimoni (T8). Wajib login Google (pakai sistem login yang sudah ada).
 * Klien hanya memberi umpan balik; aturan final (validasi, consent, email terverifikasi,
 * rate limit) dijaga server di `/api/taman/submit`.
 */
export function TamanSubmitForm() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [projectSlug, setProjectSlug] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" /> Memeriksa akun...
      </div>
    );
  }

  if (!user) {
    // Belum login: arahkan ke halaman masuk yang sudah ada, lalu kembali ke sini.
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-secondary">Masuk dulu untuk menulis testimoni.</p>
        <p className="mt-1 text-xs text-muted">Testimoni dikaitkan dengan akun agar bisa dikelola kembali.</p>
        <button
          type="button"
          onClick={() => router.push("/masuk?next=/taman/kirim")}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Masuk dengan Google
        </button>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Akun Google Anda belum terverifikasi email. Verifikasi email di akun Google, lalu coba lagi.
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <p className="text-base font-semibold text-secondary">Terima kasih.</p>
        <p className="text-sm text-muted">Testimoni akan ditampilkan setelah kami tinjau. Anda bisa melihat statusnya di akun Anda.</p>
        <Link href="/akun?tab=testimoni" className="mt-2 text-sm font-semibold text-primary underline underline-offset-2">
          Lihat testimoni saya
        </Link>
      </div>
    );
  }

  const quoteLen = quote.trim().length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Centang persetujuan terlebih dahulu.");
      return;
    }
    if (quoteLen < TAMAN_LIMITS.quoteMin) {
      setError(`Pesan minimal ${TAMAN_LIMITS.quoteMin} karakter.`);
      return;
    }
    setBusy(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/taman/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          displayName,
          role,
          quote,
          rating,
          dateISO,
          projectSlug: projectSlug || undefined,
          productSlug: productSlug || undefined,
          consent: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim testimoni.");
        return;
      }
      setDone(true);
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" noValidate>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-secondary">
        Nama yang tampil
        <input className={field} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={TAMAN_LIMITS.displayNameMax} placeholder={user.displayName ?? "Nama Anda"} />
        <span className="text-xs font-normal text-muted">Ditampilkan singkat, mis. &ldquo;Budi S.&rdquo;. Kosong = nama akun Google.</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-secondary">
        Peran atau nama usaha
        <input className={field} value={role} onChange={(e) => setRole(e.target.value)} maxLength={TAMAN_LIMITS.roleMax} placeholder="Pemilik Toko Kopi, Tasikmalaya" required />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-secondary">
        Pesan Anda
        <textarea className={cn(field, "min-h-[120px]")} value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={TAMAN_LIMITS.quoteMax} required />
        <span className={cn("text-xs font-normal", quoteLen < TAMAN_LIMITS.quoteMin ? "text-muted" : "text-emerald-700")}>
          {quoteLen}/{TAMAN_LIMITS.quoteMax} karakter (minimal {TAMAN_LIMITS.quoteMin})
        </span>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-semibold text-secondary">Penilaian</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Penilaian bintang">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} bintang`}
              onClick={() => setRating(n)}
              className="grid h-11 w-11 place-items-center rounded-full"
            >
              <Star className={cn("h-6 w-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-secondary">
          Tanggal
          <input type="date" className={field} value={dateISO} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDateISO(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-secondary">
          Slug proyek (opsional)
          <input className={field} value={projectSlug} onChange={(e) => setProjectSlug(e.target.value.trim().toLowerCase())} placeholder="contoh: website-toko-kopi" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-secondary">
        Slug produk (opsional)
        <input className={field} value={productSlug} onChange={(e) => setProductSlug(e.target.value.trim().toLowerCase())} placeholder="contoh: paket-landing-page" />
      </label>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-surface p-4 text-xs leading-relaxed text-slate-700">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{CONSENT_TEXT}</span>
      </label>

      {error && (
        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Kirim testimoni
      </button>
    </form>
  );
}
