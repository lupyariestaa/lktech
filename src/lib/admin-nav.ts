import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Files,
  FolderKanban,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Newspaper,
  Package,
  PanelsTopLeft,
  Percent,
  ReceiptText,
  Settings,
  Tags,
  Users,
} from "lucide-react";

/**
 * Konfigurasi navigasi dashboard admin — satu sumber kebenaran.
 *
 * Dipakai oleh: sidebar (desktop + drawer), judul header shell,
 * command palette, dan metadata halaman. Label = teks pendek di
 * sidebar/tooltip rail; title = judul lengkap untuk header & metadata.
 */

/** Jenis badge dinamis yang bisa dirender pada item menu. */
export type NavBadgeKind = "newLeads" | "newOrders";

export type AdminNavItem = {
  /** Label pendek untuk sidebar & tooltip rail. */
  label: string;
  /** Judul lengkap untuk header shell & metadata halaman. */
  title: string;
  href: string;
  icon: LucideIcon;
  /** Badge dinamis yang dirender di item ini. */
  badge?: NavBadgeKind;
};

export type AdminNavGroup = {
  id: string;
  /** Kosong/undefined = grup utama (tanpa section label). */
  label?: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: "utama",
    items: [
      {
        label: "Ringkasan",
        title: "Ringkasan",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Analitik",
        title: "Analitik Penjualan",
        href: "/admin/analytics",
        icon: BarChart3,
      },
      {
        label: "Lead",
        title: "Lead & Pesan",
        href: "/admin/leads",
        icon: Inbox,
        badge: "newLeads",
      },
    ],
  },
  {
    id: "konten",
    label: "Konten Website",
    items: [
      {
        label: "Hero",
        title: "Hero",
        href: "/admin/hero",
        icon: PanelsTopLeft,
      },
      {
        label: "Konten Beranda",
        title: "Konten Beranda",
        href: "/admin/content",
        icon: Files,
      },
      {
        label: "Harga",
        title: "Harga",
        href: "/admin/pricing",
        icon: Tags,
      },
      {
        label: "FAQ",
        title: "FAQ",
        href: "/admin/faq",
        icon: HelpCircle,
      },
      {
        label: "Portofolio",
        title: "Portofolio",
        href: "/admin/projects",
        icon: FolderKanban,
      },
      {
        label: "Blog",
        title: "Blog",
        href: "/admin/blog",
        icon: Newspaper,
      },
    ],
  },
  {
    id: "toko",
    label: "Toko",
    items: [
      {
        label: "Produk",
        title: "Produk",
        href: "/admin/products",
        icon: Package,
      },
      {
        label: "Pesanan",
        title: "Pesanan",
        href: "/admin/orders",
        icon: ReceiptText,
        badge: "newOrders",
      },
      {
        label: "Kupon",
        title: "Kupon / Diskon",
        href: "/admin/coupons",
        icon: Percent,
      },
      {
        label: "Pengguna",
        title: "Pengguna",
        href: "/admin/users",
        icon: Users,
      },
    ],
  },
  {
    id: "aset",
    label: "Aset",
    items: [
      {
        label: "Media",
        title: "Media",
        href: "/admin/media",
        icon: ImageIcon,
      },
    ],
  },
  {
    id: "sistem",
    label: "Sistem",
    items: [
      {
        label: "Pengaturan",
        title: "Pengaturan",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

/** Seluruh item nav dalam satu daftar flat. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap(
  (g) => g.items,
);

/** Item aktif bila pathname sama persis ATAU prefix path anaknya. */
export function isAdminItemActive(href: string, pathname: string): boolean {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Item yang cocok dengan pathname (prefix terpanjang menang). */
export function matchAdminItem(pathname: string): AdminNavItem | null {
  return (
    [...ADMIN_NAV_ITEMS]
      .sort((a, b) => b.href.length - a.href.length)
      .find((n) => isAdminItemActive(n.href, pathname)) ?? null
  );
}
