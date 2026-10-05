"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { RatingStars } from "@/components/rating-stars";
import { ReviewForm } from "@/components/review-form";
import { fetchProductReviews, type PublicReview } from "@/lib/review-api";
import { ratingPercent, type RatingSummary } from "@/lib/review-types";
import { formatDateTime } from "@/lib/format";

/**
 * Section ulasan di halaman produk (FASE R).
 * - Ringkasan rating + distribusi (dari `summary` server, agar SEO/indexable).
 * - Daftar ulasan disetujui (dimuat klien).
 * - Form tulis ulasan.
 */
export function ProductReviews({
  productSlug,
  summary,
}: {
  productSlug: string;
  summary?: RatingSummary;
}) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await fetchProductReviews(productSlug);
      if (active) setReviews(list);
    })();
    return () => {
      active = false;
    };
  }, [productSlug]);

  return (
    <section id="ulasan" className="scroll-mt-28">
      <span className="text-xs font-semibold tracking-widest text-primary uppercase">
        Ulasan
      </span>
      <h2 className="mt-2 text-xl font-bold text-secondary sm:text-2xl lg:text-3xl">
        Rating &amp; ulasan pembeli
      </h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Ringkasan + distribusi */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-surface p-5">
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">
                {summary && summary.count > 0 ? summary.avg.toFixed(1) : "—"}
              </p>
              <RatingStars
                value={summary?.avg ?? 0}
                size="sm"
                label={`Rata-rata ${summary?.avg ?? 0} dari 5`}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted">
                {summary?.count ?? 0} ulasan
              </p>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const c = summary?.distribution?.[star] ?? 0;
                const pct = ratingPercent(c, summary?.count ?? 0);
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-muted">{star}</span>
                    <span className="flex-1 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-2 rounded-full bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-muted">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ReviewForm productSlug={productSlug} />
        </div>

        {/* Daftar ulasan */}
        <div>
          {reviews === null ? (
            <p className="text-sm text-muted">Memuat ulasan…</p>
          ) : reviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-secondary">
                Belum ada ulasan.
              </p>
              <p className="mt-1 text-xs text-muted">
                Jadilah yang pertama mengulas setelah pesanan Anda selesai.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <RatingStars value={r.rating} size="sm" />
                    <span className="text-xs text-muted">
                      {formatDateTime(r.createdAtISO)}
                    </span>
                  </div>
                  {r.title && (
                    <p className="mt-2 text-sm font-bold text-secondary">
                      {r.title}
                    </p>
                  )}
                  {r.body && (
                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-700">
                      {r.body}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted">— {r.buyerName}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
