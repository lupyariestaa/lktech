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
  /** `true` bila pemindaian subscriber menyentuh batas (angka bisa terpotong). */
  truncated?: boolean;
};

/** Ringkasan subscriber + jumlah per segmen (admin). */
export async function fetchBroadcastOverview(): Promise<BroadcastOverview> {
  return adminFetch<BroadcastOverview>("/api/admin/broadcast");
}

/** Daftar subscriber (admin) + penanda bila pemindaian dibatasi. */
export async function fetchSubscribers(): Promise<{
  subscribers: Subscriber[];
  truncated: boolean;
}> {
  const data = await adminFetch<{ subscribers: Subscriber[]; truncated?: boolean }>(
    "/api/admin/broadcast?list=1",
  );
  return { subscribers: data.subscribers, truncated: Boolean(data.truncated) };
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
  /** ADM-18: total penerima segmen. */
  total?: number;
  /** ADM-18: kursor batch (email terakhir diproses) untuk kelanjutan. */
  cursor?: string | null;
  /** ADM-18: sisa penerima setelah batch ini. */
  remaining?: number;
  /** ADM-18: true bila seluruh segmen sudah diproses. */
  done?: boolean;
};

/** Kirim broadcast ke segmen (satu batch; ADM-18 memakai `cursor` untuk lanjut). */
export async function sendBroadcastRequest(input: {
  subject: string;
  body: string;
  segment: BroadcastSegment;
  ctaLabel?: string;
  ctaUrl?: string;
  /** ADM-07: key stabil selama satu percobaan; retry tidak mengirim ganda. */
  idempotencyKey: string;
  /** ADM-18: email terakhir yang sudah diproses (null = mulai dari awal). */
  cursor?: string | null;
}): Promise<SendBroadcastResult & { replayed?: boolean }> {
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
