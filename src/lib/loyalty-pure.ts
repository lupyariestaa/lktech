/**
 * Aturan PROGRAM LOYALITAS/POIN — logika MURNI (Tema 2.1, FASE R1).
 * Bebas impor runtime agar dapat diuji Node tanpa alias resolver.
 */

/** Tier pelanggan. */
export const TIERS = ["bronze", "silver", "gold"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

/** Ambang total poin sepanjang waktu untuk naik tier. */
export const TIER_THRESHOLDS: Record<Tier, number> = {
  bronze: 0,
  silver: 500,
  gold: 2000,
};

/** Benefit ringkas per tier (teks; dipakai UI). */
export const TIER_BENEFIT: Record<Tier, string> = {
  bronze: "Kumpulkan poin dari tiap pembelian.",
  silver: "Bonus poin & akses promo lebih awal.",
  gold: "Poin ekstra, prioritas dukungan, & promo eksklusif.",
};

/** Rasio poin dasar: 1 poin per Rp X belanja (default Rp 10.000). */
export const DEFAULT_POINTS_PER_RUPIAH_UNIT = 10000;

/** Poin bonus karena ulasan disetujui. */
export const POINTS_REVIEW_BONUS = 50;

/** Paket tukar poin → kupon (nominal Rupiah). */
export const REDEEM_PACKAGES = [
  { points: 100, value: 10000, label: "Kupon Rp10.000" },
  { points: 250, value: 25000, label: "Kupon Rp25.000" },
  { points: 500, value: 50000, label: "Kupon Rp50.000" },
] as const;

/** Hitung tier dari total poin sepanjang waktu. */
export function tierFor(pointsLifetime: number): Tier {
  if (pointsLifetime >= TIER_THRESHOLDS.gold) return "gold";
  if (pointsLifetime >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}

/** Poin yang didapat dari nominal belanja (Rp). */
export function pointsForSpend(
  amount: number,
  unit = DEFAULT_POINTS_PER_RUPIAH_UNIT,
): number {
  if (!Number.isFinite(amount) || amount <= 0 || unit <= 0) return 0;
  return Math.floor(amount / unit);
}

/** Apakah paket tukar valid (ada di daftar). */
export function findRedeemPackage(points: number) {
  return REDEEM_PACKAGES.find((p) => p.points === points) ?? null;
}

/** Validasi tukar poin: saldo cukup & paket valid. */
export type RedeemCheck =
  | { ok: true; value: number; points: number }
  | { ok: false; reason: string };

export function checkRedeem(balance: number, points: number): RedeemCheck {
  const pkg = findRedeemPackage(points);
  if (!pkg) return { ok: false, reason: "Paket tukar tidak valid." };
  if (!Number.isFinite(balance) || balance < points) {
    return { ok: false, reason: "Poin Anda belum cukup." };
  }
  return { ok: true, value: pkg.value, points };
}

/** Progres ke tier berikutnya (0..1) & label. */
export function tierProgress(pointsLifetime: number): {
  tier: Tier;
  next: Tier | null;
  toNext: number;
  progress: number;
} {
  const tier = tierFor(pointsLifetime);
  if (tier === "gold") {
    return { tier, next: null, toNext: 0, progress: 1 };
  }
  const next: Tier = tier === "bronze" ? "silver" : "gold";
  const from = TIER_THRESHOLDS[tier];
  const to = TIER_THRESHOLDS[next];
  const span = to - from;
  const done = Math.max(0, pointsLifetime - from);
  return {
    tier,
    next,
    toNext: Math.max(0, to - pointsLifetime),
    progress: span > 0 ? Math.min(1, done / span) : 0,
  };
}

/** Normalisasi saldo poin dari Firestore (integer ≥ 0). */
export function normalizePoints(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}
