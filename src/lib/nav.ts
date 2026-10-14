/**
 * Model & logika navigasi utama (murni — tanpa impor ber-alias `@/` agar bisa
 * diuji lewat `node --experimental-strip-types`).
 *
 * Sebelumnya navbar menjajar 9 tautan datar (`NAV_LINKS`). Kini
 * dikelompokkan: item bertingkat (`children`) tampil sebagai dropdown saat
 * hover/fokus di desktop dan akordeon di mobile — baris navbar jadi pendek.
 */

export type NavChild = {
  label: string;
  href: string;
  /** Deskripsi singkat (tampil di panel dropdown desktop). */
  description?: string;
};

export type NavItem = {
  label: string;
  href: string;
  /** Bila ada: render sebagai dropdown (desktop) / akordeon (mobile). */
  children?: NavChild[];
};

/** Bentuk minimal yang dibutuhkan dari daftar layanan (`@/lib/services`). */
export type NavService = { slug: string; title: string; tagline: string };

/** Bangun menu navigasi. `isLanding` memakai anchor `#` untuk beranda. */
export function buildNavMenu(
  isLanding: boolean,
  services: readonly NavService[],
): NavItem[] {
  return [
    { label: "Beranda", href: isLanding ? "/#beranda" : "/" },
    {
      label: "Layanan",
      href: "/layanan",
      // Satu sumber untuk dropdown desktop & akordeon mobile: tautan ke halaman
      // induk ("Semua Layanan") lebih dulu, lalu tiap layanan. TIDAK ada lagi
      // tautan "Semua" tambahan di komponen (dulu duplikat di menu mobile).
      children: [
        {
          label: "Semua Layanan",
          href: "/layanan",
          description: "Lihat seluruh layanan LKTech",
        },
        ...services.map((s) => ({
          label: s.title,
          href: `/layanan/${s.slug}`,
          description: s.tagline,
        })),
      ],
    },
    { label: "Produk", href: "/produk" },
    { label: "Portofolio", href: "/portofolio" },
    {
      label: "Harga",
      href: "/harga",
      children: [
        {
          label: "Paket & Harga",
          href: "/harga",
          description: "Pilihan paket sesuai kebutuhan",
        },
        {
          label: "Promo & Kupon",
          href: "/promo",
          description: "Penawaran yang sedang berlaku",
        },
        {
          label: "FAQ",
          href: isLanding ? "/#faq" : "/kontak",
          description: "Pertanyaan yang sering diajukan",
        },
      ],
    },
    { label: "Blog", href: "/blog" },
    { label: "Tentang", href: "/tentang" },
  ];
}

/** Apakah `href` menunjuk rute aktif (abaikan hash & query). */
export function isActiveHref(pathname: string, href: string): boolean {
  const path = href.split(/[?#]/)[0] || "/";
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}