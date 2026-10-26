/**
 * Logika MURNI untuk webhook Resend (EM-P2) — verifikasi tanda tangan Svix &
 * klasifikasi event. Bebas impor runtime (`@/`) agar dapat diuji dengan
 * `node --experimental-strip-types`; hanya memakai `node:crypto` (bawaan).
 *
 * Resend mengirim webhook bertanda tangan skema **Svix**:
 * - Header: `svix-id`, `svix-timestamp`, `svix-signature`.
 * - Pesan yang ditandatangani: `${svix-id}.${svix-timestamp}.${body}`.
 * - Secret berbentuk `whsec_<base64>`; kunci HMAC = base64 yang di-decode.
 * - `svix-signature` berisi satu/lebih skema `v1,<base64>` dipisah spasi.
 *
 * Fail-safe: bila secret/parameter tidak lengkap atau tanda tangan tak cocok,
 * kembalikan `false` (endpoint menolak). Tidak ada efek samping.
 */

import crypto from "node:crypto";

/** Toleransi skew waktu tanda tangan (detik) — cegah replay lama. */
export const SVIX_TOLERANCE_SEC = 5 * 60;

/** Hasil klasifikasi jenis event Resend. */
export type ResendOutcome =
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "ignored";

/** Decode secret Svix (`whsec_<base64>`) menjadi kunci HMAC. */
export function decodeSvixSecret(secret: string): Buffer | null {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/** Hitung tanda tangan Svix (base64 HMAC-SHA256) untuk pesan tertentu. */
export function computeSvixSignature(input: {
  secret: string;
  id: string;
  timestamp: string;
  body: string;
}): string | null {
  const key = decodeSvixSecret(input.secret);
  if (!key) return null;
  const signed = `${input.id}.${input.timestamp}.${input.body}`;
  return crypto.createHmac("sha256", key).update(signed).digest("base64");
}

/** Bandingkan dua string tanpa membocorkan waktu (timing-safe). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Ambil bagian `<base64>` dari daftar header `svix-signature` (`v1,<sig> ...`). */
function extractSignatures(header: string): string[] {
  return header
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const comma = part.indexOf(",");
      return comma >= 0 ? part.slice(comma + 1).trim() : part;
    })
    .filter(Boolean);
}

/**
 * Verifikasi tanda tangan webhook Svix. `nowSec` = waktu server (detik epoch).
 * Mengembalikan `false` bila parameter kurang, stempel waktu di luar toleransi,
 * atau tak satu pun tanda tangan cocok.
 */
export function verifySvixSignature(input: {
  secret: string;
  id: string;
  timestamp: string;
  signature: string;
  body: string;
  nowSec: number;
  toleranceSec?: number;
}): boolean {
  const { secret, id, timestamp, signature, body, nowSec } = input;
  if (!secret || !id || !timestamp || !signature || !body) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const tolerance = input.toleranceSec ?? SVIX_TOLERANCE_SEC;
  if (Math.abs(nowSec - ts) > tolerance) return false;

  const expected = computeSvixSignature({ secret, id, timestamp, body });
  if (!expected) return false;

  return extractSignatures(signature).some((sig) => safeEqual(sig, expected));
}

/** Klasifikasi jenis event Resend menjadi hasil yang bermakna. */
export function classifyResendEvent(type: string): ResendOutcome {
  switch (type) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delivery_delayed";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    default:
      return "ignored";
  }
}

/**
 * Status ringkas yang layak disimpan untuk sebuah event pengiriman.
 * `ignored` (event tak relevan) → `null` (jangan ditulis).
 */
export function deliveryStatusFor(outcome: ResendOutcome): string | null {
  return outcome === "ignored" ? null : outcome;
}

/**
 * Parse payload webhook Resend (`{ type, data: { email_id } }`) menjadi ringkas.
 * Mengembalikan `null` bila bentuk tak dikenali (tanpa melempar).
 */
export function parseResendEvent(
  raw: unknown,
): { type: string; emailId: string; outcome: ResendOutcome } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const type = typeof r.type === "string" ? r.type : "";
  const data = r.data as Record<string, unknown> | undefined;
  const emailId =
    data && typeof data.email_id === "string"
      ? data.email_id
      : data && typeof data.id === "string"
        ? data.id
        : "";
  if (!type || !emailId) return null;
  return { type, emailId, outcome: classifyResendEvent(type) };
}
