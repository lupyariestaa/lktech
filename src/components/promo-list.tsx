"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgePercent, Check, Copy, ShoppingBag, Tag } from "lucide-react";
import type { PublicPromo } from "@/lib/promos";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Label nilai kupon (mis. "10%" atau "Rp50.000"). */
function promoValue(p: PublicPromo): string {
  return p.type === "percent" ? `${p.value}%` : formatRupiah(p.value);
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Daftar kartu promo publik (`KP-P1`) dengan aksi salin kode & "Pakai"
 * (arahkan ke keranjang dengan kode ter-prefill).
 */
export function PromoList({ promos }: { promos: PublicPromo[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const onCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1600);
    } catch {
      /* clipboard tidak tersedia — kode tetap tampil untuk diketik manual */
    }
  };

  return (
    <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {promos.map((p) => {
        const start = formatDate(p.startsAt);
        const end = formatDate(p.endsAt);
        const validity =
          start && end
            ? `Berlaku ${start} – ${end}`
            : end
              ? `Berlaku s/d ${end}`
              : start
                ? `Mulai ${start}`
                : "Berlaku selama promo aktif";
        return (
          <li
            key={p.code}
            className="relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary">
                <BadgePercent className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-600">
                {p.type === "percent" ? `Hemat ${promoValue(p)}` : promoValue(p)}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-lg bg-secondary px-3 py-1.5 font-mono text-base font-bold tracking-wide text-white">
                {p.code}
              </span>
              <button
                type="button"
                onClick={() => onCopy(p.code)}
                aria-label={`Salin kode ${p.code}`}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
              >
                {copied === p.code ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            {p.description && (
              <p className="mt-3 text-sm text-slate-600">{p.description}</p>
            )}

            <dl className="mt-4 flex flex-col gap-1 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {p.minSpend > 0
                  ? `Min. belanja ${formatRupiah(p.minSpend)}`
                  : "Tanpa minimum belanja"}
              </div>
              {p.type === "percent" && p.maxDiscount ? (
                <div className="flex items-center gap-1.5">
                  Maks. diskon {formatRupiah(p.maxDiscount)}
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">{validity}</div>
            </dl>

            <div className="mt-6 flex flex-1 flex-col justify-end">
              <Link
                href={`/keranjang?promo=${encodeURIComponent(p.code)}`}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary-dark",
                )}
              >
                <ShoppingBag className="h-4 w-4" />
                Pakai Kode Ini
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
