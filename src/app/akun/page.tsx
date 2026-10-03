import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { UserGuard } from "@/components/auth/user-guard";
import { UserAccount } from "@/components/auth/user-account";

export const metadata: Metadata = {
  title: "Akun Saya",
  description: "Kelola akun, profil, dan pesanan Anda di LKTech.",
  robots: { index: false, follow: false },
};

export default function AkunPage() {
  return (
    <>
      <Navbar />
      <main id="konten">
        <UserGuard>
          <UserAccount />
        </UserGuard>
      </main>
      <Footer />
    </>
  );
}
