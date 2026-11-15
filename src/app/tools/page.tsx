import type { Metadata } from "next";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { SectionHeading } from "@/components/section-heading";
import { JsonLdScript } from "@/components/json-ld-script";
import { ToolsHero } from "@/components/tools/landing/tools-hero";
import { ToolsIntentGrid } from "@/components/tools/landing/tools-intent-grid";
import { ToolsDemo } from "@/components/tools/landing/tools-demo";
import { ToolsPrivacyProof } from "@/components/tools/landing/tools-privacy-proof";
import { ToolsShowcase } from "@/components/tools/landing/tools-showcase";
import { ToolsWorkflow } from "@/components/tools/landing/tools-workflow";
import { ToolsFaqCta } from "@/components/tools/landing/tools-faq-cta";
import { ToolsStickyCta } from "@/components/tools/landing/tools-sticky-cta";
import { TOOLS, toolGuideHref } from "@/lib/tools-registry-pure";
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
  title: "LKTech Tools — Berkas beres, tanpa unggah",
  description:
    "Kompres gambar ke WebP, susun PDF, ubah PDF jadi gambar, ambil warna, dan rapikan teks. Semua diproses lokal di browser — berkas tidak diunggah ke server. Gratis dengan akun LKTech.",
  keywords: [
    "tools online",
    "kompres gambar webp",
    "gambar ke pdf",
    "pdf ke gambar",
    "color picker",
    "formatter json",
    "tanpa upload",
  ],
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "LKTech Tools — Berkas beres, tanpa unggah",
    description:
      "Lima tool produktivitas yang berjalan lokal di browser: gambar, PDF, warna, dan teks. Tanpa unggah berkas.",
    url: "/tools",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LKTech Tools — Berkas beres, tanpa unggah",
    description:
      "Kompres gambar, susun PDF, ambil warna, dan rapikan teks — semua lokal di browser.",
  },
};

const TOOLS_FAQ: ServiceFaq[] = [
  {
    question: "Apakah berkas saya benar-benar tidak diunggah?",
    answer:
      "Ya. Tool memproses gambar, PDF, dan teks langsung di browser Anda. Tidak ada request berisi berkas ke server LKTech. Anda bisa memverifikasinya sendiri lewat DevTools → Network saat memproses berkas.",
  },
  {
    question: "Kenapa saya perlu akun LKTech?",
    answer:
      "Akun membantu kami menjaga akses tetap terkontrol dan mencegah penyalahgunaan. Login tidak memberi kami akses ke berkas Anda — proses tetap berjalan lokal di browser.",
  },
  {
    question: "Apakah bisa dipakai di HP?",
    answer:
      "Bisa, selama browser modern mendukung fitur yang dipakai tool. Untuk berkas besar seperti PDF puluhan halaman, desktop biasanya lebih nyaman.",
  },
  {
    question: "Apa batas ukuran berkas?",
    answer:
      "Batasnya berbeda per tool: gambar hingga 15 MB, PDF hingga 25 MB dengan maksimal 30 halaman per proses, dan teks hingga 2 juta karakter. Batas tersebut ditampilkan di kartu dan workspace masing-masing tool.",
  },
  {
    question: "Apakah hasil saya disimpan?",
    answer:
      "Tidak. Hasil hanya ada di sesi browser Anda dan hilang saat halaman ditutup atau tool diatur ulang. Yang tersimpan di perangkat hanya preferensi lokal berupa slug tool (terakhir dipakai dan favorit).",
  },
  {
    question: "Apakah LKTech Tools gratis?",
    answer:
      "Ya. Saat ini seluruh tool dapat dipakai gratis setelah Anda masuk dengan akun LKTech.",
  },
];

export default function ToolsLandingPage() {
  const breadcrumbLd = buildBreadcrumb(
    [{ label: "Beranda", href: "/" }, { label: "Tools" }],
    SITE.url,
  );
  const itemListLd = buildItemList(
    TOOLS.map((tool) => ({
      name: tool.name,
      url: `${SITE.url}${toolGuideHref(tool.slug)}`,
    })),
    "Panduan LKTech Tools",
  );
  const faqLd = buildFaqPage(TOOLS_FAQ);

  return (
    <>
      <JsonLdScript
        node={[breadcrumbLd, itemListLd, faqLd].filter(
          (node): node is JsonLd => node !== null,
        )}
      />

      <Navbar />
      <main id="konten">
        <ToolsHero />
        <ToolsIntentGrid />

        <section
          id="demo"
          className="relative scroll-mt-24 bg-white py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading
              eyebrow="Demo"
              title={
                <>
                  Coba rasakan <span className="text-gradient">lokalnya.</span>
                </>
              }
              description="Dua demo kecil tanpa akun: pilih warna dan rapikan JSON. Workspace lengkap ada di ruang tools."
            />
            <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
              <ToolsDemo />
              <ToolsPrivacyProof />
            </div>
          </div>
        </section>

        <ToolsShowcase />
        <ToolsWorkflow />
        <ToolsFaqCta items={TOOLS_FAQ} />
      </main>
      <Footer />
      <ToolsStickyCta />
    </>
  );
}
