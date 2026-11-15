"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import {
  ToolLocalBadge,
  ToolNewBadge,
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
  /** Cover judul untuk katalog; nonaktifkan pada kartu rekomendasi di workspace. */
  showArtwork?: boolean;
  className?: string;
};

const ARTWORK_THEME: Record<
  ToolDefinition["category"],
  { background: string; glow: string; iconSurface: string; iconColor: string }
> = {
  warna: {
    background: "from-blue-100 via-indigo-50 to-fuchsia-100",
    glow: "bg-fuchsia-300/40",
    iconSurface: "bg-white/75",
    iconColor: "text-indigo-600",
  },
  gambar: {
    background: "from-cyan-100 via-sky-50 to-blue-100",
    glow: "bg-cyan-300/45",
    iconSurface: "bg-white/75",
    iconColor: "text-sky-700",
  },
  pdf: {
    background: "from-rose-100 via-orange-50 to-amber-100",
    glow: "bg-orange-300/40",
    iconSurface: "bg-white/75",
    iconColor: "text-rose-600",
  },
  produktivitas: {
    background: "from-violet-100 via-purple-50 to-blue-100",
    glow: "bg-violet-300/40",
    iconSurface: "bg-white/75",
    iconColor: "text-violet-700",
  },
};

/** Cover visual khusus kartu katalog; header workspace tetap memakai ToolShell. */
function ToolCardArtwork({ tool }: { tool: ToolDefinition }) {
  const theme = ARTWORK_THEME[tool.category];

  return (
    <div
      className={cn(
        "relative isolate min-h-[158px] overflow-hidden rounded-t-3xl bg-gradient-to-br",
        theme.background,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          maskImage:
            "linear-gradient(110deg, transparent 15%, black 100%)",
        }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute -right-10 -top-16 h-44 w-44 rounded-full blur-2xl",
          theme.glow,
        )}
      />
      <span
        aria-hidden="true"
        className="absolute -right-5 -bottom-16 h-36 w-36 rounded-full border border-white/70"
      />

      <div className="relative z-10 flex min-h-[158px] flex-col justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-white/70 bg-white/55 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-slate-600 uppercase backdrop-blur-sm">
            {TOOL_CATEGORY_LABEL[tool.category]} · LKTOOLS
          </span>
          {tool.isNew && <ToolNewBadge />}
        </div>

        <h3 className="relative max-w-[58%] text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[22px]">
          {tool.name}
        </h3>

        <span
          aria-hidden="true"
          className={cn(
            "absolute right-6 top-1/2 grid h-[76px] w-[76px] -translate-y-1/2 rotate-3 place-items-center rounded-[25px] border border-white/80 shadow-lg shadow-slate-900/10 backdrop-blur-md transition-transform duration-300 group-hover:rotate-0 group-hover:scale-105",
            theme.iconSurface,
            theme.iconColor,
          )}
        >
          <ToolIcon name={tool.icon} className="h-9 w-9" />
        </span>
        <span
          aria-hidden="true"
          className="absolute right-[78px] top-[calc(50%-43px)] h-3 w-3 rounded-full border-2 border-white bg-primary shadow-sm"
        />
      </div>
    </div>
  );
}

/**
 * Kartu katalog tool dengan cover ilustratif dan judul yang kontras.
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
  showArtwork = true,
  className,
}: ToolCardProps) {
  const available = tool.status === "tersedia";
  const href = toolWorkspaceHref(tool.slug);

  const content = (
    <>
      {showArtwork ? (
        <ToolCardArtwork tool={tool} />
      ) : (
        <div className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
            <ToolIcon name={tool.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
              {TOOL_CATEGORY_LABEL[tool.category]}
            </p>
            <h3 className="truncate text-base font-bold text-secondary">
              {tool.name}
            </h3>
          </div>
          {tool.isNew && <ToolNewBadge className="ml-auto shrink-0" />}
        </div>
      )}
      <div
        className={cn(
          "flex flex-1 flex-col p-5 sm:p-6",
          !showArtwork && "pt-4 sm:pt-4",
        )}
      >
        <p className="flex-1 text-sm leading-relaxed text-muted">
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
      </div>
    </>
  );

  if (!available) {
    return (
      <article
        className={cn(
          "flex h-full flex-col rounded-3xl border border-dashed border-slate-200 bg-surface",
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
          "group relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-slate-900/5",
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
