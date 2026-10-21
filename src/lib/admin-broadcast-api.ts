import { adminFetch } from "@/lib/admin-fetch";
import { csvCell } from "@/lib/csv";
import type { Subscriber, BroadcastSegment } from "@/lib/newsletter-types";
import type { BroadcastLog } from "@/lib/newsletter-pure";

export type SubscribersSummary = {
  total: number;
  active: number;
  unsubscribed: number;
};

export type SegmentCounts = Record<BroadcastSegment, number>;

export type BroadcastOverview = {
  summary: SubscribersSummary;
  segmentCounts: SegmentCounts;
};

/** Ringkasan subscriber + jumlah per segmen (admin). */
export async function fetchBroadcastOverview(): Promise<BroadcastOverview> {
  return adminFetch<BroadcastOverview>("/api/admin/broadcast");
}

/** Daftar subscriber (admin). */
export async function fetchSubscribers(): Promise<Subscriber[]> {
  const data = await adminFetch<{ subscribers: Subscriber[] }>(
    "/api/admin/broadcast?list=1",
  );
  return data.subscribers;
}

/** Riwayat broadcast (admin). */
export async function fetchBroadcastHistory(): Promise<BroadcastLog[]> {
  const data = await adminFetch<{ history: BroadcastLog[] }>(
    "/api/admin/broadcast?history=1",
  );
  return data.history;
}

export type SendBroadcastResult = {
  ok: boolean;
  sent: number;
  failed: number;
  recipients: number;
  truncated?: boolean;
};

/** Kirim broadcast ke segmen. */
export async function sendBroadcastRequest(input: {
  subject: string;
  body: string;
  segment: BroadcastSegment;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<SendBroadcastResult> {
  return adminFetch("/api/admin/broadcast", {
    method: "POST",
    body: JSON.stringify({ action: "send", ...input }),
  });
}

/** Kirim satu email uji (pratinjau) ke alamat tertentu. */
export async function sendTestBroadcastRequest(input: {
  subject: string;
  body: string;
  segment: BroadcastSegment;
  ctaLabel?: string;
  ctaUrl?: string;
  testEmail?: string;
}): Promise<{ ok: boolean; to: string }> {
  return adminFetch("/api/admin/broadcast", {
    method: "POST",
    body: JSON.stringify({ action: "test", ...input }),
  });
}

/** Ekspor daftar subscriber ke CSV & unduh di browser. */
export function exportSubscribersToCsv(
  subscribers: Subscriber[],
  filename?: string,
) {
  const header = ["Email", "Nama", "Sumber", "Status", "Terdaftar", "Berhenti"];
  const rows = subscribers.map((s) =>
    [
      s.email,
      s.name ?? "",
      s.source,
      s.unsubscribed ? "Berhenti" : "Aktif",
      s.createdAtISO,
      s.unsubscribedAtISO ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = "\uFEFF" + [header.map(csvCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename ?? `subscriber-lktech-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
