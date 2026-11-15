import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolsCta } from "@/components/tools/tools-cta";
import { JsonLdScript } from "@/components/json-ld-script";
import { SITE } from "@/lib/site";
import { TOOL_GUIDES, TOOL_GUIDES_UPDATED } from "@/lib/tools-guides-pure";
import {
  TOOL_CATEGORY_LABEL,
  getToolBySlug,
  toolGuideHref,
} from "@/lib/tools-registry-pure";
import {
  buildBreadcrumb,
  buildItemList,
  type JsonLd,
} from "@/lib/structured-data-pure";

export const metadata: Metadata = {
  title: "Panduan LKTech Tools — Cara Pakai Tool Gambar, PDF & Teks",
  description:
    "Panduan singkat setiap tool LKTech: kompres gambar ke WebP, gabung gambar jadi PDF, ubah PDF jadi gambar, color picker, dan formatter teks. Semua diproses lokal di browser.",
  alternates: { canonical: "/tools/panduan" },
  openGraph: {
    title: "Panduan LKTech Tools",
    description:
      "Cara pakai tool gambar, PDF, warna, dan teks yang berjalan lokal di browser.",
    url: "/tools/panduan",
    type: "website",
  },
};

/**
 * Hub panduan publik. Indexable dan tanpa login; workspace tetap di
 * `/tools/[slug]` yang dijaga `UserGuard`.
 */
export default function ToolsGuideIndexPage() {
  const guides = TOOL_GUIDES.flatMap((guide) => {
    const tool = getToolBySlug(guide.slug);
    return tool && tool.status === "tersedia" ? [{ guide, tool }] : [];
  });

  const breadcrumbLd = buildBreadcrumb(
    [
      { label: "Beranda", href: "/" },
      { label: "Tools", href: "/tools" },
      { label: "Panduan" },
    ],
    SITE.url,
  );
  const itemListLd = buildItemList(
    guides.map(({ tool }) => ({
      name: tool.name,
      url: `${SITE.url}${toolGuideHref(tool.slug)}`,
    })),
    "Panduan LKTech Tools",
  );

  return (
    <>
      <JsonLdScript
        node={[breadcrumbLd, itemListLd].filter(
          (node): node is JsonLd => node !== null,
        )}
      />

      <Navbar />
      <main id="konten">
        <section className="relative overflow-hidden bg-white pt-32 pb-20 sm:pt-36">
          <div className="grid-lines absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute -top-24 -left-24 h-[24rem] w-[24rem] animate-aurora rounded-full bg-primary/10 blur-[120px]" />

          <div className="relative mx-auto max-w-5xl px-6">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-xs font-medium text-muted"
            >
              <Link href="/" className="transition-colors hover:text-primary">
                Beranda
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/tools" className="transition-colors hover:text-primary">
                Tools
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-secondary">Panduan</span>
            </nav>

            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Panduan publik
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold text-secondary sm:text-4xl lg:text-5xl lg:leading-[1.1]">
              Cara pakai <span className="text-gradient">LKTech Tools.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              Panduan singkat untuk setiap tool: apa yang dilakukannya, langkah
              pemakaian, batas berkas, dan cara memverifikasi bahwa prosesnya
              tetap lokal di browser.
            </p>
            <p className="mt-3 text-xs font-medium text-muted">
              Diperbarui {TOOL_GUIDES_UPDATED} · {guides.length} panduan
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {guides.map(({ guide, tool }) => (
                <li key={guide.slug} className="h-full">
                  <Link
                    href={toolGuideHref(tool.slug)}
                    className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-slate-900/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary">
                        <ToolIcon name={tool.icon} className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
                        {TOOL_CATEGORY_LABEL[tool.category]}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-secondary">
                      {guide.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {guide.intro}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="rounded-full bg-surface px-2.5 py-1 font-semibold text-secondary">
                        {tool.format.from} → {tool.format.to}
                      </span>
                      <span className="rounded-full bg-surface px-2.5 py-1 text-muted">
                        {tool.limitLabel}
                      </span>
                    </div>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Baca panduan
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-3xl border border-primary-100 bg-primary-50/60 p-6 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-secondary">
                    Panduan boleh dibaca tanpa akun
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Untuk memproses berkas, masuk dengan akun LKTech. Semua
                    proses tetap berjalan lokal di browser.
                  </p>
                </div>
              </div>
              <ToolsCta
                location="guide-index"
                target="/tools/ruang"
                size="md"
                className="shrink-0"
              >
                Buka ruang tools
              </ToolsCta>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
