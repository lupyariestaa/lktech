/**
 * LEAD SCORING & PIPELINE — logika MURNI (Tema 3.2, FASE L1).
 * Bebas impor runtime agar dapat diuji Node tanpa alias resolver.
 */

/** Status lead lama (tetap dipakai — jangan dihapus). */
export type LeadStatusName = "baru" | "diproses" | "selesai" | "arsip";

/** Tahapan pipeline (CRM mini) — lebih kaya daripada `status`. */
export const PIPELINE_STAGES = [
  "baru",
  "dihubungi",
  "proposal",
  "menang",
  "kalah",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  proposal: "Proposal",
  menang: "Menang",
  kalah: "Kalah",
};

/** Urutan kolom Kanban. */
export const PIPELINE_ORDER: readonly PipelineStage[] = PIPELINE_STAGES;

/** Pemetaan status lama → stage pipeline (untuk lead lama / sinkronisasi). */
export function statusToStage(status: string): PipelineStage {
  switch (status) {
    case "diproses":
      return "dihubungi";
    case "selesai":
      return "menang";
    case "arsip":
      return "kalah";
    default:
      return "baru";
  }
}

/** Pemetaan stage pipeline → status lama (agar badge/laporan lama konsisten). */
export function stageToStatus(stage: string): LeadStatusName {
  switch (stage) {
    case "dihubungi":
      return "diproses";
    case "proposal":
      return "diproses";
    case "menang":
      return "selesai";
    case "kalah":
      return "arsip";
    default:
      return "baru";
  }
}

export function isPipelineStage(v: unknown): v is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(String(v));
}

/** Input skor (hanya field non-sensitif yang relevan). */
export type LeadScoreInput = {
  service?: string;
  message?: string;
  phone?: string;
  email?: string;
  source?: string;
  /** Apakah lead sudah dihubungi/proposal (naik nilai). */
  stage?: string;
};

/**
 * Hitung skor lead 0..100 dari DATA NYATA (transparan, tanpa ML).
 *
 * Komponen:
 * - Kelengkapan kontak (email valid + telepon): hingga +30.
 * - Kualitas pesan (panjang bermanfaat): hingga +25.
 * - Ketertarikan layanan (layanan disebut / spesifik): hingga +30.
 * - Kesiapan tahap pipeline (dihubungi/proposal = makin serius): hingga +15.
 *
 * Skor selalu 0..100 (dijepit). Fungsi ini MURNI (deterministik).
 */
export function computeLeadScore(lead: LeadScoreInput): number {
  let score = 0;

  // 1) Kelengkapan kontak (maks 30)
  if (lead.email && /.+@.+\..+/.test(lead.email)) score += 15;
  const phoneDigits = (lead.phone ?? "").replace(/\D/g, "");
  if (phoneDigits.length >= 8) score += 15;

  // 2) Kualitas pesan (maks 25) — panjang wajar & ada deskripsi.
  const msgLen = (lead.message ?? "").trim().length;
  if (msgLen >= 20) score += 10;
  if (msgLen >= 80) score += 10;
  if (msgLen >= 200) score += 5;

  // 3) Ketertarikan layanan (maks 30)
  const service = (lead.service ?? "").trim();
  if (service && service.toLowerCase() !== "lainnya") score += 20;
  if (service.length >= 5) score += 10;

  // 4) Kesiapan tahap (maks 15)
  const stage = lead.stage ?? "baru";
  if (stage === "dihubungi") score += 8;
  if (stage === "proposal") score += 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Kategori skor untuk badge. */
export function scoreTier(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export const SCORE_TIER_LABEL: Record<"hot" | "warm" | "cold", string> = {
  hot: "Potensial tinggi",
  warm: "Cukup potensial",
  cold: "Perlu dikualifikasi",
};

/** Normalisasi skor mentah dari Firestore (0..100 integer). */
export function normalizeScore(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.max(0, Math.min(100, Math.round(v)));
}
