"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { ServiceCard } from "@/components/service-card";
import { SERVICES } from "@/lib/services";

/**
 * Section layanan beranda.
 *
 * SUMBER TUNGGAL (FASE H3): membaca daftar dari modul hardcoded `@/lib/services`
 * (sama dengan `/layanan`, `/layanan/[slug]`, sitemap, dan admin) — agar kartu
 * beranda selalu konsisten dengan halaman layanan, tanpa duplikasi data.
 */
export function Services() {
  return (
    <section id="layanan" className="relative scroll-mt-24 bg-surface py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Layanan Kami"
          title={
            <>
              Solusi digital lengkap untuk{" "}
              <span className="text-gradient">kebutuhan bisnis Anda</span>
            </>
          }
          description="Dari website hingga aplikasi mobile, kami siap membantu di setiap tahap perjalanan digital bisnis Anda."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <Reveal key={service.slug} delay={i * 0.06}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <Link
            href="/layanan"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-secondary backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-lg hover:shadow-primary/10"
          >
            Lihat semua layanan
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
