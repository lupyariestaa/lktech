import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { ToolIcon } from "@/components/tools/tool-icon";
import { TOOL_CATEGORY_LABEL, type ToolDefinition } from "@/lib/tools-registry-pure";
import { cn } from "@/lib/utils";

/**
 * Kartu katalog tool. Tool `tersedia` dirender sebagai tautan ke workspace;
 * tool `segera` hanya tampil sebagai kartu non-klik dengan lencana "Segera".
 */
export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const available = tool.status === "tersedia";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary">
          <ToolIcon name={tool.icon} className="h-5 w-5" />
        </span>
        {available ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Tersedia
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            <Clock className="h-3 w-3" />
            Segera
          </span>
        )}
      </div>

      <p className="mt-4 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {TOOL_CATEGORY_LABEL[tool.category]}
      </p>
      <h3 className="mt-1 text-lg font-bold text-secondary">{tool.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{tool.summary}</p>

      <span
        className={cn(
          "mt-6 inline-flex items-center gap-2 text-sm font-semibold",
          available ? "text-primary" : "text-slate-400",
        )}
      >
        {available ? "Buka tool" : "Belum tersedia"}
        {available && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        )}
      </span>
    </>
  );

  if (!available) {
    return (
      <div className="flex h-full flex-col rounded-3xl border border-dashed border-slate-200 bg-surface p-6">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-slate-900/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
    >
      {body}
    </Link>
  );
}
