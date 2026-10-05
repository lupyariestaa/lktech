"use client";

import { useEffect, useState } from "react";
import { Award, Gift, Loader2, Star, TrendingUp } from "lucide-react";
import {
  fetchPoints,
  redeemPointsRequest,
  type PointsData,
} from "@/lib/loyalty-api";
import {
  REDEEM_PACKAGES,
  TIER_BENEFIT,
  TIER_LABEL,
  tierProgress,
  type Tier,
} from "@/lib/loyalty-pure";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<Tier, string> = {
  bronze: "from-amber-500 to-amber-700",
  silver: "from-slate-400 to-slate-600",
  gold: "from-yellow-400 to-amber-600",
};

const REASON_LABEL: Record<string, string> = {
  order: "Pembelian",
  review: "Ulasan disetujui",
  redeem: "Tukar kupon",
  bonus: "Bonus",
};

/** Tab "Poin": saldo, tier, tukar poin, riwayat (Tema 2.1). */
export function AccountPoints() {
  const [data, setData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [redeemed, setRedeemed] = useState<{ code: string; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await fetchPoints();
        if (!active) return;
        setData(d);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat poin.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const onRedeem = async (points: number) => {
    setBusy(points);
    setError(null);
    try {
      const res = await redeemPointsRequest(points);
      setRedeemed({ code: res.code, message: res.message });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menukar poin.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Memuat poin…
      </div>
    );
  }

  if (error && !data) {
    return (
      <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
    );
  }

  const s = data?.summary ?? { balance: 0, lifetime: 0, tier: "bronze" };
  const prog = tierProgress(s.lifetime);

  return (
    <div className="flex flex-col gap-5">
      {/* Kartu saldo & tier */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className={cn("bg-gradient-to-br p-6 text-white", TIER_STYLE[prog.tier])}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium opacity-90">Saldo Poin</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{s.balance}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              <Award className="h-3.5 w-3.5" />
              {TIER_LABEL[prog.tier]}
            </span>
          </div>
          <p className="mt-3 text-xs opacity-90">{TIER_BENEFIT[prog.tier]}</p>

          {prog.next && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] opacity-90">
                <span>Menuju {TIER_LABEL[prog.next]}</span>
                <span>{prog.toNext} poin lagi</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${Math.round(prog.progress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {redeemed && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {redeemed.message} Gunakan kode ini saat checkout.
        </div>
      )}
      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
      )}

      {/* Tukar poin */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-secondary">
          <Gift className="h-4 w-4 text-primary" />
          Tukar poin jadi kupon
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          Tukar poin Anda dengan kupon diskon yang bisa dipakai saat checkout.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {REDEEM_PACKAGES.map((p) => {
            const enough = s.balance >= p.points;
            return (
              <li
                key={p.points}
                className={cn(
                  "flex flex-col rounded-2xl border p-4",
                  enough ? "border-primary/30 bg-primary-50/40" : "border-slate-200",
                )}
              >
                <span className="text-sm font-bold text-secondary">{p.label}</span>
                <span className="mt-0.5 text-xs text-muted">{p.points} poin</span>
                <button
                  type="button"
                  disabled={!enough || busy !== null}
                  onClick={() => onRedeem(p.points)}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === p.points ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Star className="h-3.5 w-3.5" />
                  )}
                  {enough ? "Tukar" : "Poin kurang"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Riwayat */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-secondary">
          <TrendingUp className="h-4 w-4 text-primary" />
          Riwayat Poin
        </h3>
        {!data || data.history.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-surface px-4 py-6 text-center text-xs text-muted">
            Belum ada aktivitas poin. Dapatkan poin dari pembelian & ulasan.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-slate-100">
            {data.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-secondary">
                    {REASON_LABEL[h.reason] ?? h.reason}
                  </p>
                  <p className="text-[11px] text-muted">{formatDateTime(h.atISO)}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-bold tabular-nums",
                    h.delta >= 0 ? "text-emerald-600" : "text-rose-500",
                  )}
                >
                  {h.delta >= 0 ? "+" : ""}
                  {h.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
