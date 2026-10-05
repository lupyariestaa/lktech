export const LEAD_STATUSES = ["baru", "diproses", "selesai", "arsip"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Satu entri timeline aktivitas lead (CRM mini, Tema 3.2). */
export type LeadActivity = {
  id: string;
  /** Jenis aktivitas. */
  type: "catatan" | "status" | "panggilan" | "email" | "wa" | "sistem";
  note: string;
  actor: string;
  atISO: string;
};

/** Lead yang tersimpan di Firestore (dengan id & status pengelolaan). */
export type StoredLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: LeadStatus;
  createdAt: string | null;
  source?: string;
  userAgent?: string;
  /* ===== CRM mini (Tema 3.2) — semua OPSIONAL (backward-compatible) ===== */
  /** Skor potensi 0..100 (dihitung otomatis). */
  score?: number;
  /** Tahapan pipeline (lebi kaya dari `status`). */
  stage?: string;
  /** Timeline aktivitas (dibatasi jumlah). */
  activities?: LeadActivity[];
  /** Waktu aktivitas terakhir (ISO) untuk pengurutan/peringatan. */
  lastActivityAtISO?: string;
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
  arsip: "Arsip",
};

export const LEAD_STATUS_STYLE: Record<LeadStatus, string> = {
  baru: "bg-blue-50 text-blue-600 border-blue-100",
  diproses: "bg-amber-50 text-amber-600 border-amber-100",
  selesai: "bg-emerald-50 text-emerald-600 border-emerald-100",
  arsip: "bg-slate-100 text-slate-500 border-slate-200",
};
