"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Article } from "@/lib/article-types";
import { taxonomySlug } from "@/lib/article-types";
import Link from "next/link";
import { ArticleCard } from "@/components/article-card";
import { cn } from "@/lib/utils";

/**
 * Grid artikel dengan filter kategori & tag (client-side).
 */
export function BlogGrid({
  articles,
  categories,
  tags,
}: {
  articles: Article[];
  categories: string[];
  tags?: { tag: string; count: number }[];
}) {
  const [active, setActive] = useState("Semua");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = articles;
    if (active !== "Semua") list = list.filter((a) => a.category === active);
    if (activeTag) list = list.filter((a) => a.tags.includes(activeTag));
    return list;
  }, [articles, active, activeTag]);

  return (
    <div>
      <div
        role="group"
        aria-label="Filter kategori artikel"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {categories.map((cat) => {
          const isActive = active === cat && !activeTag;
          return (
            <button
              key={cat}
              onClick={() => {
                setActive(cat);
                setActiveTag(null);
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

      {tags && tags.length > 0 && (
        <div
          role="group"
          aria-label="Filter tag artikel"
          className="mt-4 flex flex-wrap items-center justify-center gap-2"
        >
          {tags.map(({ tag, count }) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(isActive ? null : tag)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-white"
                    : "bg-surface text-slate-500 hover:bg-primary-50 hover:text-primary",
                )}
              >
                #{tag}
                <span className="ml-1 text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
          {activeTag && (
            <Link
              href={`/blog/tag/${taxonomySlug(activeTag)}`}
              className="text-xs font-semibold text-primary underline underline-offset-2"
            >
              Buka halaman tag →
            </Link>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">
          Belum ada artikel dengan filter ini.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article, i) => (
            <motion.div
              key={article.slug}
              layout
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            >
              <ArticleCard article={article} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
