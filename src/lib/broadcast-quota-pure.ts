/**
 * Logika murni kuota broadcast harian (ADM-07) — aman untuk klien/test.
 *
 * `limit <= 0` berarti guard nonaktif (default), sehingga perilaku lama tidak
 * berubah sampai pemilik mengisi `BROADCAST_DAILY_QUOTA`.
 */

export type BroadcastQuotaDecision =
  | {
      ok: true;
      disabled?: boolean;
      used: number;
      limit: number;
      /** True tepat saat pemakaian melewati ambang alarm (80%). */
      alert?: boolean;
    }
  | {
      ok: false;
      code: "quota_exceeded";
      used: number;
      limit: number;
      requested: number;
    };

function safeInt(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Hitung apakah `requested` email masih muat & perlu alarm. */
export function decideBroadcastQuota(
  usedRaw: number,
  requestedRaw: number,
  limitRaw: number,
): BroadcastQuotaDecision {
  const used = safeInt(usedRaw);
  const requested = safeInt(requestedRaw);
  const limit = safeInt(limitRaw);

  if (limit <= 0) {
    return { ok: true, disabled: true, used: 0, limit: 0 };
  }
  if (requested === 0) {
    return { ok: true, used, limit };
  }

  const next = used + requested;
  if (next > limit) {
    return { ok: false, code: "quota_exceeded", used, limit, requested };
  }

  const threshold = Math.max(1, Math.ceil(limit * 0.8));
  return {
    ok: true,
    used: next,
    limit,
    ...(used < threshold && next >= threshold ? { alert: true } : {}),
  };
}
