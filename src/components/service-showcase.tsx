import { ArrowRight, Check, MessageCircle } from "lucide-react";
import Image from "next/image";
import type { Service } from "@/lib/services";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/**
 * Blok layanan besar (landing) — nomor, judul, tagline, poin unggulan, dan
 * CTA ganda ("Lihat Detail" & "Konsultasi"). Visual bergantian kiri/kanan
 * berdasarkan `index` (genap = visual kiri, ganjil = visual kanan).
 */
export function ServiceShowcase({
  service,
  index,
  whatsapp,
}: {
  service: Service;
  index: number;
  whatsapp?: string;
}) {
  const flip = index % 2 === 1;
  const number = String(index + 1).padStart(2, "0");

  return (
    <Reveal>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Visual */}
        <div className={cn(flip && "lg:order-2")}>
          <div className="relative">
            <div
              className={cn(
                "absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br opacity-15 blur-2xl",
                service.accent,
              )}
              aria-hidden="true"
            />
            {service.image ? (
              <div className="relative aspect-[3/2]">
                <Image
                  src={service.image}
                  alt={service.imageAlt ?? service.title}
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-contain drop-shadow-xl"
                />
                <span
                  className={cn(
                    "absolute top-1 left-1 z-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-br px-3 py-1.5 text-xs font-semibold text-white shadow-lg",
                    service.accent,
                  )}
                >
                  <Icon name={service.icon} className="h-3.5 w-3.5" />
                  {number}
                </span>
              </div>
            ) : (
              <div className="relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-surface to-white">
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-[0.06]",
                    service.accent,
                  )}
                  aria-hidden="true"
                />
                <span className="text-[7rem] leading-none font-black text-secondary/5 sm:text-[9rem]">
                  {number}
                </span>
                <span
                  className={cn(
                    "absolute grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br text-white shadow-xl shadow-slate-900/10",
                    service.accent,
                  )}
                >
                  <Icon name={service.icon} className="h-12 w-12" />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Teks */}
        <div className={cn(flip && "lg:order-1")}>
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-primary uppercase">
            Layanan {number}
            <span className="h-px w-8 bg-primary/30" />
          </span>
          <h2 className="mt-3 text-2xl font-bold text-secondary sm:text-3xl">
            {service.title}
          </h2>
          <p className="mt-2 text-base font-medium text-primary">
            {service.tagline}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            {service.description}
          </p>

          {service.landingPoints.length > 0 && (
            <ul className="mt-6 flex flex-col gap-2.5">
              {service.landingPoints.map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm text-slate-700">{p}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink
              href={`/layanan/${service.slug}`}
              size="lg"
              className="group"
            >
              Lihat Detail Layanan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </ButtonLink>
            <ButtonAnchor
              href={waLink(service.waMessage, whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              variant="outline"
              className="group"
            >
              <MessageCircle className="h-4 w-4" />
              Konsultasi
            </ButtonAnchor>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
