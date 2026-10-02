import type { Metadata } from "next";

export const metadata: Metadata = {
  // Absolute: halaman admin tidak ikut template "%s | LKTech" (tab & riwayat
  // memakai judul per halaman, mis. "Lead & Pesan — Admin").
  title: {
    absolute: "Admin — LKTech",
    template: "%s — Admin",
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // AuthProvider sudah disediakan di root layout (dipakai bersama area user).
  return <>{children}</>;
}
