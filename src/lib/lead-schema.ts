import { z } from "zod";

/**
 * Opsi layanan yang bisa dipilih di form kontak.
 */
export const LEAD_SERVICES = [
  "Pembuatan Website",
  "Aplikasi Mobile",
  "Konsultasi Teknologi",
  "Desain & Branding",
  "Digital Marketing",
  "Lainnya",
] as const;

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(80, "Nama terlalu panjang"),
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .min(8, "Nomor minimal 8 digit")
    .max(20, "Nomor terlalu panjang")
    .regex(/^[0-9+\-\s()]+$/, "Nomor telepon tidak valid"),
  service: z.enum(LEAD_SERVICES, {
    message: "Pilih salah satu layanan",
  }),
  message: z
    .string()
    .trim()
    .min(10, "Ceritakan kebutuhan Anda minimal 10 karakter")
    .max(1000, "Pesan terlalu panjang (maks 1000 karakter)"),
  /**
   * Honeypot anti-bot: field tersembunyi yang seharusnya tetap KOSONG.
   * Bot yang mengisi semua field akan terdeteksi & ditolak (tidak disimpan).
   */
  website: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Data lead yang disimpan ke Firestore (dengan metadata). */
export type LeadRecord = LeadInput & {
  createdAt: string;
  source: string;
  userAgent?: string;
};
