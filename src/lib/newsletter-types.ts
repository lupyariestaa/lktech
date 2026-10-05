/**
 * Tipe & konstanta NEWSLETTER — AMAN untuk klien (tanpa `server-only`).
 * Data layer (I/O) ada di `@/lib/newsletter`.
 */

/** Satu pelanggan newsletter. */
export type Subscriber = {
  email: string;
  name?: string;
  source: string;
  createdAtISO: string;
  unsubscribed?: boolean;
};

/** Segmen broadcast. */
export type BroadcastSegment = "semua" | "beli" | "belum";

export const BROADCAST_SEGMENT_LABEL: Record<BroadcastSegment, string> = {
  semua: "Semua pelanggan",
  beli: "Pernah membeli",
  belum: "Belum pernah membeli",
};
