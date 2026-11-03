import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { TOOL_CATEGORY_LABEL, type ToolDefinition } from "@/lib/tools-registry-pure";

/**
 * Kerangka halaman workspace tool: breadcrumb, judul, deskripsi, catatan
 * privasi, dan slot isi tool. Murni presentasional (tanpa state).
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
          <ArrowLeft className="h-3.5 w-3.5" />
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

        <p className="mt-5 inline-flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{tool.privacyNote}</span>
        </p>

        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
