import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/project-types";
import { ProjectCover } from "@/components/project-cover";

/**
 * Kartu proyek untuk grid portofolio.
 */
export function ProjectCard({
  project,
  coverImage,
  coverAlt,
}: {
  project: Project;
  coverImage?: string;
  coverAlt?: string;
}) {
  return (
    <Link
      href={`/portofolio/${project.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10"
    >
      <div className="p-2.5">
        <ProjectCover
          name={project.cover}
          accent={project.accent}
          label={project.category}
          image={coverImage}
          alt={coverAlt}
        />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <span className="text-primary">{project.client}</span>
          <span className="text-slate-300">•</span>
          <span>{project.year}</span>
          {project.demo && (
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Contoh
            </span>
          )}
        </div>

        <h3 className="mt-2 text-lg font-bold text-secondary transition-colors group-hover:text-primary">
          {project.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
          {project.summary}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-slate-500"
            >
              {t}
            </span>
          ))}
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Lihat studi kasus
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
