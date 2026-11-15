import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LayoutGrid, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { UserGuard } from "@/components/auth/user-guard";
import {
  ToolsCatalog,
  ToolsCatalogFallback,
} from "@/components/tools/tools-catalog";
import {
  TOOLS,
  TOOL_CATEGORIES,
  countToolsByCategory,
} from "@/lib/tools-registry-pure";

/**
 * Ruang LKTech Tools (workspace home) — dilindungi `UserGuard` dan `noindex`.
 * Halaman pengantar publik berada di `/tools`; panduan publik per tool di
 * `/tools/panduan/[slug]`.
 */
export const metadata: Metadata = {
  title: "Ruang LKTech Tools",
  description:
    "Katalog tools produktivitas LKTech: color picker, konversi gambar, dan PDF. Semua proses berjalan lokal di browser Anda.",
  robots: { index: false, follow: false },
};

export default function ToolsSpacePage() {
  const availableTools = TOOLS.filter((tool) => tool.status === "tersedia");
  const available = availableTools.length;
  const counts = countToolsByCategory(availableTools);
  const categoryCount = TOOL_CATEGORIES.filter((c) => counts[c] > 0).length;

  return (
    <>
      <Navbar />
      <main id="konten">
        <UserGuard>
          <section className="relative overflow-hidden bg-white pt-32 pb-20 sm:pt-36">
            <div className="grid-lines absolute inset-0 opacity-60" />
            <div className="pointer-events-none absolute -top-24 -left-24 h-[24rem] w-[24rem] animate-aurora rounded-full bg-primary/10 blur-[120px]" />

            <div className="relative mx-auto max-w-6xl px-6">
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-xs font-medium text-muted"
              >
                <Link href="/" className="transition-colors hover:text-primary">
                  Beranda
                </Link>
                <span className="text-slate-300">/</span>
                <Link
                  href="/tools"
                  className="transition-colors hover:text-primary"
                >
                  Tools
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-secondary">Ruang</span>
              </nav>

              <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                    LKTech Tools
                  </p>
                  <h1 className="mt-2 text-3xl font-bold text-secondary sm:text-4xl">
                    Ruang <span className="text-gradient">tools</span>
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                    {available} tool siap dipakai. Semua proses lokal di
                    browser — berkas tidak diunggah ke server.
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                  <ul className="flex flex-wrap gap-2 text-[11px] font-semibold">
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {available} tersedia
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-primary">
                      <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                      {categoryCount} kategori
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-muted">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      0 unggahan
                    </li>
                  </ul>
                  <Link
                    href="/tools"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Kembali ke halaman pengantar
                  </Link>
                </div>
              </div>

              <div className="mt-10">
                <Suspense fallback={<ToolsCatalogFallback />}>
                  <ToolsCatalog />
                </Suspense>
              </div>
            </div>
          </section>
        </UserGuard>
      </main>
      <Footer />
    </>
  );
}
