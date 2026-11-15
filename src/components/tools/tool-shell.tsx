import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolLocalBadge } from "@/components/tools/tool-badges";
import {
  TOOL_CATEGORY_LABEL,
  toolGuideHref,
  type ToolDefinition,
} from "@/lib/tools-registry-pure";

/**
 * Header workspace tool: breadcrumb, judul, metadata format/batas, catatan
 * privasi, dan slot isi tool.
 *
 * Navigasi antar-tool sudah dipindahkan ke sidebar dashboard; tidak ada lagi
 * rail horizontal atau tombol "kembali" besar di sini.
 */
export function ToolShell({
  tool,
  children,
}: {
  tool: ToolDefinition;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted"
        >
          <Link
            href="/tools/ruang"
            className="rounded transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            Ruang tools
          </Link>
          <ChevronRight
            className="h-3 w-3 text-slate-300"
            aria-hidden="true"
          />
          <span aria-current="page" className="text-secondary">
            {tool.name}
          </span>
        </nav>

        <div className="mt-4 flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
            <ToolIcon name={tool.icon} className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              {TOOL_CATEGORY_LABEL[tool.category]}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-secondary sm:text-3xl">
              {tool.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {tool.description}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
          {tool.local && <ToolLocalBadge />}
          <span className="rounded-full bg-surface px-2.5 py-1 font-semibold text-secondary">
            {tool.format.from} → {tool.format.to}
          </span>
          <span className="rounded-full bg-surface px-2.5 py-1 text-muted">
            {tool.limitLabel}
          </span>
          <Link
            href={toolGuideHref(tool.slug)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-primary transition-colors hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            Panduan
          </Link>
          <Link
            href="/tools#faq"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-slate-500 transition-colors hover:bg-surface hover:text-secondary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <HelpCircle className="h-3 w-3" aria-hidden="true" />
            Butuh bantuan?
          </Link>
        </div>

        <p className="mt-5 inline-flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span>{tool.privacyNote}</span>
        </p>
      </header>

      <div className="mt-6">{children}</div>
    </div>
  );
}
