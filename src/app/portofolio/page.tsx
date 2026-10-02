import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PortfolioGrid } from "@/components/portfolio-grid";
import { ButtonAnchor } from "@/components/ui/button";
import { getPortfolioMediaMap } from "@/lib/portfolio-media";
import { getProjectCategories, getProjects } from "@/lib/projects";
import { getSiteSettings } from "@/lib/settings";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

// Refresh berkala (ISR) agar gambar terbaru dari Cloudinary tampil
// tanpa perlu rebuild penuh.
export const revalidate = 60;

export const metadata: Metadata = {
    title: "Portofolio",
  description:
    "Kumpulan proyek LKTech: website, aplikasi mobile, e-commerce, branding, dan web app untuk berbagai bisnis dan institusi.",
  alternates: { canonical: "/portofolio" },
  openGraph: {
  title: "Portofolio",
    description:
      "Kumpulan proyek website, aplikasi mobile, e-commerce, branding, dan web app.",
    url: "/portofolio",
  },
};

export default async function PortofolioPage({
  searchParams,
}: {
  searchParams: Promise<{
    kategori?: string;
    q?: string;
    tema?: string;
    urut?: string;
  }>;
}) {
  const [projects, categories, mediaMap, settings, sp] = await Promise.all([
    getProjects(),
    getProjectCategories(),
    getPortfolioMediaMap(),
    getSiteSettings(),
    searchParams,
  ]);
  const coverMap: Record<string, { url: string; alt?: string }> = {};
  for (const [slug, media] of Object.entries(mediaMap)) {
    coverMap[slug] = { url: media.cover.secureUrl, alt: media.cover.alt };
  }

  // Daftar tag unik (dari semua proyek), untuk filter "Tema".
  const tags = Array.from(new Set(projects.flatMap((p) => p.tags)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  // State awal dari URL (dibaca di server → aman & tanpa hydration mismatch).
  const initialCategory =
    sp.kategori && categories.includes(sp.kategori) ? sp.kategori : "Semua";
  const initialTag = sp.tema && tags.includes(sp.tema) ? sp.tema : null;
  const initialQuery = sp.q ?? "";
  const initialSort =
    sp.urut === "terlama" || sp.urut === "judul" ? sp.urut : "terbaru";

  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Portofolio" }]}
        eyebrow="Portofolio"
        title={
          <>
            Karya yang{" "}
            <span className="text-gradient">berbicara hasilnya</span>
          </>
        }
        description={`Kami telah mengerjakan ${projects.length}+ proyek lintas industri. Jelajahi studi kasus singkat di bawah untuk melihat cara kami bekerja.`}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonAnchor
            href={waLink(WA_MESSAGES.general, settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="group"
          >
            <MessageCircle className="h-5 w-5" />
            Diskusikan Proyek Anda
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </ButtonAnchor>
          <ButtonAnchor href="/layanan" size="lg" variant="outline">
            Lihat Layanan
          </ButtonAnchor>
        </div>
      </PageHero>

      <section className="relative bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <PortfolioGrid
            projects={projects}
            categories={categories}
            tags={tags}
            mediaMap={coverMap}
            initialCategory={initialCategory}
            initialTag={initialTag}
            initialQuery={initialQuery}
            initialSort={initialSort}
          />
        </div>
      </section>
    </>
  );
}
