"use client";

import { FAQS } from "@/lib/content";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { FaqAccordion } from "@/components/faq-accordion";

export function Faq() {
  return (
    <section id="faq" className="relative bg-white py-24">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Pertanyaan <span className="text-gradient">umum</span>
            </>
          }
          description="Belum menemukan jawabannya? Hubungi kami langsung via WhatsApp."
        />

        <Reveal className="mt-12">
          <FaqAccordion items={FAQS} />
        </Reveal>
      </div>
    </section>
  );
}
