import Link from "next/link";
import { Star } from "lucide-react";
import type { ToolDefinition } from "@/lib/tools-registry-pure";
import { cn } from "@/lib/utils";

/**
 * Daftar favorit di sidebar. Read-only: toggle bintang tetap di kartu katalog
 * agar sidebar tidak menjadi empat daftar tool yang saling menduplikasi.
 */
export function ToolsFavoriteList({
  tools,
  activeSlug,
  onNavigate,
  onOpen,
}: {
  tools: readonly ToolDefinition[];
  activeSlug: string | null;
  onNavigate?: () => void;
  onOpen?: (slug: string) => void;
}) {
  if (tools.length === 0) {
    return (
      <p className="px-3 text-[11px] leading-relaxed text-muted">
        Tandai tool dengan ikon bintang di katalog agar muncul di sini.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {tools.map((tool) => {
        const active = tool.slug === activeSlug;
        return (
          <li key={tool.slug}>
            <Link
              href={`/tools/${tool.slug}`}
              onClick={() => {
                onOpen?.(tool.slug);
                onNavigate?.();
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                active
                  ? "bg-primary-50 text-primary"
                  : "text-slate-600 hover:bg-surface hover:text-secondary",
              )}
            >
              <Star
                className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-400"
                aria-hidden="true"
              />
              <span className="truncate">{tool.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
