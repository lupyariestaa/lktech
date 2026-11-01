"use client";

import { useMemo, useState } from "react";
import { Search, Wrench } from "lucide-react";
import {
  TOOLS,
  TOOL_CATEGORIES,
  TOOL_CATEGORY_LABEL,
  countToolsByCategory,
  filterTools,
  type ToolCategoryFilter,
} from "@/lib/tools-registry-pure";
import { ToolCard } from "@/components/tools/tool-card";
import { cn } from "@/lib/utils";

/** Jumlah tool per kategori bersifat statis (registry kode), hitung sekali. */
const COUNTS = countToolsByCategory();

/**
 * Katalog LKTech Tools (klien): pencarian + filter kategori + grid kartu.
 * Data berasal dari registry murni `@/lib/tools-registry-pure`.
 */
export function ToolsCatalog() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ToolCategoryFilter>("semua");

  const visible = useMemo(() => filterTools(TOOLS, { q, category }), [q, category]);

  const tabs: Array<{ id: ToolCategoryFilter; label: string; count: number }> = [
    { id: "semua", label: "Semua", count: TOOLS.length },
    ...TOOL_CATEGORIES.map((c) => ({
      id: c as ToolCategoryFilter,
      label: TOOL_CATEGORY_LABEL[c],
      count: COUNTS[c],
    })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 sm:max-w-xs">
          <span className="sr-only">Cari tool</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari tool…"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-slate-200 bg-white pr-4 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </label>

        <div
          role="group"
          aria-label="Filter kategori tool"
          className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={category === t.id}
              onClick={() => setCategory(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                category === t.id
                  ? "bg-primary-50 text-primary"
                  : "text-slate-500 hover:text-secondary",
              )}
            >
              {t.label}
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-surface py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <Wrench className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-semibold text-secondary">
            Tool tidak ditemukan
          </p>
          <p className="mt-1 text-sm text-muted">
            Coba kata kunci lain atau pilih kategori berbeda.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((tool) => (
            <li key={tool.slug} className="h-full">
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
