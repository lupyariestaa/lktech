import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { FaqAccordion } from "@/components/faq-accordion";
import { ToolsCta } from "@/components/tools/tools-cta";
import { ToolsFeedback } from "@/components/tools/tools-feedback";
import type { ServiceFaq } from "@/lib/content";

/**
 * FAQ + CTA akhir landing. Satu section, dua kolom; FAQ tetap memakai accordion
 * yang sama dengan halaman layanan dan JSON-LD dibangun dari daftar yang sama
 * oleh pemanggil.
 */
export function ToolsFaqCta({ items }: { items: ServiceFaq[] }) {
  return (
    <section id="faq" className="relative scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Masih ada <span className="text-gradient">pertanyaan?</span>
            </>
          }
          description="Hal yang paling sering ditanyakan soal LKTech Tools dan cara kerjanya."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <FaqAccordion items={items} />
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Butuh langkah detail dan batas tiap tool?{" "}
              <Link
                href="/tools/panduan"
                className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Baca panduan publik
              </Link>
              .
            </p>
            <ToolsFeedback />
          </div>

          <div className="rounded-3xl border border-primary-100 bg-primary-50/60 p-6 sm:p-7">
            <h3 className="text-xl font-bold text-secondary">
              Siap membereskan berkas?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Gratis. Tanpa unggah. Tanpa instalasi. Masuk sekali, lalu pilih
              tool yang Anda butuhkan.
            </p>

            <ul className="mt-5 flex flex-col gap-2 text-xs font-medium text-secondary">
              {[
                "Berkas diproses lokal di browser",
                "5 tool dalam satu ruang",
                "Tidak ada riwayat berkas di server",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-2">
              <ToolsCta location="faq" target="/tools/ruang">
                Buka ruang tools
              </ToolsCta>
              <Link
                href="/kontak"
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-secondary transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                Ada pertanyaan lain?
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
