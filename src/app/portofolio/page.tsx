import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PortfolioGrid } from "@/components/portfolio-grid";
import { ButtonAnchor } from "@/components/ui/button";
import { PROJECTS } from "@/lib/content";
import { getPortfolioMediaMap } from "@/lib/portfolio-media";
import { getSiteSettings } from "@/lib/settings";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

// Refresh berkala (ISR) agar gambar terbaru dari Cloudinary tampil
// tanpa perlu rebuild penuh.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Portofolio — LKTech",
  description:
    "Kumpulan proyek LKTech: website, aplikasi mobile, e-commerce, branding, dan web app untuk berbagai bisnis dan institusi.",
  alternates: { canonical: "/portofolio" },
  openGraph: {
    title: "Portofolio — LKTech",
    description:
      "Kumpulan proyek website, aplikasi mobile, e-commerce, branding, dan web app.",
    url: "/portofolio",
  },
};

export default async function PortofolioPage() {
  const [mediaMap, settings] = await Promise.all([
    getPortfolioMediaMap(),
    getSiteSettings(),
  ]);
  const coverMap: Record<string, string> = {};
  for (const [slug, media] of Object.entries(mediaMap)) {
    coverMap[slug] = media.cover.secureUrl;
  }

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
        description={`Kami telah mengerjakan ${PROJECTS.length}+ proyek contoh lintas industri. Jelajahi studi kasus singkat di bawah untuk melihat cara kami bekerja.`}
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
          <PortfolioGrid mediaMap={coverMap} />
        </div>
      </section>
    </>
  );
}
