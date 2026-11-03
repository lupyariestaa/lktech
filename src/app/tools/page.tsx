import type { Metadata } from "next";
import {
  ArrowRight,
  History,
  Laptop,
  Lock,
  Search,
  Upload,
} from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { PageHero } from "@/components/page-hero";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/motion";
import { ToolCard } from "@/components/tools/tool-card";
import { FaqAccordion } from "@/components/faq-accordion";
import { ButtonLink } from "@/components/ui/button";
import { JsonLdScript } from "@/components/json-ld-script";
import { TOOLS } from "@/lib/tools-registry-pure";
import { SITE } from "@/lib/site";
import {
  buildBreadcrumb,
  buildFaqPage,
  buildItemList,
  type JsonLd,
} from "@/lib/structured-data-pure";
import type { ServiceFaq } from "@/lib/content";

/**
 * Landing page publik LKTech Tools — pintu masuk sebelum ruang tools yang
 * butuh login (`/tools/ruang`). Halaman ini sengaja `index, follow` (SEO
 * publik); ruang & workspace tool tetap `noindex`.
 */
export const metadata: Metadata = {
  title: "LKTech Tools — Tools produktivitas gratis, langsung di browser",
  description:
    "Kumpulan tools produktivitas LKTech: color picker, konversi gambar ke WebP, susun gambar ke PDF, PDF ke gambar, dan formatter teks. Semua diproses lokal di browser — berkas tidak diunggah ke server.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "LKTech Tools — Tools produktivitas gratis",
    description:
      "Color picker, konversi gambar/PDF, dan formatter teks yang berjalan lokal di browser Anda.",
    url: "/tools",
  },
};

const STEPS = [
  {
    icon: Lock,
    title: "Masuk ke ruang tools",
    description:
      "Gunakan akun LKTech Anda. Gratis, dan hanya perlu masuk sekali untuk membuka semua tool.",
  },
  {
    icon: Search,
    title: "Pilih tool",
    description:
      "Cari atau filter tool sesuai kebutuhan — dari pengelolaan warna sampai konversi PDF.",
  },
  {
    icon: Laptop,
    title: "Proses di browser",
    description:
      "Berkas diproses lokal di perangkat Anda. Tidak ada yang diunggah ke server kami.",
  },
] as const;

const PRIVACY = [
  {
    icon: Laptop,
    title: "100% lokal di browser",
    description:
      "Gambar, PDF, teks, dan warna diproses langsung di perangkat Anda, bukan di server.",
  },
  {
    icon: Upload,
    title: "Tanpa unggahan",
    description:
      "Berkas yang Anda pilih tidak dikirim maupun disimpan di server LKTech.",
  },
  {
    icon: History,
    title: "Tanpa riwayat",
    description:
      "Kami tidak menyimpan berkas atau hasil yang Anda proses di browser.",
  },
] as const;

const TOOLS_FAQ: ServiceFaq[] = [
  {
    question: "Apakah LKTech Tools gratis?",
    answer:
      "Ya. Saat ini seluruh tool dapat dipakai gratis setelah Anda masuk dengan akun LKTech.",
  },
  {
    question: "Apakah berkas saya diunggah ke server?",
    answer:
      "Tidak. Semua tool memproses berkas lokal di browser Anda; tidak ada berkas yang dikirim atau disimpan di server.",
  },
  {
    question: "Apakah saya perlu akun untuk memakai tool?",
    answer:
      "Ya. Ruang tools memerlukan login agar penggunaan tetap terjaga. Setelah masuk, Anda langsung diarahkan ke ruang tools.",
  },
  {
    question: "Apakah ada batas ukuran berkas?",
    answer:
      "Ada, dan ditampilkan jujur di tiap tool. Contohnya gambar hingga 15 MB per berkas dan PDF hingga 25 MB dengan maksimal 30 halaman per proses.",
  },
  {
    question: "Apakah hasil saya disimpan?",
    answer:
      "Tidak. Hasil hanya ada di sesi browser Anda dan hilang saat Anda mengatur ulang tool atau menutup halaman.",
  },
];

