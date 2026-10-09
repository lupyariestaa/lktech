"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";
import type { TocHeading } from "@/lib/article-ui";
import { cn } from "@/lib/utils";

/**
 * Daftar isi (B6.3). Desktop: sticky di kolom kiri. Mobile: accordion di atas.
 * Section aktif disorot memakai IntersectionObserver.
 */
export function ArticleToc({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (headings.length === 0) return;
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Ambil heading paling atas yang sedang terlihat.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const list = (
    <ol className="flex flex-col gap-1 text-sm">
      {headings.map((h) => (
        <li key={h.id} className={cn(h.level === 3 && "pl-4")}>
          <a
            href={`#${h.id}`}
            aria-current={activeId === h.id ? "location" : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              "block rounded-lg px-2 py-1.5 transition-colors",
              activeId === h.id
                ? "bg-primary-50 font-semibold text-primary"
                : "text-slate-500 hover:text-primary",
            )}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      {/* Mobile: accordion */}
      <nav aria-label="Daftar isi" className="mb-8 rounded-2xl border border-slate-200 bg-white lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-secondary"
        >
          <span className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-primary" aria-hidden="true" />
            Daftar isi
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        {open && <div className="px-4 pb-4">{list}</div>}
      </nav>

      {/* Desktop: sticky di kolom kiri */}
      <nav aria-label="Daftar isi" className="hidden lg:sticky lg:top-28 lg:block">
        <p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Daftar isi</p>
        {list}
      </nav>
    </>
  );
}
