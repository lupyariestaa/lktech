"use client";

import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { FaqAccordion } from "@/components/faq-accordion";
import { useContent } from "@/components/content-provider";

export function Faq() {
  const { faqs } = useContent();
  return (
    <section id="faq" className="relative scroll-mt-24 bg-white py-24">
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
          <FaqAccordion items={faqs} />
        </Reveal>
      </div>
    </section>
  );
}