export default function ToolsLandingPage() {
  const available = TOOLS.filter((t) => t.status === "tersedia").length;

  const breadcrumbLd = buildBreadcrumb(
    [{ label: "Beranda", href: "/" }, { label: "Tools" }],
    SITE.url,
  );
  const itemListLd = buildItemList(
    TOOLS.map((t) => ({ name: t.name, url: `${SITE.url}/tools/${t.slug}` })),
    "LKTech Tools",
  );
  const faqLd = buildFaqPage(TOOLS_FAQ);

  return (
    <>
      <JsonLdScript
        node={[breadcrumbLd, itemListLd, faqLd].filter(
          (n): n is JsonLd => n !== null,
        )}
      />

      <Navbar />
      <main id="konten">
        <PageHero
          breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Tools" }]}
          eyebrow="LKTech Tools"
          title={
            <>
              Tools praktis, langsung{" "}
              <span className="text-gradient">di browser</span>
            </>
          }
          description="Color picker, konversi gambar & PDF, sampai formatter teks — semua dalam satu ruang. Tanpa unggah berkas, tanpa menyimpan data Anda."
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/tools/ruang" size="lg" className="group">
              <Lock className="h-5 w-5" />
              Masuk ke Tools
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </ButtonLink>
            <ButtonLink href="#tool" size="lg" variant="outline">
              Lihat daftar tool
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs font-medium text-muted">
            Gratis · Butuh akun LKTech · Tanpa unggah berkas
          </p>
        </PageHero>

        {/* Daftar tool */}
        <section id="tool" className="relative scroll-mt-24 bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading
              eyebrow="Tool"
              title={
                <>
                  Semua tool, <span className="text-gradient">satu tempat</span>
                </>
              }
              description={`${available} tool siap dipakai sekarang — dan akan bertambah seiring waktu.`}
            />
            <Reveal className="mt-12">
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {TOOLS.map((tool) => (
                  <li key={tool.slug} className="h-full">
                    <ToolCard tool={tool} />
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Cara kerja */}
        <section className="relative bg-surface py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading
              eyebrow="Cara Kerja"
              title={
                <>
                  Mulai dalam <span className="text-gradient">tiga langkah</span>
                </>
              }
              description="Tidak ada pemasangan, tidak ada berkas yang menunggu diunggah. Pilih, proses, selesai."
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.08}>
                  <div className="h-full rounded-3xl border border-slate-100 bg-white p-6">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary">
                      <step.icon className="h-6 w-6" />
                    </span>
                    <p className="mt-5 text-xs font-semibold text-muted">
                      Langkah {i + 1}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-secondary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Privasi */}
        <section className="relative bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading
              eyebrow="Privasi"
              title={
                <>
                  Berkas Anda <span className="text-gradient">tetap milik Anda</span>
                </>
              }
              description="Dirancang agar data sensitif tidak pernah meninggalkan perangkat Anda."
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-3">
              {PRIVACY.map((item, i) => (
                <Reveal key={item.title} delay={i * 0.08}>
                  <div className="flex h-full gap-4 rounded-3xl border border-slate-100 bg-white p-6">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <item.icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-secondary">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative bg-surface py-20">
          <div className="mx-auto max-w-3xl px-6">
            <SectionHeading
              eyebrow="FAQ"
              title={
                <>
                  Pertanyaan <span className="text-gradient">umum</span>
                </>
              }
              description="Hal-hal yang paling sering ditanyakan soal LKTech Tools."
            />
            <Reveal className="mt-12">
              <FaqAccordion items={TOOLS_FAQ} />
            </Reveal>
          </div>
        </section>

        {/* CTA penutup */}
        <section className="relative bg-white py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <SectionHeading
              eyebrow="Siap Mulai?"
              title={
                <>
                  Buka ruang tools{" "}
                  <span className="text-gradient">sekarang</span>
                </>
              }
              description="Masuk dengan akun LKTech Anda dan langsung pakai semua tool. Gratis."
            />
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/tools/ruang" size="lg" className="group">
                Masuk ke Tools
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink href="/kontak" size="lg" variant="outline">
                Ada pertanyaan?
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
