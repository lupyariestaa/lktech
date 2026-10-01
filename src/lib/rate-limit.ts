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

/** Bersihkan entri kedaluwarsa agar Map tidak tumbuh tanpa batas. */
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

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
    // Sweep berkala saat membuat bucket baru (murah, tidak tiap request).
    if (buckets.size > 500) sweep(now);
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

/**
 * Ambil alamat IP klien.
 *
 * Di produksi (Vercel), `x-forwarded-for`/`x-real-ip` diisi oleh platform pada
 * edge sehingga tidak bisa dipalsukan klien. Untuk deployment lain, pastikan
 * proxy Anda menimpa (bukan menambahkan) header ini.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
