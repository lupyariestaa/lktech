/**
 * Logika murni idempotency broadcast (ADM-07) — aman untuk klien.
 *
 * Server menyimpan reservation per `(uid, key)`. Fingerprint konten memastikan
 * key yang sama tidak dipakai untuk draft yang berbeda.
 */

export const BROADCAST_IDEMPOTENCY_MIN_LENGTH = 8;
export const BROADCAST_IDEMPOTENCY_MAX_LENGTH = 128;

const KEY_PATTERN = /^[A-Za-z0-9:_-]+$/;

/** Validasi & normalisasi key dari header/body. */
export function normalizeBroadcastIdempotencyKey(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim();
  if (
    key.length < BROADCAST_IDEMPOTENCY_MIN_LENGTH ||
    key.length > BROADCAST_IDEMPOTENCY_MAX_LENGTH ||
    !KEY_PATTERN.test(key)
  ) {
    return null;
  }
  return key;
}

/** Buat key baru untuk satu percobaan kirim (dipertahankan saat retry). */
export function createBroadcastIdempotencyKey(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return `bc_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}

export type BroadcastFingerprintInput = {
  subject: string;
  body: string;
  segment: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

/**
 * Sidik jari konten yang deterministik. Key idempotency hanya boleh dipakai
 * ulang untuk draft yang benar-benar sama.
 */
export function broadcastRequestFingerprint(
  input: BroadcastFingerprintInput,
): string {
  return JSON.stringify({
    subject: input.subject.trim(),
    body: input.body.trim(),
    segment: input.segment,
    ctaLabel: input.ctaLabel?.trim() ?? "",
    ctaUrl: input.ctaUrl?.trim() ?? "",
  });
}
