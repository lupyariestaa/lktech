import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "Admin — LKTech",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthProvider>{children}</AuthProvider>;
}
