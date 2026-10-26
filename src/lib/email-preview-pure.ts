/**
 * Validasi permintaan PRATINJAU template email pembeli (`EM-P3`) — MURNI.
 *
 * Pratinjau memakai **pesanan contoh** (bukan input pengguna) sehingga tidak
 * ada risiko injeksi konten. Modul ini hanya memvalidasi pilihan template &
 * status yang dipakai endpoint `/api/admin/email/preview`.
 *
 * Bebas impor runtime (`@/`) agar dapat diuji dengan
 * `node --experimental-strip-types`.
 */

/** Jenis template yang bisa dipratinjau. */
export const EMAIL_PREVIEW_TEMPLATES = ["confirmation", "paid", "status"] as const;
export type EmailPreviewTemplate = (typeof EMAIL_PREVIEW_TEMPLATES)[number];

/** Label manusiawi per template (dipakai UI & tes). */
export const EMAIL_PREVIEW_TEMPLATE_LABELS: Record<EmailPreviewTemplate, string> = {
  confirmation: "Konfirmasi pesanan",
  paid: "Pembayaran diterima",
  status: "Update status",
};

/** Apakah nilai adalah template pratinjau yang dikenal. */
export function isEmailPreviewTemplate(value: unknown): value is EmailPreviewTemplate {
  return (
    typeof value === "string" &&
    (EMAIL_PREVIEW_TEMPLATES as readonly string[]).includes(value)
  );
}

/**
 * Status yang boleh dipratinjau untuk template `status`.
 *
 * `baru` **sengaja** tidak disertakan: email update status tidak pernah
 * dikirim untuk status `baru` (konfirmasi sudah dikirim saat checkout).
 */
export const EMAIL_PREVIEW_STATUSES = [
  "menunggu_bayar",
  "menunggu_konfirmasi",
  "dibayar",
  "diproses",
  "selesai",
  "dibatalkan",
  "kedaluwarsa",
] as const;
export type EmailPreviewStatus = (typeof EMAIL_PREVIEW_STATUSES)[number];

/** Apakah nilai adalah status pratinjau yang dikenal (selain `baru`). */
export function isEmailPreviewStatus(value: unknown): value is EmailPreviewStatus {
  return (
    typeof value === "string" &&
    (EMAIL_PREVIEW_STATUSES as readonly string[]).includes(value)
  );
}
