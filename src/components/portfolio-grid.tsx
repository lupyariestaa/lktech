"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PROJECT_CATEGORIES, PROJECTS } from "@/lib/content";
import { ProjectCard } from "@/components/project-card";
import { cn } from "@/lib/utils";

/**
 * Grid portofolio dengan filter kategori (client-side).
 */
export function PortfolioGrid() {
  const [active, setActive] = useState("Semua");

  const filtered = useMemo(
    () =>
      active === "Semua"
        ? PROJECTS
        : PROJECTS.filter((p) => p.category === active),
    [active],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PROJECT_CATEGORIES.map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              onClick={() => setActive(cat)}
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
            <ProjectCard project={project} />
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
