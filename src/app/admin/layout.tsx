import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — LKTech",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // AuthProvider sudah disediakan di root layout (dipakai bersama area user).
  return <>{children}</>;
}
