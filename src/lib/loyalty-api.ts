import { getIdToken } from "@/lib/auth";

/** Satu entri riwayat poin (klien). */
export type PointsHistoryEntry = {
  id: string;
  delta: number;
  reason: string;
  refId?: string;
  atISO: string;
};

export type PointsSummaryClient = {
  balance: number;
  lifetime: number;
  tier: string;
};

export type PointsData = {
  summary: PointsSummaryClient;
  history: PointsHistoryEntry[];
};

/** Ambil saldo & riwayat poin user. */
export async function fetchPoints(): Promise<PointsData> {
  const token = await getIdToken();
  if (!token) throw new Error("Masuk untuk melihat poin.");
  const res = await fetch("/api/user/points", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal memuat poin.");
  return {
    summary: data.summary ?? { balance: 0, lifetime: 0, tier: "bronze" },
    history: Array.isArray(data.history) ? data.history : [],
  };
}

/** Tukar poin menjadi kupon. Mengembalikan kode kupon. */
export async function redeemPointsRequest(points: number): Promise<{
  code: string;
  value: number;
  balance: number;
  message: string;
}> {
  const token = await getIdToken();
  if (!token) throw new Error("Masuk untuk menukar poin.");
  const res = await fetch("/api/user/points", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ points }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal menukar poin.");
  return data;
}
