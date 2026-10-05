import { adminFetch } from "@/lib/admin-fetch";
import type { Subscriber } from "@/lib/newsletter-types";

export type SubscribersSummary = {
  total: number;
  active: number;
  unsubscribed: number;
};

/** Ringkasan subscriber (admin). */
export async function fetchSubscribersSummary(): Promise<SubscribersSummary> {
  const data = await adminFetch<{ summary: SubscribersSummary }>(
    "/api/admin/broadcast",
  );
  return data.summary;
}

/** Daftar subscriber (admin). */
export async function fetchSubscribers(): Promise<Subscriber[]> {
  const data = await adminFetch<{ subscribers: Subscriber[] }>(
    "/api/admin/broadcast?list=1",
  );
  return data.subscribers;
}

/** Kirim broadcast ke segmen. */
export async function sendBroadcastRequest(input: {
  subject: string;
  body: string;
  segment: "semua" | "beli" | "belum";
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<{ sent: number; failed: number; recipients: number }> {
  return adminFetch("/api/admin/broadcast", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
