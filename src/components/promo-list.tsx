"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Check, Clock, Copy, ShoppingBag, Tag } from "lucide-react";
import type { PublicPromo, PublicPromoStatus } from "@/lib/promos";
import { countdownLabel } from "@/lib/promo-pure";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Label nilai kupon (mis. "10%" atau "Rp50.000"). */
function promoValue(p: PublicPromo): string {
  if (p.type === "tiered") return p.tierSummary ?? "Bertingkat";
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

const STATUS_TABS: Array<{ id: "semua" | PublicPromoStatus; label: string }> = [
  { id: "semua", label: "Semua" },
  { id: "aktif", label: "Aktif" },
  { id: "berakhir_segera", label: "Berakhir segera" },
  { id: "akan_datang", label: "Akan datang" },
];

type SortMode = "relevan" | "nilai" | "berakhir";

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: "relevan", label: "Paling relevan" },
  { id: "nilai", label: "Hemat terbesar" },
  { id: "berakhir", label: "Segera berakhir" },
];

/** Estimasi "hemat hingga" untuk tipe percent/nominal (kasar, tanpa subtotal). */
function potentialSaving(p: PublicPromo): number {
  if (p.type === "amount") return p.value;
  if (p.type === "percent") {
    // Tanpa subtotal, gunakan maxDiscount bila ada; selain itu 0 (tak dihitung).
    return p.maxDiscount ?? 0;
  }
  return 0;
}

/**
 * Daftar kartu promo publik (C7) — filter status, urut, hitung mundur, badge sisa.
 * Semua promosi dihitung dari data server (`PublicPromo`).
 */
export function PromoList({ promos }: { promos: PublicPromo[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"semua" | PublicPromoStatus>("semua");
  const [sort, setSort] = useState<SortMode>("relevan");
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Hitung mundur diperbarui tiap 60 detik (khusus yang akan berakhir).
  useEffect(() => {
    const hasEnding = promos.some((p) => p.endsAt);
    if (!hasEnding) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [promos]);

  const counts = useMemo(() => {
    const c: Record<PublicPromoStatus | "semua", number> = {
      semua: promos.length,
      aktif: 0,
      akan_datang: 0,
      berakhir_segera: 0,
      berakhir: 0,
    };
    for (const p of promos) c[p.status] += 1;
    return c;
  }, [promos]);

  const visible = useMemo(() => {
    let list = promos.filter((p) => (tab === "semua" ? true : p.status === tab));
    list = [...list];
    if (sort === "nilai") {
      list.sort((a, b) => potentialSaving(b) - potentialSaving(a));
    } else if (sort === "berakhir") {
      list.sort((a, b) => {
        const ea = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
        const eb = b.endsAt ? new Date(b.endsAt).getTime() : Infinity;
        return ea - eb;
      });
    } else {
      // relevan: aktif dulu, lalu berakhir segera, akan datang.
      const rank: Record<PublicPromoStatus, number> = {
        berakhir_segera: 0,
        aktif: 1,
        akan_datang: 2,
        berakhir: 3,
      };
      list.sort((a, b) => rank[a.status] - rank[b.status]);
    }
    return list;
  }, [promos, tab, sort]);

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
    <div>
      {/* Filter & urut */}
      <div className="mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div
          role="tablist"
          aria-label="Filter status promo"
          className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1"
        >
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                tab === t.id ? "bg-primary-50 text-primary" : "text-slate-500 hover:text-secondary",
              )}
            >
              {t.label}
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-muted">
          Urutkan
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Urutkan promo"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-surface py-16 text-center text-sm text-muted">
          Tidak ada promo pada filter ini.
        </p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
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
            const endingSoon =
              p.status === "berakhir_segera" && p.endsAt
                ? countdownLabel(p.endsAt, nowMs)
                : null;
            return (
              <li
                key={p.code}
                className="relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary">
                    <BadgePercent className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-600">
                      {p.type === "percent"
                        ? `Hemat ${promoValue(p)}`
                        : p.type === "amount"
                          ? promoValue(p)
                          : "Bertingkat"}
                    </span>
                    {endingSoon && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Clock className="h-3 w-3" /> {endingSoon}
                      </span>
                    )}
                    {p.status === "akan_datang" && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600">
                        Akan datang
                      </span>
                    )}
                  </div>
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
                    {p.requirement ? p.requirement : "Tanpa minimum belanja"}
                  </div>
                  {p.type === "percent" && p.maxDiscount ? (
                    <div className="flex items-center gap-1.5">
                      Maks. diskon {formatRupiah(p.maxDiscount)}
                    </div>
                  ) : null}
                  {typeof p.remaining === "number" && p.remaining <= 20 ? (
                    <div className="flex items-center gap-1.5 font-semibold text-amber-600">
                      <Clock className="h-3.5 w-3.5" /> Sisa {p.remaining} pemakaian!
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1.5">{validity}</div>
                </dl>

                <div className="mt-6 flex flex-1 flex-col justify-end">
                  <Link
                    href={`/keranjang?promo=${encodeURIComponent(p.code)}`}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-all hover:-translate-y-0.5",
                      p.status === "akan_datang"
                        ? "border border-primary/30 bg-primary-50 text-primary shadow-none hover:bg-primary-100"
                        : "bg-primary text-white shadow-primary/30 hover:bg-primary-dark",
                    )}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {p.status === "akan_datang" ? "Salin untuk nanti" : "Pakai Kode Ini"}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
