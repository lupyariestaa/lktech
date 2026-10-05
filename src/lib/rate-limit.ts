/**
 * Rate limiter — DUA mode (Tema 4.2):
 *
 * 1. **Terdistribusi (Upstash Redis)** bila `UPSTASH_REDIS_REST_URL` &
 *    `UPSTASH_REDIS_REST_TOKEN` diisi → benar di lingkungan multi-instance
 *    serverless. Memakai endpoint REST Upstash via `fetch` (tanpa dependensi).
 * 2. **In-memory (fallback)** bila env Upstash kosong → perilaku lama
 *    (per-instance). Aman: tak ada error, hanya kurang akurat antar-instance.
 *
 * `checkRateLimit` = versi ASYNC yang memilih mode otomatis (dipakai endpoint
 * publik). `rateLimit` = versi sinkron in-memory lama (dipakai alur server-only
 * yang tidak ingin menambah latency jaringan, mis. webhook).
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

/** Apakah rate-limit terdistribusi (Upstash) dikonfigurasi. */
export function isDistributedRateLimitConfigured(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL ?? "").trim() &&
      (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),
  );
}

/**
 * Cek & tambah hitungan untuk `key` (IN-MEMORY, sinkron).
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
 * Rate-limit terdistribusi via Upstash REST (INCR + EXPIRE).
 * Mengembalikan `null` bila tidak dikonfigurasi/gagal → pemanggil fallback.
 */
async function rateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/+$/, "");
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
  if (!url || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${key}`;

  try {
    // Pipeline: INCR, lalu EXPIRE hanya jika 1 (pertama kali) — 2 perintah.
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    if (!Number.isFinite(count) || count <= 0) return null;

    if (count > limit) {
      return { ok: false, remaining: 0, retryAfter: windowSec };
    }
    return { ok: true, remaining: Math.max(0, limit - count), retryAfter: 0 };
  } catch (err) {
    console.error("[rate-limit] Upstash gagal, fallback in-memory:", err);
    return null;
  }
}

/**
 * Cek rate-limit ASYNC — otomatis memakai Upstash bila dikonfigurasi,
 * jika tidak/gagal → fallback in-memory. Selalu mengembalikan hasil.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (isDistributedRateLimitConfigured()) {
    const distributed = await rateLimitUpstash(key, limit, windowMs);
    if (distributed) return distributed;
  }
  return rateLimit(key, limit, windowMs);
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
