"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Project } from "@/lib/project-types";
import { ProjectCard } from "@/components/project-card";
import { cn } from "@/lib/utils";

/**
 * Grid portofolio dengan filter kategori (client-side).
 * `projects` & `categories` dikirim dari server (Firestore).
 * `mediaMap` memetakan slug proyek → { url, alt } cover dari Cloudinary.
 */
export function PortfolioGrid({
  projects,
  categories,
  mediaMap = {},
}: {
  projects: Project[];
  categories: string[];
  mediaMap?: Record<string, { url: string; alt?: string }>;
}) {
  const [active, setActive] = useState("Semua");

  const filtered = useMemo(
    () =>
      active === "Semua"
        ? projects
        : projects.filter((p) => p.category === active),
    [projects, active],
  );

  return (
    <div>
      <div
        role="group"
        aria-label="Filter kategori portofolio"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {categories.map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              onClick={() => setActive(cat)}
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

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project, i) => (
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

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-sm text-muted">
          Belum ada proyek pada kategori ini.
        </p>
      )}
    </div>
  );
}
