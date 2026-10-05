"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { RatingStars } from "@/components/rating-stars";
import { submitProductReview } from "@/lib/review-api";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

/**
 * Form tulis ulasan (FASE R). Wajib login; server memverifikasi pembelian.
 * Setelah terkirim → status `pending` (menunggu moderasi).
 */
export function ReviewForm({ productSlug }: { productSlug: string }) {
  const { user, loading } = useAuth();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (loading) return null;

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-surface px-4 py-3 text-sm text-muted">
        <Link
          href={`/masuk?next=${encodeURIComponent(`/produk/${productSlug}`)}`}
          className="font-semibold text-primary hover:underline"
        >
          Masuk
        </Link>{" "}
        untuk menulis ulasan (khusus pembeli).
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{done}</span>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Pilih rating bintang terlebih dahulu.");
      return;
    }
    setBusy(true);
    try {
      const res = await submitProductReview(productSlug, {
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim ulasan.");
    } finally {
      setBusy(false);
    }
  };

  const fieldCls =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-5"
    >
      <p className="text-sm font-bold text-secondary">Tulis ulasan Anda</p>
      <p className="mt-0.5 text-xs text-muted">
        Ulasan hanya bisa dikirim oleh pembeli yang pesanannya sudah selesai.
      </p>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Rating
        </label>
        <RatingStars value={rating} onChange={setRating} />
      </div>

      <div className="mt-4">
        <label
          htmlFor="review-title"
          className="mb-1.5 block text-xs font-medium text-slate-600"
        >
          Judul (opsional)
        </label>
        <input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Ringkas pengalaman Anda"
          className={fieldCls}
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="review-body"
          className="mb-1.5 block text-xs font-medium text-slate-600"
        >
          Ulasan (opsional)
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Ceritakan kualitas produk & pengalaman Anda"
          className={cn(fieldCls, "resize-none")}
        />
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Kirim ulasan
      </button>
    </form>
  );
}
