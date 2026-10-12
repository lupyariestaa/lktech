import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  Contact,
  CreditCard,
  DatabaseBackup,
  Gauge,
  Plug,
  Search,
  ShieldCheck,
} from "lucide-react";

/**
 * Navigasi halaman Pengaturan — **SATU SUMBER KEBENARAN** (gap G20).
 *
 * Dipakai oleh: sidebar admin (`admin-nav.ts` membangun `children` dari sini),
 * `SettingsShell` (judul header), ringkasan (`settings-overview.tsx`), dan
 * metadata halaman. Jangan lagi menulis daftar sub-menu terpisah.
 */
export type SettingsNavEntry = {
  slug: string; // "" untuk induk/ringkasan
  href: string;
  /** Label pendek untuk sidebar/kartu ringkasan. */
  label: string;
  /** Judul lengkap untuk header shell & metadata. */
  title: string;
  desc: string;
  icon: LucideIcon;
};

export const SETTINGS_NAV: SettingsNavEntry[] = [
  {
    slug: "",
    href: "/admin/settings",
    label: "Ringkasan",
    title: "Pengaturan",
    desc: "Ringkasan status konfigurasi situs & pintasan ke tiap bagian.",
    icon: Gauge,
  },
  {
    slug: "kontak",
    href: "/admin/settings/kontak",
    label: "Kontak & Identitas",
    title: "Kontak & Identitas",
    desc: "Email, WhatsApp, lokasi, media sosial, serta identitas brand.",
    icon: Contact,
  },
  {
    slug: "notifikasi",
    href: "/admin/settings/notifikasi",
    label: "Notifikasi",
    title: "Notifikasi",
    desc: "Kendali email otomatis ke pembeli & pengingat keranjang.",
    icon: Bell,
  },
  {
    slug: "pembayaran",
    href: "/admin/settings/pembayaran",
    label: "Pembayaran",
    title: "Pembayaran & Mayar",
    desc: "Kesehatan pembayaran online & metrik penggunaan.",
    icon: CreditCard,
  },
  {
    slug: "integrasi",
    href: "/admin/settings/integrasi",
    label: "Integrasi",
    title: "Integrasi & API",
    desc: "Status layanan eksternal (Mayar, Resend, Cloudinary, Upstash, Cron) + uji koneksi.",
    icon: Plug,
  },
  {
    slug: "seo",
    href: "/admin/settings/seo",
    label: "SEO & Situs",
    title: "SEO & Situs",
    desc: "Meta default, Open Graph, verifikasi mesin pencari, robots.",
    icon: Search,
  },
  {
    slug: "keamanan",
    href: "/admin/settings/keamanan",
    label: "Keamanan & Akses",
    title: "Keamanan & Akses",
    // Gap G21: deskripsi sebelumnya menyebut "sesi, rate-limit, maintenance"
    // yang tak dikelola di halaman ini.
    desc: "Kelola daftar admin yang boleh mengakses dashboard.",
    icon: ShieldCheck,
  },
  {
    slug: "backup",
    href: "/admin/settings/backup",
    label: "Backup & Restore",
    title: "Backup & Restore",
    desc: "Ekspor & impor data terpilih (pengaturan, produk, kupon, pesanan, dst).",
    icon: DatabaseBackup,
  },
  {
    slug: "lanjutan",
    href: "/admin/settings/lanjutan",
    label: "Lanjutan",
    title: "Lanjutan & Sistem",
    desc: "Mode pemeliharaan (termasuk konten halaman), cache, info sistem.",
    icon: CalendarClock,
  },
];

/** Cari entri nav berdasarkan slug route aktif ("" = induk). */
export function findSettingsNav(slug: string): SettingsNavEntry | undefined {
  return SETTINGS_NAV.find((n) => n.slug === slug);
}
