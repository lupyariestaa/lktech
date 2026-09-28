import type { Metadata } from "next";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ServiceCard } from "@/components/service-card";
import { Reveal } from "@/components/motion";
import { ButtonAnchor } from "@/components/ui/button";
import { PROCESS, SERVICES } from "@/lib/content";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Layanan — LKTech",
  description:
    "Layanan LKTech: pembuatan website, aplikasi mobile, konsultasi teknologi, desain & branding, serta digital marketing untuk bisnis Anda.",
  alternates: { canonical: "/layanan" },
  openGraph: {
    title: "Layanan — LKTech",
    description:
      "Pembuatan website, aplikasi mobile, konsultasi teknologi, desain & branding, dan digital marketing.",
    url: "/layanan",
  },
};

export default function LayananPage() {
  return (
    <>
      <PageHero
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Layanan" }]}
        eyebrow="Layanan Kami"
        title={
          <>
            Solusi digital{" "}
            <span className="text-gradient">lengkap &amp; terpadu</span>
          </>
        }
        description="Pilih layanan yang Anda butuhkan, atau konsultasikan kebutuhan Anda — kami bantu temukan kombinasi yang paling tepat untuk bisnis Anda."
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
            Konsultasi Gratis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </ButtonAnchor>
          <ButtonAnchor href="/#layanan" size="lg" variant="outline">
            Lihat di Beranda
          </ButtonAnchor>
        </div>
      </PageHero>

      <section className="relative bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, i) => (
              <Reveal key={service.slug} delay={i * 0.06}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Alur kerja ringkas */}
      <section className="relative bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-secondary sm:text-3xl">
            Bagaimana <span className="text-gradient">kami bekerja?</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted">
            Setiap layanan dikerjakan dengan alur yang jelas dan transparan, dari
            konsultasi hingga dukungan pasca-rilis.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((item, i) => (
              <Reveal key={item.step} delay={i * 0.08}>
                <div className="relative h-full rounded-3xl border border-slate-100 bg-surface p-6">
                  <span className="text-3xl font-bold text-primary/20">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-secondary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
