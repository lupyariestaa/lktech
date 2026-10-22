import type { LucideIcon } from "lucide-react";
import {
  isNavActive,
  matchNavItem,
  titleForNavPath,
} from "@/lib/admin-nav-pure";
import { SETTINGS_NAV } from "@/lib/settings-nav";
import {
  BarChart3,
  Files,
  FolderKanban,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Mail,
  Newspaper,
  Package,
  PanelsTopLeft,
  Percent,
  ReceiptText,
  ScrollText,
  Search,
  Settings,
  Star,
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

export type AdminNavChild = {
  /** Label pendek untuk daftar anak. */
  label: string;
  /** Judul lengkap untuk header shell & metadata. */
  title: string;
  href: string;
  icon?: LucideIcon;
  /** Hanya OWNER yang boleh melihat/mengakses item ini. */
  ownerOnly?: boolean;
};

export type AdminNavItem = {
  /** Label pendek untuk sidebar & tooltip rail. */
  label: string;
  /** Judul lengkap untuk header shell & metadata halaman. */
  title: string;
  href: string;
  icon: LucideIcon;
  /** Badge dinamis yang dirender di item ini. */
  badge?: NavBadgeKind;
  /** Hanya OWNER yang boleh melihat/mengakses item ini. */
  ownerOnly?: boolean;
  /**
   * Anak menu (accordion). Bila ada, item dirender sebagai accordion; `href`
   * tetap halaman induk/ringkasan. Generik — dapat dipakai menu apa pun.
   */
  children?: AdminNavChild[];
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
        label: "SEO",
        title: "SEO & Search Console",
        href: "/admin/seo",
        icon: Search,
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
        label: "Ulasan",
        title: "Ulasan & Rating",
        href: "/admin/reviews",
        icon: Star,
      },
      {
        label: "Broadcast",
        title: "Newsletter & Broadcast",
        href: "/admin/broadcast",
        icon: Mail,
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
        // G20: diturunkan dari satu sumber `SETTINGS_NAV` (bukan duplikat).
        children: SETTINGS_NAV.map((s): AdminNavChild => ({
          label: s.label,
          title: s.slug === "" ? "Ringkasan Pengaturan" : s.title,
          href: s.href,
          icon: s.icon,
          ownerOnly: s.ownerOnly,
        })),
      },
      {
        label: "Audit Log",
        title: "Audit Log",
        href: "/admin/audit",
        icon: ScrollText,
      },
    ],
  },
];

/** Seluruh item nav dalam satu daftar flat (termasuk turunan ke `children`). */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((g) => g.items);

/** Anak menu (flat) dari seluruh item — untuk pencocokan title & palette. */
export const ADMIN_NAV_CHILDREN: AdminNavChild[] = ADMIN_NAV_ITEMS.flatMap(
  (i) => i.children ?? [],
);

/** Seluruh tujuan navigasi (induk + anak) dalam satu daftar flat. */
export const ADMIN_NAV_ALL_TARGETS: Array<{
  label: string;
  title: string;
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}> = [
  ...ADMIN_NAV_ITEMS.map((i) => ({
    label: i.label,
    title: i.title,
    href: i.href,
    icon: i.icon,
    ownerOnly: i.ownerOnly,
  })),
  ...ADMIN_NAV_CHILDREN.map((c) => ({
    label: c.label,
    title: c.title,
    href: c.href,
    icon: c.icon ?? Settings,
    ownerOnly: c.ownerOnly,
  })),
];

/** Item aktif bila pathname sama persis ATAU prefix path anaknya. */
export function isAdminItemActive(href: string, pathname: string): boolean {
  return isNavActive(href, pathname);
}

/**
 * Item induk yang cocok dengan pathname (prefix terpanjang menang). Bila pathname
 * menunjuk ke sebuah ANAK, induk pemilik anak itulah yang dikembalikan.
 */
export function matchAdminItem(pathname: string): AdminNavItem | null {
  return matchNavItem(ADMIN_NAV_ITEMS, pathname);
}

/** Judul lengkap (title) untuk pathname — pakai child bila ada (mis. "Kontak & Identitas"). */
export function titleForPathname(pathname: string): string | null {
  return titleForNavPath(ADMIN_NAV_ITEMS, pathname);
}
