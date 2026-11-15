"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { ToolCard } from "@/components/tools/tool-card";
import { RequestToolCard } from "@/components/tools/request-tool-card";
import { ToolsCta } from "@/components/tools/tools-cta";
import { trackToolsCatalogFilter, trackToolsToolOpen } from "@/lib/analytics";
import {
  TOOLS,
  TOOL_CATEGORIES,
  TOOL_CATEGORY_LABEL,
  countToolsByCategory,
  filterTools,
  type ToolCategoryFilter,
} from "@/lib/tools-registry-pure";
import { cn } from "@/lib/utils";

const AVAILABLE_TOOLS = TOOLS.filter((tool) => tool.status === "tersedia");
const COUNTS = countToolsByCategory(AVAILABLE_TOOLS);
const AVAILABLE = AVAILABLE_TOOLS.length;

/**
 * Katalog landing: filter kategori ringan + kartu tool + kartu usulan.
 * Pencarian penuh sengaja hanya ada di ruang tools.
 */
export function ToolsShowcase() {
  const [category, setCategory] = useState<ToolCategoryFilter>("semua");

  const visible = useMemo(
    () => filterTools(AVAILABLE_TOOLS, { category }),
    [category],
  );

  const tabs: Array<{ id: ToolCategoryFilter; label: string; count: number }> = [
    { id: "semua", label: "Semua", count: AVAILABLE },
    ...TOOL_CATEGORIES.map((c) => ({
      id: c as ToolCategoryFilter,
      label: TOOL_CATEGORY_LABEL[c],
      count: COUNTS[c],
    })),
  ];

  const selectCategory = (next: ToolCategoryFilter) => {
    setCategory(next);
    const resultCount = filterTools(AVAILABLE_TOOLS, { category: next }).length;
    trackToolsCatalogFilter({
      category: next,
      hasQuery: false,
      resultCount,
    });
  };

  return (
    <section id="tool" className="relative scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Katalog"
          title={
            <>
              {AVAILABLE} tool, <span className="text-gradient">satu ruang.</span>
            </>
          }
          description="Dari gambar sampai teks, semuanya dengan alur yang sama: pilih, proses, unduh. Tanpa unggah berkas."
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filter kategori tool"
            className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={category === tab.id}
                onClick={() => selectCategory(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                  category === tab.id
                    ? "bg-primary-50 text-primary"
                    : "text-slate-500 hover:text-secondary",
                )}
              >
                {tab.label}
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <p
            aria-live="polite"
            className="text-xs font-medium text-muted"
          >
            {visible.length} tool ditemukan
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-surface py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <Star className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-semibold text-secondary">
              Belum ada tool di kategori ini
            </p>
            <button
              type="button"
              onClick={() => selectCategory("semua")}
              className="mt-3 text-sm font-semibold text-primary hover:text-primary-dark"
            >
              Tampilkan semua tool
            </button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((tool) => (
              <li key={tool.slug} className="h-full">
                <ToolCard
                  tool={tool}
                  onOpen={() =>
                    trackToolsToolOpen({ tool: tool.slug, source: "landing" })
                  }
                />
              </li>
            ))}
            <li className="h-full">
              <RequestToolCard />
            </li>
          </ul>
        )}

        <p className="mt-6 text-xs text-muted">
          Butuh pencarian dan filter?{" "}
          <ToolsCta
            location="catalog-room-link"
            target="/tools/ruang"
            variant="ghost"
            size="sm"
            withLock={false}
            withArrow={false}
            className="h-auto px-1 py-0 text-xs font-semibold text-primary underline-offset-4 hover:bg-transparent hover:underline"
          >
            Buka ruang tools
          </ToolsCta>
        </p>
      </div>
    </section>
  );
}
