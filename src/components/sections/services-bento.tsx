"use client";

import type { MouseEvent } from "react";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { TrackedLink } from "@/components/tracked-link";
import { Icon } from "@/components/icon";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/services";

/**
 * F4 — Services: Bento Grid (beranda).
 *
 * Mengganti grid 3 kolom seragam menjadi **bento** (kartu besar + kecil) dengan
 * hierarki visual: kartu pertama jadi "unggulan" (kolom lebar + poin singkat),
 * sisanya kartu ringkas. Interaksi hover diperkaya dengan **spotlight yang
 * mengikuti kursor** (radial-gradient + CSS var) — murah (tanpa state React /
 * framer-motion per kartu) dan tetap aksesibel lewat keyboard (kartu = tautan).
 *
 * Catatan cakupan (sama seperti F3): komponen ini **khusus beranda**.
 * `src/components/sections/services.tsx` (grid) **tidak diubah** karena juga
 * dipakai `/tentang`.
 *
 * Konten TIDAK dipangkas: tiap layanan tetap menampilkan ikon, judul, tagline,
 * deskripsi, dan tautan "Lihat detail"; kartu unggulan menambah poin singkat
 * (`landingPoints`) yang sudah ada di sumber data.
 */
export function ServicesBento() {
  return (
    <section id="layanan" className="relative scroll-mt-24 bg-surface py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          align="left"
          eyebrow="Layanan Kami"
          title={
            <>
              Solusi digital lengkap untuk{" "}
              <span className="text-gradient">kebutuhan bisnis Anda</span>
            </>
          }
          description="Dari website hingga aplikasi mobile, kami siap membantu di setiap tahap perjalanan digital bisnis Anda."
          action={
            <TrackedLink
              href="/layanan"
              location="services"
              target="/layanan"
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 py-3 text-sm font-semibold text-secondary backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-lg hover:shadow-primary/10"
            >
              Lihat semua layanan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </TrackedLink>
          }
        />

        {/* Bento: kartu unggulan jadi banner lebar (baris 1), 4 layanan lain
            sebaris di bawahnya (baris 2). Hierarki jelas tanpa ruang kosong. */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
          {SERVICES.map((service, i) => (
            <Reveal
              key={service.slug}
              delay={i * 0.06}
              className={cn(
                "h-full",
                i === 0
                  ? "sm:col-span-2 lg:col-span-12"
                  : "sm:col-span-1 lg:col-span-3",
              )}
            >
              <BentoServiceCard service={service} feature={i === 0} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoServiceCard({
  service,
  feature = false,
}: {
  service: Service;
  feature?: boolean;
}) {
  // Spotlight mengikuti kursor: cukup tulis CSS var pada elemen (tanpa state),
  // sehingga tidak memicu re-render. Aman saat pointer non-aktif.
  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <TrackedLink
      href={`/layanan/${service.slug}`}
      location="services-bento"
      target={`/layanan/${service.slug}`}
      onMouseMove={onMove}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10",
        feature ? "p-7 lg:p-8" : "p-6",
      )}
    >
      {/* Spotlight (mengikuti kursor) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), rgba(0,78,223,0.09), transparent 62%)",
        }}
      />
      {/* Glow aksen di sudut */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-16 -right-16 rounded-full bg-gradient-to-br opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25",
          service.accent,
          feature ? "h-56 w-56" : "h-40 w-40",
        )}
      />

      <div
        className={cn(
          "relative flex gap-6",
          feature
            ? "flex-col lg:flex-row lg:items-center lg:gap-10"
            : "flex-col",
        )}
      >
        {/* Blok identitas layanan (ikon + teks) */}
        <div
          className={cn(
            "flex flex-col gap-4",
            feature ? "lg:max-w-md lg:flex-1" : "flex-1",
          )}
        >
          <div
            className={cn(
              "grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-105",
              service.accent,
              feature ? "h-16 w-16" : "h-14 w-14",
            )}
          >
            <Icon
              name={service.icon}
              className={feature ? "h-7 w-7" : "h-6 w-6"}
            />
          </div>

          <div>
            <h3
              className={cn(
                "font-bold text-secondary transition-colors group-hover:text-primary",
                feature ? "text-xl sm:text-2xl" : "text-lg",
              )}
            >
              {service.title}
            </h3>
            <p className="mt-1.5 text-sm font-medium text-primary">
              {service.tagline}
            </p>
            <p
              className={cn(
                "mt-2 leading-relaxed text-muted",
                feature ? "text-sm sm:text-base" : "text-sm",
              )}
            >
              {service.description}
            </p>
          </div>
        </div>

        {/* Poin singkat — hanya pada kartu unggulan */}
        {feature && service.landingPoints.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:flex-1 lg:grid-cols-1">
            {service.landingPoints.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-surface/70 px-4 py-3 text-sm text-secondary"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>

      <span
        className={cn(
          "relative inline-flex items-center gap-1.5 text-sm font-semibold text-primary",
          feature ? "mt-6 lg:mt-8" : "mt-auto pt-6",
        )}
      >
        Lihat detail
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </TrackedLink>
  );
}
