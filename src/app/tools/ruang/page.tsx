import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { UserGuard } from "@/components/auth/user-guard";
import { PageHero } from "@/components/page-hero";
import { ToolsCatalog } from "@/components/tools/tools-catalog";
import { TOOLS } from "@/lib/tools-registry-pure";

/**
 * Ruang LKTech Tools (katalog) — dilindungi `UserGuard`, sama seperti `/akun`.
 * Halaman pengantar publik berada di `/tools`.
 */
export const metadata: Metadata = {
  title: "Ruang LKTech Tools",
  description:
    "Katalog tools produktivitas LKTech: color picker, konversi gambar, dan PDF. Semua proses berjalan lokal di browser Anda.",
  robots: { index: false, follow: false },
};

export default function ToolsSpacePage() {
  const available = TOOLS.filter((t) => t.status === "tersedia").length;

  return (
    <>
      <Navbar />
      <main id="konten">
        <UserGuard>
          <PageHero
            breadcrumbs={[
              { label: "Beranda", href: "/" },
              { label: "Tools", href: "/tools" },
              { label: "Ruang" },
            ]}
            eyebrow="LKTech Tools"
            title={
              <>
                Tools <span className="text-gradient">praktis</span> dalam satu
                tempat
              </>
            }
            description="Pilih tool yang Anda butuhkan. Semua pemrosesan berjalan di browser Anda — berkas tidak diunggah ke server."
          />
          <section className="relative bg-white py-16">
            <div className="mx-auto max-w-6xl px-6">
              <Link
                href="/tools"
                className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Halaman pengantar LKTech Tools
              </Link>
              <p className="mb-8 text-sm text-muted">
                {available} tool tersedia saat ini, dan bertambah seiring waktu.
              </p>
              <ToolsCatalog />
            </div>
          </section>
        </UserGuard>
      </main>
      <Footer />
    </>
  );
}
