import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { ToolLocalBadge } from "@/components/tools/tool-badges";
import { ToolRail } from "@/components/tools/tool-rail";
import {
  TOOL_CATEGORY_LABEL,
  toolGuideHref,
  type ToolDefinition,
} from "@/lib/tools-registry-pure";

/**
 * Kerangka halaman workspace tool: breadcrumb, judul, metadata format/batas,
 * catatan privasi, rail tool, dan slot isi tool. Murni presentasional.
 */
export function ToolShell({
  tool,
  children,
}: {
  tool: ToolDefinition;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-20 sm:pt-36">
      <div className="grid-lines absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-[24rem] w-[24rem] animate-aurora rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-6">
        <Link
          href="/tools/ruang"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Kembali ke ruang tools
        </Link>

        <div className="mt-6 flex items-start gap-4">
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
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{tool.privacyNote}</span>
        </p>

        <ToolRail activeSlug={tool.slug} />

        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
