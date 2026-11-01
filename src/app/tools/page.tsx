import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { UserGuard } from "@/components/auth/user-guard";
import { PageHero } from "@/components/page-hero";
import { ToolsCatalog } from "@/components/tools/tools-catalog";
import { TOOLS } from "@/lib/tools-registry-pure";

export const metadata: Metadata = {
  title: "LKTech Tools",
  description:
    "Katalog tools produktivitas LKTech: color picker, konversi gambar, dan PDF. Semua proses berjalan lokal di browser Anda.",
  robots: { index: false, follow: false },
};

export default function ToolsPage() {
  const available = TOOLS.filter((t) => t.status === "tersedia").length;

  return (
    <>
      <Navbar />
      <main id="konten">
        <UserGuard>
          <PageHero
            breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Tools" }]}
            eyebrow="LKTech Tools"
            title={
              <>
                Tools <span className="text-gradient">praktis</span> dalam satu tempat
              </>
            }
            description="Pilih tool yang Anda butuhkan. Semua pemrosesan berjalan di browser Anda — berkas tidak diunggah ke server."
          />
          <section className="relative bg-white py-16">
            <div className="mx-auto max-w-6xl px-6">
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
