"use client";

import { Check, MessageCircle, Sparkles } from "lucide-react";
import { PRICING } from "@/lib/content";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { ButtonAnchor } from "@/components/ui/button";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="harga" className="relative bg-surface py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Paket Layanan"
          title={
            <>
              Pilih paket yang{" "}
              <span className="text-gradient">sesuai kebutuhan</span>
            </>
          }
          description="Setiap paket fleksibel dan bisa disesuaikan. Hubungi kami untuk penawaran terbaik tanpa biaya konsultasi."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PRICING.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300",
                  plan.highlight
                    ? "border-primary/30 bg-white shadow-2xl shadow-primary/15 lg:-translate-y-3"
                    : "border-slate-200 bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-white shadow-lg shadow-primary/30">
                    <Sparkles className="h-3 w-3" />
                    Paling Populer
                  </span>
                )}

                <h3 className="text-xl font-bold text-secondary">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted">{plan.description}</p>

                <div className="mt-5 border-y border-dashed border-slate-200 py-5">
                  <p className="text-sm font-semibold text-primary">
                    Konsultasi Gratis
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Harga menyesuaikan kebutuhan proyek Anda
                  </p>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                          plan.highlight
                            ? "bg-primary text-white"
                            : "bg-primary-50 text-primary",
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <ButtonAnchor
                  href={waLink(WA_MESSAGES.pricing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant={plan.highlight ? "primary" : "outline"}
                  className="mt-7 w-full"
                >
                  <MessageCircle className="h-4 w-4" />
                  Konsultasi Gratis
                </ButtonAnchor>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
