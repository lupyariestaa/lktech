/**
 * Tipe & konstanta NEWSLETTER — AMAN untuk klien (tanpa `server-only`).
 * Data layer (I/O) ada di `@/lib/newsletter`; logika murni di `@/lib/newsletter-pure`.
 */

export type {
  BroadcastSegment,
  NormalizedSubscriber,
} from "@/lib/newsletter-pure";

export { BROADCAST_SEGMENT_LABEL, BROADCAST_SEGMENTS } from "@/lib/newsletter-pure";

import type { NormalizedSubscriber } from "@/lib/newsletter-pure";

/** Satu pelanggan newsletter (bentuk tampilan/API). */
export type Subscriber = NormalizedSubscriber;
