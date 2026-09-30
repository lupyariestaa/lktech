import "server-only";

/**
 * Rate limiter in-memory sederhana (per-instance).
 *
 * Cukup untuk skala saat ini (satu instance serverless) sebagai lapisan anti
 * spam dasar pada endpoint publik. Catatan: pada lingkungan multi-instance,
 * hitungan tidak dibagi antar instance — untuk skala besar gunakan penyimpanan
 * terdistribusi (mis. Redis/Upstash).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  /** Sisa percobaan yang diizinkan pada jendela ini. */
  remaining: number;
  /** Detik sampai jendela direset (bila `ok: false`). */
  retryAfter: number;
};

/**
 * Cek & tambah hitungan untuk `key`.
 *
 * @param key       Pengenal unik (mis. `lead:<ip>`).
 * @param limit     Jumlah maksimum permintaan per jendela.
 * @param windowMs  Panjang jendela dalam milidetik.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/** Ambil alamat IP klien dari header proxy (Vercel mengisi `x-forwarded-for`). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
