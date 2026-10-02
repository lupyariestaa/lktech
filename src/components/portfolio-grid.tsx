"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { Project } from "@/lib/project-types";
import { ProjectCard } from "@/components/project-card";
import { cn } from "@/lib/utils";

type SortKey = "terbaru" | "terlama" | "judul";

const SORT_LABEL: Record<SortKey, string> = {
  terbaru: "Terbaru",
  terlama: "Terlama",
  judul: "Judul A–Z",
};

const PAGE_SIZE = 9;

/**
 * Grid portofolio dengan pencarian, filter (kategori & tag), pengurutan, dan
 * paginasi "muat lagi" — semuanya client-side. State disinkronkan ke URL
 * (`?kategori=&q=&tema=&urut=`) agar bisa dibagikan/di-bookmark.
 *
 * `projects` & `categories` dikirim dari server (Firestore).
 * `mediaMap` memetakan slug proyek → { url, alt } cover dari Cloudinary.
 */
export function PortfolioGrid({
  projects,
  categories,
  tags,
  mediaMap = {},
  initialCategory = "Semua",
  initialTag = null,
  initialQuery = "",
  initialSort = "terbaru",
}: {
  projects: Project[];
  categories: string[];
  tags?: string[];
  mediaMap?: Record<string, { url: string; alt?: string }>;
  /** State awal dari URL (dibaca di server). */
  initialCategory?: string;
  initialTag?: string | null;
  initialQuery?: string;
  initialSort?: SortKey;
}) {
  const [active, setActive] = useState(initialCategory);
  const [activeTag, setActiveTag] = useState<string | null>(initialTag);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Tulis state ke URL (tanpa navigasi/scroll) agar bisa dibagikan.
  // Hanya sinkronisasi keluar (state → URL) — tidak membaca URL di sini
  // (nilai awal sudah diberikan via props dari server).
  useEffect(() => {
    const params = new URLSearchParams();
    if (active !== "Semua") params.set("kategori", active);
    if (activeTag) params.set("tema", activeTag);
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "terbaru") params.set("urut", sort);
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [active, activeTag, query, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects.filter((p) => {
      const matchCat = active === "Semua" || p.category === active;
      const matchTag = !activeTag || p.tags.includes(activeTag);
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchTag && matchQuery;
    });

    list = [...list].sort((a, b) => {
      if (sort === "judul") return a.title.localeCompare(b.title);
      if (sort === "terlama") return a.year - b.year || a.title.localeCompare(b.title);
      return b.year - a.year || a.title.localeCompare(b.title);
    });
    return list;
  }, [projects, active, activeTag, query, sort]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;
  const isFiltering = active !== "Semua" || activeTag !== null || query.trim() !== "";

  const resetAll = () => {
    setActive("Semua");
    setActiveTag(null);
    setQuery("");
    setSort("terbaru");
  };

  return (
    <div>
      {/* Toolbar: pencarian + urut */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Cari proyek, klien, atau teknologi…"
            aria-label="Cari proyek"
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Hapus pencarian"
              className="absolute top-1/2 right-3 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-surface hover:text-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Urutkan proyek"
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-secondary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Filter kategori */}
      <div
        role="group"
        aria-label="Filter kategori portofolio"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        {categories.map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setActive(cat);
                setVisible(PAGE_SIZE);
              }}
              aria-pressed={isActive}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "border border-slate-200 bg-white/70 text-slate-600 hover:border-primary/40 hover:text-primary",
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Filter tag (jika ada) */}
      {tags && tags.length > 0 && (
        <div
          role="group"
          aria-label="Filter tema portofolio"
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <span className="text-xs font-medium text-muted">Tema:</span>
          {tags.map((t) => {
            const isActive = activeTag === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setActiveTag(isActive ? null : t);
                  setVisible(PAGE_SIZE);
                }}
                aria-pressed={isActive}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-white"
                    : "border border-slate-200 bg-white/70 text-slate-500 hover:border-primary/40 hover:text-primary",
                )}
              >
                #{t}
              </button>
            );
          })}
        </div>
      )}

      {/* Info jumlah + reset */}
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
        <span>
          Menampilkan {shown.length} dari {filtered.length} proyek.
        </span>
        {isFiltering && (
          <button
            type="button"
            onClick={resetAll}
            className="font-semibold text-primary hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Grid */}
      {shown.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((project, i) => (
            <motion.div
              key={project.slug}
              layout
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            >
              <ProjectCard
                project={project}
                coverImage={mediaMap[project.slug]?.url}
                coverAlt={mediaMap[project.slug]?.alt}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-secondary">
            {projects.length === 0
              ? "Belum ada proyek dipublikasikan."
              : "Tidak ada proyek yang cocok dengan filter/pencarian."}
          </p>
          <p className="mt-1 text-xs text-muted">
            {projects.length === 0
              ? "Proyek yang Anda tambahkan akan muncul di sini."
              : "Coba ubah kata kunci atau reset filter."}
          </p>
          {isFiltering && (
            <button
              type="button"
              onClick={resetAll}
              className="mt-4 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              Reset filter
            </button>
          )}
        </div>
      )}

      {/* Muat lagi */}
      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            Muat lagi ({filtered.length - visible} proyek)
          </button>
        </div>
      )}
    </div>
  );
}
