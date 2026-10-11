/**
 * Logika MURNI Newsletter & Broadcast (bebas impor runtime) — dapat diuji Node.
 *
 * Menyatukan normalisasi subscriber, klasifikasi segmen, & validasi payload
 * broadcast agar perilaku identik antara data layer (server) & test.
 */

export type BroadcastSegment = "semua" | "beli" | "belum";

export const BROADCAST_SEGMENTS: readonly BroadcastSegment[] = [
  "semua",
  "beli",
  "belum",
];

export const BROADCAST_SEGMENT_LABEL: Record<BroadcastSegment, string> = {
  semua: "Semua pelanggan",
  beli: "Pernah membeli",
  belum: "Belum pernah membeli",
};

/** Subscriber ternormalisasi (bentuk minimal yang dipakai logika murni). */
export type NormalizableSubscriber = {
  email: string;
  name?: string;
  source?: string;
  createdAtISO?: string;
  unsubscribedAtISO?: string;
  unsubscribed?: boolean;
};

/** Hasil normalisasi subscriber. */
export type NormalizedSubscriber = {
  email: string;
  name?: string;
  source: string;
  createdAtISO: string;
  unsubscribed: boolean;
  unsubscribedAtISO?: string;
};

/**
 * Normalisasi data subscriber mentah (dari Firestore) → bentuk kanonik.
 * Mengembalikan `null` bila email kosong/tak valid.
 */
export function normalizeSubscriber(
  raw: Record<string, unknown> | null | undefined,
): NormalizedSubscriber | null {
  if (!raw || typeof raw !== "object") return null;
  const email =
    typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (!email) return null;
  return {
    email,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : undefined,
    source: typeof raw.source === "string" && raw.source ? raw.source : "unknown",
    createdAtISO: typeof raw.createdAtISO === "string" ? raw.createdAtISO : "",
    unsubscribed: raw.unsubscribed === true,
    unsubscribedAtISO:
      typeof raw.unsubscribedAtISO === "string" ? raw.unsubscribedAtISO : undefined,
  };
}

/**
 * Apakah subscriber termasuk segmen. Hanya subscriber AKTIF (belum unsubscribe)
 * yang layak menerima broadcast, jadi filter `unsubscribed` dilakukan pemanggil.
 * `isBuyer` = pernah membeli (dari data orders).
 */
export function matchesSegment(
  segment: BroadcastSegment,
  isBuyer: boolean,
): boolean {
  if (segment === "semua") return true;
  if (segment === "beli") return isBuyer;
  return !isBuyer;
}

/** Hasil validasi payload broadcast (murni). */
export type BroadcastDraft = {
  subject: string;
  body: string;
  segment: BroadcastSegment;
  ctaLabel?: string;
  ctaUrl?: string;
};

export type BroadcastValidation =
  | { ok: true; draft: BroadcastDraft }
  | { ok: false; error: string };

const MAX_SUBJECT = 150;
const MAX_BODY = 8000;
const MAX_CTA_LABEL = 60;
const MAX_CTA_URL = 500;

/**
 * Validasi payload broadcast (murni). Aturan:
 * - subjek 3..150, isi 3..8000.
 * - segmen harus salah satu.
 * - label CTA opsional (maks 60); URL CTA opsional HARUS http(s) & valid.
 * - label tanpa URL & URL tanpa label → keduanya diabaikan (bukan error).
 */
export function validateBroadcast(input: {
  subject?: unknown;
  body?: unknown;
  segment?: unknown;
  ctaLabel?: unknown;
  ctaUrl?: unknown;
}): BroadcastValidation {
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const segment =
    typeof input.segment === "string" &&
    (BROADCAST_SEGMENTS as readonly string[]).includes(input.segment)
      ? (input.segment as BroadcastSegment)
      : "semua";

  if (subject.length < 3) return { ok: false, error: "Subjek minimal 3 karakter." };
  if (subject.length > MAX_SUBJECT)
    return { ok: false, error: `Subjek maksimal ${MAX_SUBJECT} karakter.` };
  if (body.length < 3) return { ok: false, error: "Isi minimal 3 karakter." };
  if (body.length > MAX_BODY)
    return { ok: false, error: `Isi maksimal ${MAX_BODY} karakter.` };

  let ctaLabel =
    typeof input.ctaLabel === "string" ? input.ctaLabel.trim() : "";
  let ctaUrl = typeof input.ctaUrl === "string" ? input.ctaUrl.trim() : "";

  if (ctaLabel.length > MAX_CTA_LABEL)
    return { ok: false, error: `Label tombol maksimal ${MAX_CTA_LABEL} karakter.` };

  // Label & URL harus hadir bersama; salah satu saja → diabaikan.
  if (!ctaLabel || !ctaUrl) {
    ctaLabel = "";
    ctaUrl = "";
  }

  if (ctaUrl) {
    if (ctaUrl.length > MAX_CTA_URL)
      return { ok: false, error: `URL tombol maksimal ${MAX_CTA_URL} karakter.` };
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(ctaUrl);
    } catch {
      return { ok: false, error: "URL tombol tidak valid." };
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
      return { ok: false, error: "URL tombol harus diawali http:// atau https://." };
  }

  return {
    ok: true,
    draft: {
      subject,
      body,
      segment,
      ctaLabel: ctaLabel || undefined,
      ctaUrl: ctaUrl || undefined,
    },
  };
}

/** Ringkasan subscriber (murni dari daftar). */
export function summarizeSubscribers(
  subs: Array<{ unsubscribed?: boolean }>,
): { total: number; active: number; unsubscribed: number } {
  const unsub = subs.filter((s) => s.unsubscribed).length;
  return { total: subs.length, active: subs.length - unsub, unsubscribed: unsub };
}

/** Hitung jumlah penerima per segmen dari daftar subscriber aktif + set pembeli. */
export function countSegmentRecipients(
  subs: Array<{ email: string; unsubscribed?: boolean }>,
  buyerEmails: ReadonlySet<string>,
): Record<BroadcastSegment, number> {
  const active = subs.filter((s) => !s.unsubscribed);
  const out: Record<BroadcastSegment, number> = { semua: 0, beli: 0, belum: 0 };
  for (const s of active) {
    const isBuyer = buyerEmails.has(s.email.toLowerCase());
    for (const seg of BROADCAST_SEGMENTS) {
      if (matchesSegment(seg, isBuyer)) out[seg] += 1;
    }
  }
  return out;
}

/** Entri riwayat broadcast (aman klien). */
export type BroadcastLog = {
  id: string;
  subject: string;
  segment: BroadcastSegment;
  recipients: number;
  sent: number;
  failed: number;
  actor: string;
  atISO: string;
};
