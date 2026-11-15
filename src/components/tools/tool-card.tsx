"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import {
  ToolLocalBadge,
  ToolNewBadge,
  ToolStatusBadge,
} from "@/components/tools/tool-badges";
import {
  TOOL_CATEGORY_LABEL,
  toolWorkspaceHref,
  type ToolDefinition,
} from "@/lib/tools-registry-pure";
import { cn } from "@/lib/utils";

export type ToolCardProps = {
  tool: ToolDefinition;
  /** Status favorit (dikelola parent). */
  favorite?: boolean;
  /** Bila diberikan, tombol bintang muncul. */
  onToggleFavorite?: (tool: ToolDefinition) => void;
  /** Dipanggil saat kartu dibuka (mis. untuk mencatat recent). */
  onOpen?: (tool: ToolDefinition) => void;
  className?: string;
};

/**
 * Kartu katalog tool.
 *
 * Tool `tersedia` memakai stretched link (bukan seluruh kartu dibungkus `<a>`),
 * sehingga tombol favorit tetap valid & aksesibel. Tool `segera` hanya kartu
 * statis dengan alasan yang jujur.
 */
export function ToolCard({
  tool,
  favorite = false,
  onToggleFavorite,
  onOpen,
  className,
}: ToolCardProps) {
  const available = tool.status === "tersedia";
  const href = toolWorkspaceHref(tool.slug);

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary">
          <ToolIcon name={tool.icon} className="h-5 w-5" />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {tool.isNew && <ToolNewBadge />}
          <ToolStatusBadge status={tool.status} />
        </div>
      </div>

      <p className="mt-4 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {TOOL_CATEGORY_LABEL[tool.category]}
      </p>
      <h3 className="mt-1 text-lg font-bold text-secondary">{tool.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
        {tool.summary}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-surface px-2.5 py-1 font-semibold text-secondary">
          {tool.format.from} → {tool.format.to}
        </span>
        <span className="rounded-full bg-surface px-2.5 py-1 text-muted">
          {tool.limitLabel}
        </span>
        {tool.local && <ToolLocalBadge />}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 text-sm font-semibold",
            available ? "text-primary" : "text-slate-400",
          )}
        >
          {available ? "Buka tool" : "Belum tersedia"}
          {available && (
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          )}
        </span>

        {available && onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(tool)}
            aria-pressed={favorite}
            aria-label={
              favorite
                ? `Hapus ${tool.name} dari favorit`
                : `Tambahkan ${tool.name} ke favorit`
            }
            title={favorite ? "Hapus dari favorit" : "Tambahkan ke favorit"}
            className={cn(
              "pointer-events-auto relative z-20 grid h-9 w-9 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
              favorite
                ? "border-amber-200 bg-amber-50 text-amber-600"
                : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:text-amber-600",
            )}
          >
            <Star
              className={cn("h-4 w-4", favorite && "fill-current")}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </>
  );

  if (!available) {
    return (
      <article
        className={cn(
          "flex h-full flex-col rounded-3xl border border-dashed border-slate-200 bg-surface p-6",
          className,
        )}
      >
        {content}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-slate-900/5",
        className,
      )}
    >
      <Link
        href={href}
        onClick={() => onOpen?.(tool)}
        aria-label={`Buka ${tool.name}`}
        className="absolute inset-0 z-10 rounded-3xl focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:outline-none"
      />
      <div className="pointer-events-none relative z-20 flex h-full flex-col">
        <div className="flex flex-1 flex-col">{content}</div>
      </div>
    </article>
  );
}
