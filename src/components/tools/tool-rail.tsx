"use client";

import Link from "next/link";
import { ToolIcon } from "@/components/tools/tool-icon";
import { trackToolsToolOpen } from "@/lib/analytics";
import { TOOLS } from "@/lib/tools-registry-pure";
import { cn } from "@/lib/utils";

const AVAILABLE = TOOLS.filter((tool) => tool.status === "tersedia");

/**
 * Rail horizontal untuk berpindah tool dari workspace. Tanpa state: status
 * aktif ditentukan dari prop `activeSlug`, ditandai `aria-current="page"`.
 */
export function ToolRail({ activeSlug }: { activeSlug: string }) {
  return (
    <nav aria-label="Pindah tool" className="mt-6">
      <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1">
        {AVAILABLE.map((tool) => {
          const active = tool.slug === activeSlug;
          return (
            <li key={tool.slug} className="shrink-0 snap-start">
              <Link
                href={`/tools/${tool.slug}`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (!active) {
                    trackToolsToolOpen({ tool: tool.slug, source: "rail" });
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary",
                )}
              >
                <ToolIcon
                  name={tool.icon}
                  className={cn("h-3.5 w-3.5", active ? "text-white" : "text-primary")}
                />
                {tool.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
