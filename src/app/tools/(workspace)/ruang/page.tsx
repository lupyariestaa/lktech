import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckCircle2, LayoutGrid, ShieldCheck } from "lucide-react";
import { ToolsDashboardOverview } from "@/components/tools/dashboard/tools-dashboard-overview";
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
 * Dashboard home LKTech Tools (`/tools/ruang`).
 *
 * Guard + `noindex` + shell dashboard berasal dari layout `(workspace)`.
 * Halaman pengantar publik tetap `/tools`; panduan publik per tool di
 * `/tools/panduan/[slug]`.
 */
export const metadata: Metadata = {
  title: "Ruang LKTech Tools",
  description:
    "Dashboard tools produktivitas LKTech: color picker, konversi gambar, dan PDF. Semua proses berjalan lokal di browser Anda.",
};

export default function ToolsSpacePage() {
  const availableTools = TOOLS.filter((tool) => tool.status === "tersedia");
  const available = availableTools.length;
  const counts = countToolsByCategory(availableTools);
  const categoryCount = TOOL_CATEGORIES.filter((c) => counts[c] > 0).length;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            LKTech Tools
          </p>
          <h1 className="mt-2 text-3xl font-bold text-secondary sm:text-4xl">
            Ruang <span className="text-gradient">tools</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {available} tool siap dipakai. Pilih dari menu atau katalog di
            bawah — semua proses lokal di browser, berkas tidak diunggah.
          </p>

          <ul className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {available} tersedia
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-primary">
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              {categoryCount} kategori
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-muted">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              0 unggahan
            </li>
          </ul>
        </header>

        <ToolsDashboardOverview />

        <section
          id="katalog"
          aria-labelledby="katalog-title"
          className="mt-10 scroll-mt-24"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="katalog-title"
                className="text-xl font-bold text-secondary"
              >
                Semua tool
              </h2>
              <p className="mt-1 text-sm text-muted">
                Cari, filter kategori, dan tandai favorit. Preferensi
                tersimpan di perangkat ini.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-muted">
              {available} tool
            </span>
          </div>

          <div className="mt-5">
            <Suspense fallback={<ToolsCatalogFallback />}>
              <ToolsCatalog />
            </Suspense>
          </div>
        </section>

        <p className="mt-8 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-muted">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span>
            Preferensi &amp; hitungan hanya tersimpan di perangkat ini
            (favorit, riwayat, jumlah buka). Tidak ada berkas atau isi yang
            diunggah.
          </span>
        </p>
      </div>
    </div>
  );
}
