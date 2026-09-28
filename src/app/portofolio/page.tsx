import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PortfolioGrid } from "@/components/portfolio-grid";
import { ButtonAnchor } from "@/components/ui/button";
import { PROJECTS } from "@/lib/content";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

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

export default function PortofolioPage() {
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
            href={waLink(WA_MESSAGES.general)}
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
          <PortfolioGrid />
        </div>
      </section>
    </>
  );
}
