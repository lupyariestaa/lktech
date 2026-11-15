"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Star,
  Wrench,
  X,
} from "lucide-react";
import { ToolCard } from "@/components/tools/tool-card";
import {
  trackToolsCatalogFilter,
  trackToolsEmptyStateAction,
  trackToolsFavoriteToggle,
  trackToolsToolOpenIntent,
} from "@/lib/analytics";
import {
  buildToolsCatalogHref,
  filterCatalogTools,
  parseToolsCatalogParams,
  toggleFavoriteToolSlug,
  type ToolsCatalogState,
} from "@/lib/tools-discovery-pure";
import {
  TOOLS,
  TOOL_CATEGORIES,
  TOOL_CATEGORY_LABEL,
  countToolsByCategory,
  type ToolCategoryFilter,
  type ToolDefinition,
} from "@/lib/tools-registry-pure";
import { writeFavoriteTools } from "@/lib/tools-storage";
import { useToolFavorites } from "@/components/tools/use-tools-preferences";
import { cn } from "@/lib/utils";

const AVAILABLE_TOOLS = TOOLS.filter((tool) => tool.status === "tersedia");
const COUNTS = countToolsByCategory(AVAILABLE_TOOLS);
const AVAILABLE = AVAILABLE_TOOLS.length;

/**
 * Katalog ruang `/tools/ruang`: pencarian, filter kategori, favorit, empty
 * state, dan URL state yang bisa dibagikan.
 *
 * Recent, statistik, dan hapus data lokal sengaja tidak lagi ditangani di sini;
 * itu tugas dashboard home dan footer sidebar. Klik tool hanya mengirim
 * analytics — pencatatan recent/usage terjadi saat workspace di-mount.
 *
 * Catatan Next 16: komponen ini memakai `useSearchParams`, jadi pemanggil wajib
 * membungkusnya dengan `<Suspense>` agar build statis tidak gagal.
 */
export function ToolsCatalog() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initial = parseToolsCatalogParams(searchParams);
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState<ToolCategoryFilter>(
    initial.category,
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Data lokal (hanya slug; tidak ada berkas/isi) via external store React.
  const favorites = useToolFavorites();

  // URL berubah di luar kendali katalog (back/forward) → sinkronkan state.
  // SetState di callback event adalah pola subscribe yang dianjurkan React.
  useEffect(() => {
    const onPopState = () => {
      const next = parseToolsCatalogParams(
        new URLSearchParams(window.location.search),
      );
      setQ(next.q);
      setCategory(next.category);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // State → URL (debounce ringan agar ketikan tidak memicu navigasi beruntun).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const href = buildToolsCatalogHref({ q, category }, pathname);
      const current = `${window.location.pathname}${window.location.search}`;
      if (href !== current) router.replace(href, { scroll: false });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [q, category, pathname, router]);

  // Pintasan keyboard: `/` fokus ke pencarian, Esc membersihkan/menutup.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && target === searchRef.current) {
        if (q) setQ("");
        else searchRef.current?.blur();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [q]);

  const visible = useMemo(
    () =>
      filterCatalogTools(
        { q, category },
        { tools: TOOLS, favorites, favoritesOnly },
      ),
    [q, category, favorites, favoritesOnly],
  );

  const tabs: Array<{ id: ToolCategoryFilter; label: string; count: number }> = [
    { id: "semua", label: "Semua", count: AVAILABLE },
    ...TOOL_CATEGORIES.map((c) => ({
      id: c as ToolCategoryFilter,
      label: TOOL_CATEGORY_LABEL[c],
      count: COUNTS[c],
    })),
  ];

  const trackFilter = (next: ToolsCatalogState, favoritesOnlyNext: boolean) => {
    const resultCount = filterCatalogTools(next, {
      tools: TOOLS,
      favorites,
      favoritesOnly: favoritesOnlyNext,
    }).length;
    trackToolsCatalogFilter({
      category: next.category,
      hasQuery: next.q.trim().length > 0,
      resultCount,
    });
  };

  const selectCategory = (next: ToolCategoryFilter) => {
    setCategory(next);
    trackFilter({ q, category: next }, favoritesOnly);
  };

  const resetFilters = () => {
    setQ("");
    setCategory("semua");
    setFavoritesOnly(false);
    trackToolsEmptyStateAction({ action: "reset" });
  };

  const toggleFavorite = (tool: ToolDefinition) => {
    const next = toggleFavoriteToolSlug(favorites, tool.slug);
    writeFavoriteTools(next);
    trackToolsFavoriteToggle({
      tool: tool.slug,
      action: next.includes(tool.slug) ? "add" : "remove",
    });
  };

  const onOpenTool = (tool: ToolDefinition) => {
    // Klik hanya mengirim analytics; recent & usage dicatat saat workspace
    // benar-benar di-mount (satu titik, tanpa hitung ganda).
    trackToolsToolOpenIntent({ tool: tool.slug, source: "ruang" });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-sm">
          <label htmlFor="tools-search" className="sr-only">
            Cari tool
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            id="tools-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari tool… (tekan /)"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-slate-200 bg-white pr-12 pl-10 text-sm text-secondary placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Hapus pencarian"
              className="absolute top-1/2 right-2.5 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-secondary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-slate-200 bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              /
            </kbd>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
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

          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => {
              const next = !favoritesOnly;
              setFavoritesOnly(next);
              trackFilter({ q, category }, next);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
              favoritesOnly
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-500 hover:text-secondary",
            )}
          >
            <Star
              className={cn("h-3.5 w-3.5", favoritesOnly && "fill-current")}
              aria-hidden="true"
            />
            Favorit
            <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">
              {favorites.length}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm text-muted">
          <span className="font-semibold text-secondary">{visible.length}</span>{" "}
          tool ditemukan
          {favoritesOnly ? " di favorit" : ""}
          {q.trim() ? " untuk pencarian Anda" : ""}.
        </p>
        <Link
          href="/kontak"
          onClick={() => trackToolsEmptyStateAction({ action: "request" })}
          className="text-xs font-semibold text-primary transition-colors hover:text-primary-dark focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          Usulkan tool →
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-surface py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
            {favoritesOnly ? (
              <Star className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Wrench className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <p className="mt-4 text-sm font-semibold text-secondary">
            {favoritesOnly
              ? favorites.length === 0
                ? "Belum ada tool favorit"
                : "Tidak ada favorit di filter ini"
              : "Tool tidak ditemukan"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {favoritesOnly
              ? "Tandai tool dengan ikon bintang agar mudah ditemukan kembali."
              : "Coba kata kunci lain atau pilih kategori berbeda."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              Tampilkan semua tool
            </button>
            <Link
              href="/kontak"
              onClick={() => trackToolsEmptyStateAction({ action: "request" })}
              className="text-xs font-semibold text-secondary transition-colors hover:text-primary"
            >
              Usulkan tool
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((tool) => (
            <li key={tool.slug} className="h-full">
              <ToolCard
                tool={tool}
                favorite={favorites.includes(tool.slug)}
                onToggleFavorite={toggleFavorite}
                onOpen={onOpenTool}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Placeholder saat `useSearchParams` ditangguhkan di batas Suspense. */
export function ToolsCatalogFallback() {
  return (
    <div aria-hidden="true">
      <div className="h-11 w-full animate-pulse rounded-full bg-slate-100 xl:max-w-sm" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-3xl border border-slate-100 bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
