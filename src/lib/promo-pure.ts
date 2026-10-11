/**
 * Logika PROMO publik murni (C7) — bebas impor; dapat diuji Node.
 */

export type PublicPromoStatus = "aktif" | "akan_datang" | "berakhir_segera" | "berakhir";

/** Ambang "berakhir segera" (ms) — default 3 hari. */
export const ENDING_SOON_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Hitung status promo terhadap `now`:
 * - `akan_datang` bila `startsAt` di masa depan,
 * - `berakhir_segera` bila `endsAt` ≤ `endingSoonMs` lagi,
 * - `aktif` selainnya.
 * (Caller menyembunyikan yang sudah lewat; fungsi ini tak mengembalikan `berakhir`
 * kecuali `endsAt` sudah lampau.)
 */
export function computePromoStatus(
  startsAt: string | undefined,
  endsAt: string | undefined,
  nowMs: number,
  endingSoonMs: number = ENDING_SOON_MS,
): PublicPromoStatus {
  const startMs = startsAt ? new Date(startsAt).getTime() : NaN;
  const endMs = endsAt ? new Date(endsAt).getTime() : NaN;
  if (!Number.isNaN(endMs) && nowMs > endMs) return "berakhir";
  if (!Number.isNaN(startMs) && nowMs < startMs) return "akan_datang";
  if (!Number.isNaN(endMs) && endMs - nowMs <= endingSoonMs) return "berakhir_segera";
  return "aktif";
}

/** Label hitung mundur ringkas dari `endsAt` ke `nowMs`. */
export function countdownLabel(endsAt: string, nowMs: number): string {
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return "";
  let diff = Math.max(0, end - nowMs);
  const days = Math.floor(diff / 86_400_000);
  diff -= days * 86_400_000;
  const hours = Math.floor(diff / 3_600_000);
  diff -= hours * 3_600_000;
  const mins = Math.floor(diff / 60_000);
  if (days > 0) return `${days} hari lagi`;
  if (hours > 0) return `${hours}j ${mins}m lagi`;
  return `${mins}m lagi`;
}

/** Ringkasan syarat kupon untuk ditampilkan (min belanja & bundel). */
export function promoRequirement(c: {
  minSpend: number;
  appliesToSlugs?: string[];
  minItems?: number;
}): string | undefined {
  const parts: string[] = [];
  if (c.minSpend > 0) parts.push(`Min. Rp${c.minSpend.toLocaleString("id-ID")}`);
  if (c.minItems) parts.push(`min ${c.minItems} item`);
  if (c.appliesToSlugs?.length) parts.push(`${c.appliesToSlugs.length} produk tertentu`);
  return parts.length ? parts.join(" · ") : undefined;
}

/** Ringkasan tingkat kupon `tiered`. */
export function tierSummary(
  tiers: readonly { minSpend: number; value: number; kind?: "percent" | "amount" }[] | undefined,
): string | undefined {
  if (!tiers || tiers.length === 0) return undefined;
  return tiers
    .map(
      (t) =>
        `≥${Math.round(t.minSpend / 1000)}rb: ${
          (t.kind ?? "percent") === "amount"
            ? `Rp${t.value.toLocaleString("id-ID")}`
            : `${t.value}%`
        }`,
    )
    .join(" · ");
}
